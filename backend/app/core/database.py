from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

import os

client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
db = client.get_default_database()