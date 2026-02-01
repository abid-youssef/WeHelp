"""
Main FastAPI application for Loan Risk Assessment
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.routes import loan_router
from app.services.model_service import ModelService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model service globally
model_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager - loads models on startup, cleans up on shutdown
    """
    global model_service
    logger.info("Starting up application...")
    
    # Load models on startup
    model_service = ModelService()
    model_service.load_models()
    logger.info("Models loaded successfully")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down application...")


# Create FastAPI app
app = FastAPI(
    title="Loan Risk Assessment API",
    description="AI-powered loan risk assessment with detailed breakdown and SHAP explanations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(loan_router, prefix="/api/v1")


@app.get("/")
async def root():
    """
    Root endpoint - health check
    """
    return {
        "status": "healthy",
        "message": "Loan Risk Assessment API is running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """
    Detailed health check including model status
    """
    global model_service
    
    model_loaded = model_service is not None and model_service.is_loaded()
    
    return {
        "status": "healthy" if model_loaded else "degraded",
        "model_loaded": model_loaded,
        "features_count": len(model_service.feature_columns) if model_loaded else 0
    }


# Make model service available to routes
def get_model_service() -> ModelService:
    """
    Dependency injection for model service
    """
    global model_service
    if model_service is None:
        raise HTTPException(status_code=503, detail="Model service not initialized")
    return model_service
