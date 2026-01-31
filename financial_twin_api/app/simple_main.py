"""
Financial Digital Twin API - Simplified for Hackathon Demo
Tunisian context with realistic synthetic data
"""

from datetime import datetime, timedelta
from typing import Any
import logging

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Financial Digital Twin API",
    description="Personalized financial predictions for Tunisian users",
    version="1.0.0-demo",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# SCHEMAS (Simplified)
# ============================================================================

class UserProfile(BaseModel):
    """User profile for digital twin creation."""
    user_id: str = Field(default="demo_user")
    age: int = Field(ge=18, le=70, default=32)
    occupation: str = Field(default="private_sector")
    city: str = Field(default="tunis")
    monthly_income: float = Field(gt=0, default=2000.0)
    dependents: int = Field(ge=0, le=10, default=1)


class Transaction(BaseModel):
    """Single transaction."""
    date: datetime
    category: str
    amount: float
    type: str = "expense"  # income or expense


class LoanRequest(BaseModel):
    """Loan recommendation request."""
    goal: str = Field(default="Emergency fund")
    amount_needed: float = Field(gt=0, le=50000)
    urgency: str = Field(default="flexible")  # immediate, soon, flexible


class ScenarioRequest(BaseModel):
    """What-if scenario request."""
    income_change_pct: float = Field(default=0, ge=-1, le=1)
    expense_change_pct: float = Field(default=0, ge=-1, le=1)
    new_loan_amount: float = Field(default=0, ge=0)
    loan_term_months: int = Field(default=24, ge=6, le=60)
    horizon_months: int = Field(default=12, ge=1, le=24)


# ============================================================================
# IN-MEMORY STORAGE (Demo only)
# ============================================================================

twins_db: dict[str, dict] = {}


# ============================================================================
# TUNISIAN CONTEXT
# ============================================================================

EXPENSE_CATEGORIES = ["housing", "food", "transport", "utilities", "healthcare", "education", "clothing", "entertainment"]

# Monthly spending multipliers for Tunisia
MONTHLY_MULTIPLIERS = {
    1: 1.0,   # January
    2: 1.0,   # February  
    3: 1.4,   # March - Ramadan
    4: 1.6,   # April - Eid al-Fitr
    5: 1.0,   # May
    6: 1.5,   # June - Eid al-Adha + Summer start
    7: 1.4,   # July - Summer peak
    8: 1.3,   # August - Summer
    9: 1.6,   # September - Back to school
    10: 1.0,  # October
    11: 1.0,  # November
    12: 1.2,  # December - Year end
}

HIGH_EXPENSE_MONTHS = [3, 4, 6, 7, 8, 9]  # Ramadan, Eid, Summer, Back-to-school


def get_expense_ratios(dependents: int = 0) -> dict[str, float]:
    """Get typical expense ratios for a Tunisian household."""
    base = {
        "housing": 0.25,
        "food": 0.20,
        "transport": 0.08,
        "utilities": 0.05,
        "healthcare": 0.04,
        "education": 0.05,
        "clothing": 0.04,
        "entertainment": 0.03,
    }
    # Adjust for dependents (max total ~80%)
    if dependents > 0:
        base["food"] += 0.02 * min(dependents, 3)
        base["education"] += 0.02 * min(dependents, 3)
        base["healthcare"] += 0.01 * min(dependents, 3)
    return base


# ============================================================================
# CORE LOGIC
# ============================================================================

