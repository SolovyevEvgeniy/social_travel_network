import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_post():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/posts/", json={
            "title": "Test Post",
            "content": "Test Content"
        })
        assert response.status_code == 200
        assert response.json()["title"] == "Test Post" 