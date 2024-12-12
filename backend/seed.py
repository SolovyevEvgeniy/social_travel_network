from faker import Faker
from backend.models import User, Post, Profile, Place, Review, Comment, Message, UserFollow, Achievement, Route, RoutePoint, RouteLike
from backend.database import SessionLocal, engine, Base
from passlib.context import CryptContext
import random
from datetime import datetime, timedelta

fake = Faker(['ru_RU'])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_tables():
    print("Создание таблиц в базе данных...")
    Base.metadata.drop_all(bind=engine)  # Удаляем старые таблицы
    Base.metadata.create_all(bind=engine)  # Создаем новые таблицы
    print("Таблицы успешно созданы!")

def create_test_data():
    db = SessionLocal()
    
    # Списки для генерации данных
    countries = [
        "Италия", "Франция", "Испания", "Япония", "Таиланд", 
        "Греция", "Турция", "Индонезия", "Вьетнам", "Мальдивы"
    ]
    
    cities = {
        "Италия": ["Рим", "Ве��еция", "Флоренция", "Милан"],
        "Франция": ["Париж", "Ницца", "Лион", "Марсель"],
        "Испания": ["Барселона", "Мадрид", "Валенсия", "Севилья"],
        "Япония": ["Токио", "Киото", "Осака", "Нара"],
        "Таиланд": ["Бангкок", "Пхукет", "Паттайя", "Чиангмай"]
    }

    place_categories = ["restaurant", "hotel", "attraction", "beach", "museum"]
    
    # Создаем достижения
    achievements = [
        {
            "title": "Путешественник-новичок",
            "description": "Посетите первую страну",
            "icon_url": "🌱",
            "condition_type": "countries_visited",
            "condition_value": 1
        },
        {
            "title": "Опытный путешественник",
            "description": "Посетите 10 стран",
            "icon_url": "🌍",
            "condition_type": "countries_visited",
            "condition_value": 10
        },
        {
            "title": "Блогер",
            "description": "Создайте 10 постов",
            "icon_url": "✍️",
            "condition_type": "posts_created",
            "condition_value": 10
        }
    ]
    
    for achievement_data in achievements:
        achievement = Achievement(**achievement_data)
        db.add(achievement)
    
    users = []
    # Создаем 5 пользователей
    for i in range(5):
        user = User(
            email=fake.unique.email(),
            username=fake.unique.user_name(),
            hashed_password=pwd_context.hash("password123"),
            full_name=fake.name(),
            avatar_url=f"https://i.pravatar.cc/300?img={i+1}"
        )
        db.add(user)
        db.flush()
        users.append(user)
        
        # Профиль
        visited = random.sample(countries, random.randint(3, 8))
        profile = Profile(
            user_id=user.id,
            location=fake.city(),
            interests="Путешествия, Фотография, Культура, Еда, Архитектура",
            visited_countries=len(visited),
            travel_style=random.choice(["Люкс", "Бэкпекинг", "Экотуризм"]),
            about_me=fake.text(max_nb_chars=200),
            instagram=f"@{user.username}",
            favorite_places=", ".join(random.sample(visited, min(3, len(visited)))),
            next_destination=random.choice(countries),
            travel_count=random.randint(5, 20)
        )
        db.add(profile)
        
        # Посты
        for j in range(7):
            country = random.choice(countries)
            city = random.choice(cities.get(country, ["Неизвестный город"]))
            
            post = Post(
                title=f"Путешествие в {city}, {country}",
                content="\n\n".join([
                    fake.paragraph(nb_sentences=5),
                    "🌟 Впечатления:",
                    fake.paragraph(nb_sentences=3),
                    "📍 Любимые места:",
                    "\n".join([f"- {fake.sentence()}" for _ in range(3)]),
                    "💡 Советы путешественникам:",
                    "\n".join([f"- {fake.sentence()}" for _ in range(2)])
                ]),
                image_url=f"https://picsum.photos/seed/{city.lower().replace(' ', '')}{random.randint(1,1000)}/800/600",
                location=f"{city}, {country}",
                travel_date=datetime.now() - timedelta(days=random.randint(1, 730)),
                user_id=user.id
            )
            db.add(post)
            db.flush()
            
            # Комментарии к постам
            for _ in range(random.randint(1, 5)):
                comment_user = random.choice(users)
                comment = Comment(
                    content=fake.paragraph(),
                    user_id=comment_user.id,
                    post_id=post.id
                )
                db.add(comment)
    
    # Создаем подписки между пользователями
    for user in users:
        # Каждый пользователь подписывается на 2-4 случайных пользователя
        for followed_user in random.sample(users, random.randint(2, 4)):
            if user != followed_user:
                follow = UserFollow(
                    follower_id=user.id,
                    following_id=followed_user.id
                )
                db.add(follow)
    
    # Создаем места и отзывы
    for country in countries:
        for city in cities.get(country, []):
            for _ in range(random.randint(2, 5)):
                category = random.choice(place_categories)
                place = Place(
                    name=fake.company(),
                    description=fake.text(),
                    location=f"{city}, {country}",
                    category=category,
                    image_url=f"https://picsum.photos/seed/place{fake.random_number()}/800/600"
                )
                db.add(place)
                db.flush()
                
                # Добавляем отзывы к местам
                for _ in range(random.randint(3, 8)):
                    review_user = random.choice(users)
                    rating = random.randint(3, 5)  # Немного завышенные оценки для реалистичности
                    review = Review(
                        place_id=place.id,
                        user_id=review_user.id,
                        rating=rating,
                        content=fake.paragraph(),
                        visit_date=datetime.now() - timedelta(days=random.randint(1, 365))
                    )
                    db.add(review)
                    
                    # Обновляем рейтинг места
                    place.ratings_count += 1
                    place.average_rating = ((place.average_rating * (place.ratings_count - 1)) + rating) / place.ratings_count
    
    # Создаем личные сообщения между пользователями
    for user in users:
        for _ in range(random.randint(2, 5)):
            receiver = random.choice([u for u in users if u != user])
            message = Message(
                sender_id=user.id,
                receiver_id=receiver.id,
                content=fake.sentence(),
                is_read=random.choice([True, False])
            )
            db.add(message)
    
    try:
        db.commit()
        print("Тестовые данные успешно созданы!")
    except Exception as e:
        print(f"Ошибка при создании тестовых данных: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    create_test_data() 