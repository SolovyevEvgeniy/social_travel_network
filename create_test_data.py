from backend.seed import create_test_data
from backend.database import engine
from backend.models import Base

if __name__ == "__main__":
    # Создаем все таблицы
    Base.metadata.drop_all(bind=engine)  # Удаляем старые таблицы если они есть
    Base.metadata.create_all(bind=engine)  # Создаем новые таблицы
    
    # Добавляем тестовые данные
    create_test_data() 