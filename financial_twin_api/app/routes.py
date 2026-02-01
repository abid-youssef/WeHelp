"""
API Routes for Loan Risk Assessment
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
import logging

from app.schemas.loan_schemas import (
    LoanAssessmentRequest,
    LoanAssessmentResponse,
    ErrorResponse
)
from app.services.model_service import ModelService
from app.services.risk_assessment_service import RiskAssessmentService

logger = logging.getLogger(__name__)

loan_router = APIRouter(prefix="/loan", tags=["Loan Assessment"])


def get_model_service() -> ModelService:
    """
    Dependency to get model service
    Import from main to avoid circular imports
    """
    from main import get_model_service as _get_model_service
    return _get_model_service()


@loan_router.post(
    "/assess",
    response_model=LoanAssessmentResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Assess Loan Risk",
    description="""
    Assess the risk of a loan application with detailed breakdown.
    
    This endpoint:
    - Evaluates borrower's financial profile
    - Predicts default risk using ML model
    - Provides SHAP-based explanations
    - Simulates 24-month cashflow projection
    - Generates actionable recommendations
    """
)
async def assess_loan_risk(
    request: LoanAssessmentRequest,
    model_service: ModelService = Depends(get_model_service)
) -> LoanAssessmentResponse:
    """
    Main endpoint for loan risk assessment
    """
    try:
        logger.info(f"Received loan assessment request")
        
        # Convert Pydantic model to dict
        profile_data = request.dict()
        
        # Create risk assessment service
        risk_service = RiskAssessmentService(model_service)
        
        # Perform assessment
        assessment_result = risk_service.assess_risk(profile_data)
        
        logger.info(
            f"Assessment complete. Risk score: {assessment_result['risk_score']:.1f}%, "
            f"Recommendation: {assessment_result['recommendation']}"
        )
        
        return LoanAssessmentResponse(**assessment_result)
    
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input data: {str(e)}"
        )
    
    except Exception as e:
        logger.error(f"Error during risk assessment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@loan_router.post(
    "/quick-score",
    summary="Quick Risk Score",
    description="Get a quick risk score without detailed breakdown (faster)"
)
async def quick_risk_score(
    request: LoanAssessmentRequest,
    model_service: ModelService = Depends(get_model_service)
) -> Dict:
    """
    Quick endpoint that returns just the risk score
    """
    try:
        profile_data = request.dict()
        
        # Extract features and predict
        features = model_service.extract_features(profile_data)
        risk_score, probabilities = model_service.predict_risk(features)
        
        # Categorize
        if risk_score < 25:
            risk_category = "low"
            recommendation = "approve"
        elif risk_score < 50:
            risk_category = "medium"
            recommendation = "review"
        elif risk_score < 75:
            risk_category = "high"
            recommendation = "review"
        else:
            risk_category = "very_high"
            recommendation = "reject"
        
        return {
            "risk_score": float(risk_score),
            "risk_category": risk_category,
            "recommendation": recommendation,
            "default_probability": float(probabilities[1])
        }
    
    except Exception as e:
        logger.error(f"Error in quick score: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating risk score: {str(e)}"
        )


@loan_router.get(
    "/model-info",
    summary="Model Information",
    description="Get information about the loaded model"
)
async def get_model_info(
    model_service: ModelService = Depends(get_model_service)
) -> Dict:
    """
    Get information about the loaded model
    """
    return {
        "model_loaded": model_service.is_loaded(),
        "feature_count": len(model_service.feature_columns),
        "features": model_service.feature_columns,
        "model_type": str(type(model_service.model).__name__)
    }


@loan_router.post(
    "/explain",
    summary="Explain Prediction",
    description="Get detailed SHAP explanations for a prediction"
)
async def explain_prediction(
    request: LoanAssessmentRequest,
    model_service: ModelService = Depends(get_model_service)
) -> Dict:
    """
    Get SHAP-based explanations for a prediction
    """
    try:
        profile_data = request.dict()
        
        # Extract features
        features = model_service.extract_features(profile_data)
        
        # Get prediction
        risk_score, _ = model_service.predict_risk(features)
        
        # Get SHAP contributions
        risk_drivers, protective_factors = (
            model_service.get_feature_contributions(features, top_n=10)
        )
        
        return {
            "risk_score": float(risk_score),
            "top_risk_drivers": risk_drivers,
            "top_protective_factors": protective_factors,
            "feature_values": {
                "monthly_income": features['monthly_income'],
                "monthly_expenses": features['monthly_expenses'],
                "debt_to_income_ratio": features['debt_to_income_ratio'],
                "buffer_months": features['buffer_months'],
                "net_monthly_cashflow": features['net_monthly_cashflow']
            }
        }
    
    except Exception as e:
        logger.error(f"Error explaining prediction: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating explanation: {str(e)}"
        )
