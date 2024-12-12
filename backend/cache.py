from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

class CacheManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        
    async def init_cache(self):
        redis = aioredis.from_url(self.redis_url, encoding="utf8", decode_responses=True)
        FastAPICache.init(RedisBackend(redis), prefix="travel-social-cache:") 