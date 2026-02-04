from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import weather

app = FastAPI(
    title="Solar Studio API",
    description="Backend API for Solar Studio visibility tracking",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(weather.router, prefix=settings.api_prefix, tags=["weather"])

@app.get("/")
async def root():
    return {"message": "Solar Studio API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
