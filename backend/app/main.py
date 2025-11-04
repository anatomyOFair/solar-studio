from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import api

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Solar Studio API",
    description="Backend API for Solar Studio application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api.router, prefix=settings.api_prefix)


@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    logger.info("Starting up Solar Studio API...")
    try:
        await connect_to_mongo()
        logger.info("API startup complete")
    except Exception as e:
        logger.error(f"Failed to start API: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    logger.info("Shutting down Solar Studio API...")
    await close_mongo_connection()
    logger.info("API shutdown complete")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Solar Studio API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    from app.database import db
    
    database_status = "connected" if db.client is not None else "disconnected"
    
    return {
        "status": "healthy",
        "database": database_status,
        "environment": settings.environment
    }
