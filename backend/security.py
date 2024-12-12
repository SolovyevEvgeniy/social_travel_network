from fastapi import Security, HTTPException
from fastapi.security import HTTPBearer
import jwt
from datetime import datetime, timedelta

class SecurityManager:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.security = HTTPBearer()
        
    async def verify_csrf_token(self, token: str):
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
            if datetime.utcnow() > datetime.fromtimestamp(payload["exp"]):
                raise HTTPException(status_code=401, detail="Token expired")
            return True
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token") 