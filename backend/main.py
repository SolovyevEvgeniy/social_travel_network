from fastapi import FastAPI, HTTPException, Depends, Form, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from typing import List, Dict
import jwt
from .database import SessionLocal, engine
from sqlalchemy.orm import Session
from . import models
from .models import User, Post, Profile, Place, Review, Comment, Message, UserFollow, ReviewLike, PostLike
from passlib.context import CryptContext
from fastapi import status
from jose import JWTError
import json
from . import schemas
from fastapi.encoders import jsonable_encoder
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy.sql import func
import shutil

app = FastAPI()

# Определяем пути для статических файлов
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "..", "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")

# Создаем директории если их нет
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Монтируем папку uploads для раздачи статических файлов
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфигурация JWT
SECRET_KEY = "ваш_секретный_ключ"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 часа

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Создание таблиц в базе данных
models.Base.metadata.create_all(bind=engine)

# Dependency для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

@app.post("/register")
async def register(
    email: str = Form(...),
    username: str = Form(...),
    password: str = Form(...)
):
    db = SessionLocal()
    try:
        # Проверяем, существует ли пользователь
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Создаем нового пользователя
        hashed_password = pwd_context.hash(password)
        user = User(
            email=email,
            username=username,
            hashed_password=hashed_password
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Создаем токен для нового пользователя
        access_token = create_access_token(data={"sub": email})
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        db.close()

@app.post("/token")
async def login(username: str = Form(...), password: str = Form(...)):
    db = SessionLocal()
    try:
        print(f"Login attempt for user: {username}")
        user = db.query(User).filter(User.email == username).first()
        print(f"User found: {user is not None}")
        if not user or not pwd_context.verify(password, user.hashed_password):
            print("Invalid credentials")
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )
        
        print(f"Creating token for user: {user.email}")
        access_token = create_access_token(data={"sub": username})
        print("Token created successfully")
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt 

