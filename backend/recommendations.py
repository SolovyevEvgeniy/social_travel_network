class TravelRecommender:
    def __init__(self):
        self.model = None
        
    def get_recommendations(self, user_id, db: Session):
        # Получаем историю путешествий пользователя
        user_posts = db.query(Post).filter(Post.user_id == user_id).all()
        user_likes = db.query(PostLike).filter(PostLike.user_id == user_id).all()
        
        # Анализируем предпочтения
        preferred_locations = self._analyze_locations(user_posts)
        preferred_seasons = self._analyze_seasons(user_posts)
        budget_range = self._analyze_budget(user_posts)
        
        # Находим похожие путешествия
        recommendations = db.query(Post)\
            .filter(Post.user_id != user_id)\
            .filter(Post.location.in_(preferred_locations))\
            .limit(10)\
            .all()
            
        return recommendations 