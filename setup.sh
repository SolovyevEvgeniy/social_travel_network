#!/bin/bash

# Создаем виртуальное окружение
python -m venv venv

# Активируем виртуальное окружение
source venv/bin/activate  # для Linux/Mac
# или
# .\venv\Scripts\activate  # для Windows

# Устанавливаем зависимости
pip install -r requirements.txt

# Создаем необходимые директории
mkdir -p uploads
mkdir -p logs

# Создаем .env файл
echo "SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///./travel_social.db
UPLOAD_DIR=uploads" > .env

# Создаем базу данных
python -c "from backend.database import Base, engine; Base.metadata.create_all(bind=engine)" 