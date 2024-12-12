from backend.database import SessionLocal
from backend.models import Post
import os

def fix_image_urls():
    db = SessionLocal()
    try:
        # Получаем все посты
        posts = db.query(Post).all()
        
        for post in posts:
            if post.image_url:
                # Проверяем существование файла
                if post.image_url.startswith('/static/'):
                    # Убираем начальный слеш
                    relative_path = post.image_url[1:]
                elif not post.image_url.startswith('static/'):
                    # Добавляем префикс static/
                    relative_path = f"static/{post.image_url}"
                else:
                    relative_path = post.image_url
                
                # Проверяем существование файла
                if os.path.exists(relative_path):
                    # Обновляем путь в базе данных
                    post.image_url = f"/{relative_path}"
                else:
                    # Если файл не существует, очищаем URL
                    print(f"File not found for post {post.id}: {post.image_url}")
                    post.image_url = None
        
        db.commit()
        print("Image URLs fixed successfully")
        
    finally:
        db.close()

if __name__ == "__main__":
    fix_image_urls() 