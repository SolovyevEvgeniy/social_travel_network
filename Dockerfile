FROM python:3.9-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Копирование файлов проекта
COPY requirements.txt .
COPY backend/ backend/
COPY static/ static/
COPY .env .

# Установка зависимостей Python
RUN pip install --no-cache-dir -r requirements.txt

# Создание необходимых директорий
RUN mkdir -p static/uploads

# Установка прав на директории
RUN chmod -R 755 static

# Запуск приложения
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"] 