def create_digital_twin(profile: UserProfile) -> dict[str, Any]:
    """Create a financial digital twin from user profile."""
    
    # Generate baseline expenses
    expense_ratios = get_expense_ratios(profile.dependents)
    monthly_expenses = {
        cat: round(profile.monthly_income * ratio, 2)
        for cat, ratio in expense_ratios.items()
    }
    
    total_expenses = sum(monthly_expenses.values())
    savings_rate = max(0, (profile.monthly_income - total_expenses) / profile.monthly_income)
    
    # Classify financial health
    if savings_rate >= 0.20:
        health_state = "thriving"
    elif savings_rate >= 0.10:
        health_state = "stable"
    elif savings_rate >= 0.0:
        health_state = "stressed"
    else:
        health_state = "crisis"
    
    twin = {
        "twin_id": profile.user_id,
        "profile": profile.model_dump(),
        "baseline": {
            "monthly_income": profile.monthly_income,
            "monthly_expenses": monthly_expenses,
            "total_expenses": round(total_expenses, 2),
            "monthly_savings": round(profile.monthly_income - total_expenses, 2),
            "savings_rate": round(savings_rate, 3),
        },
        "health_state": health_state,
        "high_expense_months": HIGH_EXPENSE_MONTHS,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    twins_db[profile.user_id] = twin
    return twin


def forecast_cash_flow(twin: dict, months: int = 12) -> list[dict]:
    """Forecast cash flow for upcoming months."""
    
    baseline = twin["baseline"]
    income = baseline["monthly_income"]
    expenses = baseline["total_expenses"]
    
    forecasts = []
    cumulative_savings = 0
    
    current = datetime.now()
    
    for i in range(months):
        future_date = current + timedelta(days=30 * (i + 1))
        month = future_date.month
        
        # Apply seasonal multiplier
        multiplier = MONTHLY_MULTIPLIERS.get(month, 1.0)
        
        # Add some variance
        income_var = income * np.random.uniform(0.95, 1.05)
        expense_var = expenses * multiplier * np.random.uniform(0.9, 1.1)
        
        savings = income_var - expense_var
        cumulative_savings += savings
        
        forecasts.append({
            "month": future_date.strftime("%Y-%m"),
            "predicted_income": round(income_var, 2),
            "predicted_expenses": round(expense_var, 2),
            "predicted_savings": round(savings, 2),
            "cumulative_savings": round(cumulative_savings, 2),
            "is_high_expense_month": month in HIGH_EXPENSE_MONTHS,
            "seasonal_event": _get_seasonal_event(month),
        })
    
    return forecasts


def _get_seasonal_event(month: int) -> str | None:
    """Get the seasonal event for a given month."""
    events = {
        3: "Ramadan",
        4: "Eid al-Fitr",
        6: "Eid al-Adha / Summer Start",
        7: "Summer Holidays",
        8: "Summer Holidays",
        9: "Back to School",
        12: "Year End",
    }
    return events.get(month)


def simulate_scenario(twin: dict, scenario: ScenarioRequest) -> dict[str, Any]:
    """Run what-if scenario simulation."""
    
    baseline = twin["baseline"]
    
    # Apply modifications
    new_income = baseline["monthly_income"] * (1 + scenario.income_change_pct)
    new_expenses = baseline["total_expenses"] * (1 + scenario.expense_change_pct)
    
    # Add loan payment if applicable
    loan_payment = 0
    if scenario.new_loan_amount > 0:
        # Simple loan calculation (10% annual rate)
        rate = 0.10 / 12
        loan_payment = scenario.new_loan_amount * rate / (1 - (1 + rate) ** -scenario.loan_term_months)
    
    new_expenses += loan_payment
    
    # Project forward
    timeline = []
    cumulative = 0
    
    for i in range(scenario.horizon_months):
        month = (datetime.now().month + i) % 12 + 1
        multiplier = MONTHLY_MULTIPLIERS.get(month, 1.0)
        
        month_expenses = new_expenses * multiplier
        month_savings = new_income - month_expenses
        cumulative += month_savings
        
        timeline.append({
            "month": i + 1,
            "income": round(new_income, 2),
            "expenses": round(month_expenses, 2),
            "loan_payment": round(loan_payment, 2),
            "savings": round(month_savings, 2),
            "cumulative": round(cumulative, 2),
        })
    
    # Stress test
    stress_income_drop = new_income * 0.8  # 20% drop
    stress_expenses_spike = new_expenses * 1.15  # 15% spike
    stress_surplus = stress_income_drop - stress_expenses_spike
    
    return {
        "baseline_comparison": {
            "original_savings": baseline["monthly_savings"],
            "new_savings": round(new_income - new_expenses, 2),
            "difference": round((new_income - new_expenses) - baseline["monthly_savings"], 2),
        },
        "timeline": timeline,
        "summary": {
            "total_savings": round(cumulative, 2),
            "avg_monthly_savings": round(cumulative / scenario.horizon_months, 2),
            "months_to_break_even": _months_to_target(timeline, 0),
        },
        "stress_test": {
            "scenario": "20% income drop + 15% expense increase",
            "monthly_surplus": round(stress_surplus, 2),
            "sustainable": stress_surplus > 0,
        },
        "loan_details": {
            "amount": scenario.new_loan_amount,
            "monthly_payment": round(loan_payment, 2),
            "total_cost": round(loan_payment * scenario.loan_term_months, 2),
            "term_months": scenario.loan_term_months,
        } if scenario.new_loan_amount > 0 else None,
    }


def _months_to_target(timeline: list, target: float) -> int | None:
    """Find months needed to reach a savings target."""
    for entry in timeline:
        if entry["cumulative"] >= target:
            return entry["month"]
    return None


def recommend_loan(twin: dict, request: LoanRequest) -> dict[str, Any]:
    """Generate loan recommendations."""
    
    baseline = twin["baseline"]
    income = baseline["monthly_income"]
    current_expenses = baseline["total_expenses"]
    surplus = income - current_expenses
    
    # Check eligibility
    max_payment = surplus * 0.4  # Max 40% of surplus for loan
    
    if max_payment <= 0:
        return {
            "eligible": False,
            "reason": "Insufficient monthly surplus for loan payments",
            "recommendation": "Focus on increasing income or reducing expenses first",
            "alternatives": [
                {"approach": "Reduce expenses by 10%", "potential_savings": round(current_expenses * 0.1, 2)},
                {"approach": "Build emergency fund", "target": round(current_expenses * 3, 2)},
            ],
        }
    
    # Calculate loan options
    options = []
    
    for term in [12, 24, 36]:
        rate = 0.10 / 12  # 10% annual
        payment = request.amount_needed * rate / (1 - (1 + rate) ** -term)
        total_cost = payment * term
        
        affordable = payment <= max_payment
        
        options.append({
            "term_months": term,
            "monthly_payment": round(payment, 2),
            "total_cost": round(total_cost, 2),
            "total_interest": round(total_cost - request.amount_needed, 2),
            "affordable": affordable,
            "payment_to_surplus_ratio": round(payment / surplus, 2) if surplus > 0 else None,
        })
    
    # Find best option
    affordable_options = [o for o in options if o["affordable"]]
    recommended = min(affordable_options, key=lambda x: x["total_interest"]) if affordable_options else None
    
    # Check timing
    current_month = datetime.now().month
    avoid_months = [m for m in HIGH_EXPENSE_MONTHS if m >= current_month][:3]
    
    return {
        "eligible": len(affordable_options) > 0,
        "goal": request.goal,
        "amount_requested": request.amount_needed,
        "max_affordable_payment": round(max_payment, 2),
        "options": options,
        "recommended": recommended,
        "timing_advice": {
            "avoid_months": avoid_months,
            "reason": "High expense periods (Ramadan, Eid, Summer, Back-to-school)",
            "best_months": [m for m in range(1, 13) if m not in HIGH_EXPENSE_MONTHS],
        },
        "stress_test": {
            "can_handle_income_drop": (income * 0.8 - current_expenses - (recommended["monthly_payment"] if recommended else 0)) > 0,
            "emergency_fund_needed": round(current_expenses * 3, 2),
        },
    }


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """API root."""
    return {
        "service": "Financial Digital Twin API",
        "version": "1.0.0-demo",
        "context": "Tunisia",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/v1/twins", status_code=status.HTTP_201_CREATED)
async def create_twin(profile: UserProfile) -> dict:
    """Create a new digital twin."""
    twin = create_digital_twin(profile)
    logger.info(f"Created twin for {profile.user_id}")
    return twin


@app.get("/api/v1/twins/{twin_id}")
async def get_twin(twin_id: str) -> dict:
    """Get a digital twin by ID."""
    if twin_id not in twins_db:
        # Create demo twin
        profile = UserProfile(user_id=twin_id)
        return create_digital_twin(profile)
    return twins_db[twin_id]


@app.get("/api/v1/twins/{twin_id}/forecast")
async def get_forecast(twin_id: str, months: int = 12) -> dict:
    """Get cash flow forecast."""
    if twin_id not in twins_db:
        profile = UserProfile(user_id=twin_id)
        create_digital_twin(profile)
    
    twin = twins_db[twin_id]
    forecasts = forecast_cash_flow(twin, months)
    
    return {
        "twin_id": twin_id,
        "horizon_months": months,
        "forecasts": forecasts,
        "summary": {
            "total_predicted_savings": sum(f["predicted_savings"] for f in forecasts),
            "high_expense_months": [f["month"] for f in forecasts if f["is_high_expense_month"]],
        },
    }


@app.post("/api/v1/twins/{twin_id}/simulate")
async def simulate(twin_id: str, scenario: ScenarioRequest) -> dict:
    """Run what-if scenario simulation."""
    if twin_id not in twins_db:
        profile = UserProfile(user_id=twin_id)
        create_digital_twin(profile)
    
    twin = twins_db[twin_id]
    result = simulate_scenario(twin, scenario)
    
    return {
        "twin_id": twin_id,
        "scenario": scenario.model_dump(),
        "result": result,
    }


@app.post("/api/v1/twins/{twin_id}/recommend-loan")
async def recommend(twin_id: str, request: LoanRequest) -> dict:
    """Get loan recommendations."""
    if twin_id not in twins_db:
        profile = UserProfile(user_id=twin_id)
        create_digital_twin(profile)
    
    twin = twins_db[twin_id]
    recommendation = recommend_loan(twin, request)
    
    return {
        "twin_id": twin_id,
        "recommendation": recommendation,
    }


@app.get("/api/v1/context/tunisia")
async def get_context() -> dict:
    """Get Tunisian financial context info."""
    return {
        "high_expense_months": HIGH_EXPENSE_MONTHS,
        "monthly_multipliers": MONTHLY_MULTIPLIERS,
        "seasonal_events": {
            3: "Ramadan - Food & charity spending increases 40-60%",
            4: "Eid al-Fitr - Major celebration, gifts, new clothes",
            6: "Eid al-Adha - Largest expense (sheep), Summer starts",
            7: "Summer Holidays - Travel, entertainment peak",
            8: "Summer Holidays - Continued vacation spending",
            9: "Back to School - Education, clothing, supplies",
            12: "Year End - Celebrations, shopping",
        },
        "typical_expense_ratios": get_expense_ratios(1),
        "loan_advice": {
            "max_dti_ratio": 0.40,
            "recommended_emergency_fund_months": 3,
            "avoid_borrowing_months": HIGH_EXPENSE_MONTHS,
        },
    }


# ============================================================================
# RUN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
