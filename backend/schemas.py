from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict

class UserBase(BaseModel):
    email: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class PostOwner(BaseModel):
    email: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class PostBase(BaseModel):
    title: str
    content: str
    location: Optional[str] = None
    image_url: Optional[str] = None

class PostCreate(PostBase):
    pass

class Post(BaseModel):
    id: int
    title: str
    content: str
    location: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime
    user_id: int
    likes_count: int = 0
    owner: PostOwner

    class Config:
        orm_mode = True