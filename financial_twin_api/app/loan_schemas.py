"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional
from enum import Enum


class ReliabilityLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class MaritalStatus(str, Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"


class EmploymentType(str, Enum):
    SALARIED = "salaried"
    FREELANCER = "freelancer"
    BUSINESS_OWNER = "business_owner"


class IncomeStreamRequest(BaseModel):
    type: str = Field(..., description="Type of income: salary, freelance, business, rental")
    amount: float = Field(..., gt=0, description="Monthly income amount in TND")
    frequency: str = Field(..., description="Payment frequency: monthly, weekly, irregular")
    reliability: ReliabilityLevel = Field(..., description="Reliability of income stream")
    growth_rate: float = Field(..., description="Annual growth rate (%)")


class FutureIncomeRequest(BaseModel):
    type: str = Field(..., description="Type: inheritance, bonus, asset_sale")
    expected_date: str = Field(..., description="Expected date in YYYY-MM-DD format")
    expected_amount: float = Field(..., gt=0, description="Expected amount in TND")
    confidence: ConfidenceLevel = Field(..., description="Confidence level")


class ExpenseCategoryRequest(BaseModel):
    category: str = Field(..., description="Category: fixed, semi-fixed, variable")
    subcategory: str = Field(..., description="Subcategory: rent, food, transport, etc.")
    monthly_baseline: float = Field(..., gt=0, description="Monthly baseline expense")
    seasonal_multipliers: Dict[int, float] = Field(
        default_factory=lambda: {i: 1.0 for i in range(1, 13)},
        description="Monthly multipliers (1-12)"
    )
    volatility: float = Field(..., ge=0, le=1, description="Expense volatility (0-1)")


class RecurringObligationRequest(BaseModel):
    type: str = Field(..., description="Type: loan, credit_card, subscription")
    monthly_amount: float = Field(..., gt=0, description="Monthly payment amount")
    remaining_months: int = Field(..., gt=0, description="Remaining months")


class LifeEventRequest(BaseModel):
    name: str = Field(..., description="Event name")
    start_month: int = Field(..., ge=1, le=12, description="Start month (1-12)")
    duration_months: int = Field(..., gt=0, description="Duration in months")
    expense_impact: float = Field(..., ge=0, description="Additional expense impact")


class LoanAssessmentRequest(BaseModel):
    """
    Main request schema for loan assessment
    """
    # Identity
    household_size: int = Field(..., ge=1, description="Number of people in household")
    marital_status: MaritalStatus = Field(..., description="Marital status")
    dependents: int = Field(..., ge=0, description="Number of dependents")
    region: str = Field(..., description="Region in Tunisia")
    employment_type: EmploymentType = Field(..., description="Employment type")
    
    # Financial state
    current_balance: float = Field(..., description="Current account balance in TND")
    income_streams: List[IncomeStreamRequest] = Field(..., min_items=1, description="Income streams")
    future_incomes: List[FutureIncomeRequest] = Field(default_factory=list, description="Future incomes")
    expenses: List[ExpenseCategoryRequest] = Field(..., min_items=1, description="Expense categories")
    obligations: List[RecurringObligationRequest] = Field(default_factory=list, description="Recurring obligations")
    life_events: List[LifeEventRequest] = Field(default_factory=list, description="Life events")
    
    # Loan request
    loan_amount: float = Field(..., gt=0, description="Requested loan amount in TND")
    loan_duration_months: int = Field(..., gt=0, le=60, description="Loan duration in months")
    loan_interest_rate: float = Field(..., gt=0, le=20, description="Annual interest rate (%)")

    class Config:
        schema_extra = {
            "example": {
                "household_size": 4,
                "marital_status": "married",
                "dependents": 2,
                "region": "Tunis",
                "employment_type": "salaried",
                "current_balance": 5000.0,
                "income_streams": [
                    {
                        "type": "salary",
                        "amount": 2500.0,
                        "frequency": "monthly",
                        "reliability": "high",
                        "growth_rate": 3.0
                    }
                ],
                "future_incomes": [],
                "expenses": [
                    {
                        "category": "fixed",
                        "subcategory": "rent",
                        "monthly_baseline": 800.0,
                        "seasonal_multipliers": {str(i): 1.0 for i in range(1, 13)},
                        "volatility": 0.02
                    },
                    {
                        "category": "variable",
                        "subcategory": "food",
                        "monthly_baseline": 500.0,
                        "seasonal_multipliers": {str(i): 1.0 for i in range(1, 13)},
                        "volatility": 0.20
                    }
                ],
                "obligations": [],
                "life_events": [],
                "loan_amount": 15000.0,
                "loan_duration_months": 36,
                "loan_interest_rate": 9.5
            }
        }


class FeatureContribution(BaseModel):
    feature_name: str
    feature_value: float
    shap_value: float
    impact: str  # "increases_risk" or "decreases_risk"


class CashflowProjection(BaseModel):
    month: int
    p10: float
    median: float
    p90: float
    stress_probability: float


class RiskBreakdown(BaseModel):
    category: str
    description: str
    score: float  # 0-100
    status: str  # "good", "warning", "critical"


class LoanAssessmentResponse(BaseModel):
    """
    Main response schema for loan assessment
    """
    # Overall assessment
    risk_score: float = Field(..., description="Overall risk score (0-100)")
    risk_category: str = Field(..., description="Risk category: low, medium, high, very_high")
    recommendation: str = Field(..., description="approve, review, reject")
    
    # Key metrics
    monthly_income: float
    monthly_expenses: float
    monthly_loan_payment: float
    debt_to_income_ratio: float
    net_monthly_cashflow: float
    
    # Risk breakdown
    risk_breakdown: List[RiskBreakdown]
    
    # Top risk drivers
    top_risk_drivers: List[FeatureContribution]
    top_protective_factors: List[FeatureContribution]
    
    # Cashflow projection
    cashflow_projection: List[CashflowProjection]
    
    # Additional insights
    default_probability_12_months: float
    default_probability_24_months: float
    buffer_months: float
    
    # Warnings and alerts
    warnings: List[str]
    recommendations_for_approval: Optional[List[str]] = None


class ErrorResponse(BaseModel):
    error: str
    detail: str
    status_code: int
