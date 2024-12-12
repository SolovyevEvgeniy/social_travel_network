import pytest
import uvicorn
import asyncio
from multiprocessing import Process
from time import sleep

def run_server():
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)

def main():
    # Запускаем сервер в отдельном процессе
    server = Process(target=run_server)
    server.start()
    sleep(2)  # Ждем запуска сервера

    try:
        # Запускаем тесты
        pytest.main(["-v", "backend/tests"])
    finally:
        # Останавливаем сервер
        server.terminate()
        server.join()

if __name__ == "__main__":
    main() 