from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)

class MongoDB:
    """MongoDB database connection manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    database = None


db = MongoDB()


async def connect_to_mongo():
    """Create database connection"""
    try:
        db.client = AsyncIOMotorClient(settings.mongodb_uri)
        db.database = db.client[settings.mongodb_database]
        # Test the connection
        await db.client.admin.command('ping')
        logger.info(f"Connected to MongoDB database: {settings.mongodb_database}")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")


def get_database():
    """Get database instance"""
    return db.database


def get_collection(collection_name: str):
    """Get a specific collection from the database"""
    if db.database is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    return db.database[collection_name]
