from datetime import datetime
from typing import Dict, List

class AnalyticsManager:
    def __init__(self):
        self.events: List[Dict] = []
        
    async def track_event(self, event_type: str, user_id: str, data: Dict):
        event = {
            "type": event_type,
            "user_id": user_id,
            "timestamp": datetime.utcnow(),
            "data": data
        }
        self.events.append(event)
        await self.process_event(event)
        
    async def get_user_stats(self, user_id: str):
        user_events = [e for e in self.events if e["user_id"] == user_id]
        return {
            "total_posts": len([e for e in user_events if e["type"] == "post_created"]),
            "total_likes": len([e for e in user_events if e["type"] == "post_liked"]),
            "places_visited": len(set([e["data"]["place_id"] for e in user_events if e["type"] == "place_visited"]))
        } 