@app.get("/posts", response_model=List[schemas.Post])
async def get_posts():
    db = SessionLocal()
    try:
        print("Fetching posts...")
        posts = db.query(Post).order_by(Post.created_at.desc()).all()
        
        posts_data = []
        for post in posts:
            post_owner = db.query(User).filter(User.id == post.user_id).first()
            likes_count = db.query(PostLike).filter(PostLike.post_id == post.id).count()
            
            # Проверяем URL изображения
            image_url = None
            if post.image_url:
                if post.image_url.startswith(('http://', 'https://')):
                    image_url = post.image_url
                else:
                    # Для локальных файлов добавляем базовый URL
                    clean_url = post.image_url.lstrip('/')
                    if not clean_url.startswith('static/'):
                        clean_url = f"static/{clean_url}"
                    image_url = f"/{clean_url}"
                print(f"Post {post.id} image URL: {image_url}")  # Для отладки
            
            post_dict = {
                "id": post.id,
                "title": post.title,
                "content": post.content,
                "location": post.location,
                "image_url": image_url,
                "created_at": post.created_at,
                "user_id": post.user_id,
                "likes_count": likes_count,
                "owner": {
                    'email': post_owner.email if post_owner else None,
                    'username': post_owner.username if post_owner else None,
                    'full_name': post_owner.full_name if post_owner else None,
                    'avatar_url': post_owner.avatar_url if post_owner else None
                }
            }
            posts_data.append(post_dict)
        
        return posts_data
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/posts")
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    location: str = Form(None),
    image: UploadFile = None,
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()
    try:
        post = Post(
            title=title,
            content=content,
            location=location,
            user_id=current_user.id
        )
        
        if image:
            try:
                # Создаем директорию, если её нет
                os.makedirs(UPLOAD_DIR, exist_ok=True)
                
                # Генерируем уникальное имя файла
                file_extension = os.path.splitext(image.filename)[1].lower()
                file_name = f"post_{datetime.now().timestamp()}{file_extension}"
                file_path = os.path.join(UPLOAD_DIR, file_name)
                
                # Сохраняем файл
                contents = await image.read()
                with open(file_path, "wb") as f:
                    f.write(contents)
                
                # Сохраняем относительный путь в БД
                post.image_url = f"/static/uploads/{file_name}"
                print(f"Saved image at: {file_path}")
                print(f"Image URL: {post.image_url}")
                
            except Exception as e:
                print(f"Error saving image: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        db.add(post)
        db.commit()
        db.refresh(post)
        
        return {
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "location": post.location,
            "image_url": post.image_url,
            "created_at": post.created_at,
            "user_id": post.user_id,
            "likes_count": 0,
            "owner": {
                "email": current_user.email,
                "username": current_user.username,
                "full_name": current_user.full_name,
                "avatar_url": current_user.avatar_url
            }
        }
    finally:
        db.close()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Здесь обрабатываем сообщение и генерируем ответ
            user_message = json.loads(data)
            
            # Простая логика чат-ота для путешествий
            message = user_message["message"].lower()
            if "куда" in message and "поехать" in message:
                if "май" in message or "мае" in message:
                    response = "В мае олично подойдут: \n1. Реция - идеальная погода и мало туристов\n2. Япония - сезон цветения\n3. Италия - комфортная ��емпература дл экскурсий"
                elif "лет" in message or "июль" in message or "август" in message:
                    response = "Летом комендую:\n1. Черногория - прекрасные пляжи\n2. Исландия - уникальная природа\n3. Норвегия - ьорды и белы ночи"
                else:
                    response = "Для точной рекомендации укажите месяц путешествия. Но всегда хорошо:\n1. Португалия\n2. Испания\n3. Таиланд"
            elif "бюджет" in message or "цен" in message or "стоит" in message:
                response = "Бюджетные направления:\n1. Турция - от 50000р\n2. Грузия - от 40000р\n3. Египет - от 45000р\n\nПремиум направления:\n1. Мальдивы - от 200000р\n2. ОАЭ - от 150000р"
            elif "достопримечательност" in message or "посмотреть" in message:
                response = "Популярные достопримечательности:\n1. Колизей в Риме\n2. Эйфелева башня в Париже\n3. Тадж-Махал в Индии\n4. Петра в ��ордании\n5. Мачу-Пикчу в Перу"
            else:
                response = "Я могу помочь вам с:\n- Выбором направления\n- Информацией о ценах\n- Достопримечательностями\n\nЗадайте вопрос конкретнее!"
            
            await manager.send_message(json.dumps({"response": response}), client_id)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        manager.disconnect(client_id)

@app.get("/users/{username}")
async def get_user_profile(username: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        posts = db.query(Post).filter(Post.user_id == user.id).order_by(Post.created_at.desc()).all()
        
        return {
            "user": {
                "username": user.username,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "profile": {
                    "location": profile.location if profile else None,
                    "about_me": profile.about_me if profile else None,
                    "interests": profile.interests if profile else None,
                    "visited_countries": profile.visited_countries if profile else 0,
                    "travel_style": profile.travel_style if profile else None,
                    "instagram": profile.instagram if profile else None,
                    "favorite_places": profile.favorite_places if profile else None,
                    "next_destination": profile.next_destination if profile else None,
                    "travel_count": profile.travel_count if profile else 0,
                    "joined_date": profile.joined_date if profile else None
                }
            },
            "posts": posts
        }
    finally:
        db.close()

@app.get("/current-user")
async def get_current_user_data(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url
        }
    finally:
        db.close()

@app.put("/users/profile")
async def update_user_profile(
    full_name: str = Form(None),
    location: str = Form(None),
    about_me: str = Form(None),
    instagram: str = Form(None),
    interests: str = Form(None),
    travel_style: str = Form(None),
    favorite_places: str = Form(None),
    next_destination: str = Form(None),
    visited_countries: int = Form(None),
    avatar: UploadFile = None,
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()
    try:
        # Обноляем основную информацию пользователя
        user = db.query(User).filter(User.id == current_user.id).first()
        if full_name:
            user.full_name = full_name

        # Обрбатываем загрузку аватара
        if avatar:
            file_extension = os.path.splitext(avatar.filename)[1]
            file_name = f"avatar_{user.id}_{datetime.now().timestamp()}{file_extension}"
            file_location = f"uploads/{file_name}"
            
            with open(file_location, "wb+") as file_object:
                contents = await avatar.read()
                file_object.write(contents)
            
            user.avatar_url = f"/uploads/{file_name}"

        # Получаем или создаем профиль пользоват��ля
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if not profile:
            profile = Profile(user_id=current_user.id)
            db.add(profile)

        # Обновляем поля профиля
        if location:
            profile.location = location
        if about_me:
            profile.about_me = about_me
        if instagram:
            profile.instagram = instagram
        if interests:
            profile.interests = interests
        if travel_style:
            profile.travel_style = travel_style
        if favorite_places:
            profile.favorite_places = favorite_places
        if next_destination:
            profile.next_destination = next_destination
        if visited_countries is not None:
            profile.visited_countries = visited_countries

        db.commit()
        return {"message": "Profile updated successfully"}
    finally:
        db.close()

@app.post("/users/{username}/follow")
async def follow_user(username: str, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        target_user = db.query(User).filter(User.username == username).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if target_user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
            
        follow = UserFollow(
            follower_id=current_user.id,
            following_id=target_user.id
        )
        db.add(follow)
        db.commit()
        return {"message": "Successfully followed user"}
    finally:
        db.close()

@app.post("/messages/{username}")
async def send_message(
    username: str,
    message: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()
    try:
        receiver = db.query(User).filter(User.username == username).first()
        if not receiver:
            raise HTTPException(status_code=404, detail="User not found")
            
        new_message = Message(
            sender_id=current_user.id,
            receiver_id=receiver.id,
            content=message
        )
        db.add(new_message)
        db.commit()
        return {"message": "Message sent successfully"}
    finally:
        db.close()

@app.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        comments = db.query(Comment).filter(Comment.post_id == post_id)\
            .order_by(Comment.created_at.desc())\
            .all()
            
        # Добавляем информацию о пользователях
        comments_data = []
        for comment in comments:
            user = db.query(User).filter(User.id == comment.user_id).first()
            comments_data.append({
                "id": comment.id,
                "content": comment.content,
                "created_at": comment.created_at,
                "user": {
                    "username": user.username,
                    "full_name": user.full_name,
                    "avatar_url": user.avatar_url
                }
            })
            
        return comments_data
    finally:
        db.close()

@app.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: int,
    comment: dict,
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()
    try:
        new_comment = Comment(
            content=comment["content"],
            post_id=post_id,
            user_id=current_user.id
        )
        db.add(new_comment)
        db.commit()
        return {"message": "Comment created successfully"}
    finally:
        db.close()

@app.post("/places")
async def create_place(
    name: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    category: str = Form(...),
    image: UploadFile = None,
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()
    try:
        place = Place(
            name=name,
            description=description,
            location=location,
            category=category
        )
        
        if image:
            file_extension = os.path.splitext(image.filename)[1]
            file_name = f"place_{datetime.now().timestamp()}{file_extension}"
            file_location = os.path.join(UPLOAD_DIR, file_name)
            
            try:
                with open(file_location, "wb+") as file_object:
                    contents = await image.read()
                    file_object.write(contents)
                
                place.image_url = f"/static/uploads/{file_name}"
                print(f"Image saved at: {file_location}")
                print(f"Image URL: {place.image_url}")
            except Exception as e:
                print(f"Error saving file: {e}")
                raise HTTPException(status_code=500, detail="Could not save image")
            
        db.add(place)
        db.commit()
        return {"message": "Place created successfully"}
    finally:
        db.close()

@app.post("/places/{place_id}/reviews")
async def create_review(
    place_id: int,
    rating: int = Form(...),
    content: str = Form(...),
    visit_date: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
    db = SessionLocal()
    try:
        # Проверяем существование места
        place = db.query(Place).filter(Place.id == place_id).first()
        if not place:
            raise HTTPException(status_code=404, detail="Place not found")
            
        # Создаем отзыв
        review = Review(
            place_id=place_id,
            user_id=current_user.id,
            rating=rating,
            content=content,
            visit_date=datetime.strptime(visit_date, "%Y-%m-%d")
        )
        db.add(review)
        
        # Обновляем средний рейтинг места
        place.average_rating = (
            (place.average_rating * place.ratings_count + rating) / 
            (place.ratings_count + 1)
        )
        place.ratings_count += 1
        
        db.commit()
        return {"message": "Review created successfully"}
    finally:
        db.close()

@app.get("/places")
async def get_places(
    category: str = None,
    location: str = None,
    min_rating: float = None,
    sort_by: str = "rating"  # rating, date
):
    db = SessionLocal()
    try:
        query = db.query(Place)
        
        if category:
            query = query.filter(Place.category == category)
        if location:
            query = query.filter(Place.location.ilike(f"%{location}%"))
        if min_rating:
            query = query.filter(Place.average_rating >= min_rating)
            
        if sort_by == "rating":
            query = query.order_by(Place.average_rating.desc())
        else:
            query = query.order_by(Place.created_at.desc())
            
        places = query.all()
        return places
    finally:
        db.close()

@app.get("/places/{place_id}/reviews")
async def get_place_reviews(
    place_id: int,
    skip: int = 0,
    limit: int = 10,
    sort_by: str = "date"  # date, rating, likes
):
    db = SessionLocal()
    try:
        query = db.query(Review).filter(Review.place_id == place_id)
        
        if sort_by == "rating":
            query = query.order_by(Review.rating.desc())
        elif sort_by == "likes":
            query = query.order_by(func.count(ReviewLike.id).desc())
        else:
            query = query.order_by(Review.created_at.desc())
            
        reviews = query.offset(skip).limit(limit).all()
        
        # Добавляем информацию о пользователях и лайках
        reviews_data = []
        for review in reviews:
            user = db.query(User).filter(User.id == review.user_id).first()
            likes_count = db.query(ReviewLike).filter(
                ReviewLike.review_id == review.id
            ).count()
            
            reviews_data.append({
                "id": review.id,
                "rating": review.rating,
                "content": review.content,
                "visit_date": review.visit_date,
                "created_at": review.created_at,
                "likes_count": likes_count,
                "user": {
                    "username": user.username,
                    "full_name": user.full_name,
                    "avatar_url": user.avatar_url
                }
            })
            
        return reviews_data
    finally:
        db.close()

@app.post("/posts/{post_id}/like")
async def like_post(post_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
            
        like = db.query(PostLike).filter(
            PostLike.post_id == post_id,
            PostLike.user_id == current_user.id
        ).first()
        
        if not like:
            like = PostLike(post_id=post_id, user_id=current_user.id)
            db.add(like)
            db.commit()
            
        likes_count = db.query(PostLike).filter(PostLike.post_id == post_id).count()
        return {"likes_count": likes_count}
    finally:
        db.close()

@app.delete("/posts/{post_id}/like")
async def unlike_post(post_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        like = db.query(PostLike).filter(
            PostLike.post_id == post_id,
            PostLike.user_id == current_user.id
        ).first()
        
        if like:
            db.delete(like)
            db.commit()
            
        likes_count = db.query(PostLike).filter(PostLike.post_id == post_id).count()
        return {"likes_count": likes_count}
    finally:
        db.close()