from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float
from sqlalchemy.sql.expression import text
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True, default="https://i.pravatar.cc/150")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Отношения
    posts = relationship("Post", back_populates="owner")
    profile = relationship("Profile", back_populates="user", uselist=False)
    routes = relationship("Route", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")
    comments = relationship("Comment", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    location = Column(String)
    interests = Column(String)
    visited_countries = Column(Integer, default=0)
    travel_style = Column(String)
    about_me = Column(Text)
    instagram = Column(String, nullable=True)
    favorite_places = Column(String, nullable=True)
    next_destination = Column(String, nullable=True)
    travel_count = Column(Integer, default=0)
    joined_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Отношения
    user = relationship("User", back_populates="profile")

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    location = Column(String, nullable=True)
    image_url = Column(String(500), nullable=True, default=None)
    travel_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    
    owner = relationship("User", back_populates="posts")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

class Route(Base):
    __tablename__ = "routes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    duration_days = Column(Integer)
    estimated_budget = Column(Float)
    difficulty_level = Column(String)  # easy, medium, hard
    best_season = Column(String)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Отношения
    user = relationship("User", back_populates="routes")
    points = relationship("RoutePoint", back_populates="route", cascade="all, delete-orphan")
    likes = relationship("RouteLike", back_populates="route", cascade="all, delete-orphan")
    
class RoutePoint(Base):
    __tablename__ = "route_points"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"))
    day_number = Column(Integer)
    location = Column(String)
    description = Column(Text)
    accommodation = Column(String, nullable=True)
    activities = Column(String)
    image_url = Column(String, nullable=True)
    
    route = relationship("Route", back_populates="points")

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    icon_url = Column(String)
    condition_type = Column(String)  # countries_visited, posts_created, likes_received
    condition_value = Column(Integer)
    
    user_achievements = relationship("UserAchievement", back_populates="achievement")

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    achievement_id = Column(Integer, ForeignKey("achievements.id"))
    earned_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")

class UserFollow(Base):
    __tablename__ = "user_follows"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_read = Column(Boolean, default=False)
    
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

class Place(Base):
    __tablename__ = "places"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    location = Column(String, nullable=False)
    category = Column(String)  # restaurant, hotel, attraction, etc.
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    average_rating = Column(Float, default=0.0)
    ratings_count = Column(Integer, default=0)
    
    # Отношения
    reviews = relationship("Review", back_populates="place", cascade="all, delete-orphan")
    
class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    rating = Column(Integer)  # 1-5 stars
    content = Column(Text)
    visit_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Отношения
    place = relationship("Place", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    likes = relationship("ReviewLike", back_populates="review", cascade="all, delete-orphan")
    
class ReviewLike(Base):
    __tablename__ = "review_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    review = relationship("Review", back_populates="likes")
    user = relationship("User")

class RouteLike(Base):
    __tablename__ = "route_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    route = relationship("Route", back_populates="likes")
    user = relationship("User")

class PostLike(Base):
    __tablename__ = "post_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    post = relationship("Post", back_populates="likes")
    user = relationship("User")