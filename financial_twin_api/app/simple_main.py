"""
Financial Digital Twin API - Simplified for Hackathon Demo
Tunisian context with realistic synthetic data
"""

from datetime import datetime, timedelta
from typing import Any, List, Optional
import logging
import pickle
import os

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import pandas as pd
from prophet import Prophet
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

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


class UserCategoryRequest(BaseModel):
    """Request for user categorization."""
    total_income: float = Field(gt=0, description="Total monthly income")
    total_expenses: float = Field(gt=0, description="Total monthly expenses")
    fixed_costs: float = Field(ge=0, description="Sum of rent, loans, insurance, utilities, education")
    discretionary_costs: float = Field(ge=0, description="Sum of food, transport, entertainment, shopping")


@app.post("/api/v1/categorize-user")
async def categorize_user_endpoint(request: UserCategoryRequest) -> dict:
    """
    Categorize a user into spending profiles using K-Means clustering.
    Matches the updated model trained on aggregated user profiles.
    """
    
    if categorization_model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Categorization model not available. Please run the POC notebook first."
        )
    
    try:
        # Extract model components
        kmeans = categorization_model['kmeans']
        scaler = categorization_model['scaler']
        cluster_labels = categorization_model['cluster_labels']
        
        # Calculate derived features matching the notebook
        savings_rate = (request.total_income - request.total_expenses) / max(request.total_income, 1)
        fixed_cost_ratio = request.fixed_costs / max(request.total_expenses, 1)
        discretionary_cost_ratio = request.discretionary_costs / max(request.total_expenses, 1)
        
        # Create feature vector [total_income, total_expenses, savings_rate, fixed_cost_ratio, discretionary_cost_ratio]
        features = np.array([[
            request.total_income,
            request.total_expenses,
            savings_rate,
            fixed_cost_ratio,
            discretionary_cost_ratio
        ]])
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Predict cluster
        cluster = int(kmeans.predict(features_scaled)[0])
        
        # Get category
        category = cluster_labels[cluster]
        
        # Get category description
        category_descriptions = {
            'Super Saver': 'Excellent financial discipline! High savings rate (>40%).',
            'Smart Saver': 'Great job! You maintain good savings (>20%) and controlled spending.',
            'Balanced': 'Healthy balance between spending and saving.',
            'Big Spender': 'High spending relative to income. Savings are low.',
            'Wild Spender': 'Alert! Spending exceeds income or savings are dangerously low.'
        }
        
        # Calculate financial health score (0-100) based on savings rate and fixed cost ratio
        # Higher savings = better, Lower fixed costs = better flexibility
        base_score = min(100, max(0, int((savings_rate + 0.2) * 80)))
        flexibility_penalty = max(0, int((fixed_cost_ratio - 0.5) * 40)) # Penalty if fixed costs > 50%
        health_score = max(0, base_score - flexibility_penalty)
        
        return {
            "status": "success",
            "category": category,
            "cluster": cluster,
            "description": category_descriptions.get(category, "Category description not available"),
            "metrics": {
                "savings_rate": round(savings_rate, 3),
                "fixed_cost_ratio": round(fixed_cost_ratio, 2),
                "discretionary_cost_ratio": round(discretionary_cost_ratio, 2),
                "financial_health_score": health_score
            },
            "recommendations": _get_recommendations(category, savings_rate)
        }
    
    except Exception as e:
        logger.error(f"Categorization error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Categorization failed: {str(e)}"
        )


def _get_recommendations(category: str, savings_rate: float) -> List[str]:
    """Get personalized recommendations based on category."""
    recommendations = {
        'Super Saver': [
            "Consider investing your surplus savings (Bourse de Tunis, SICAVs)",
            "Review your insurance coverage to protect your wealth",
            "Consider making charitable contributions (Zakat/Sadaqah)"
        ],
        'Smart Saver': [
            "Keep up the good work! Aim for 6 months emergency fund",
            "Consider mid-term investments like 'Comptes Épargne Logement'",
            "Look for tax-saving opportunities (Assurance Vie)"
        ],
        'Balanced': [
            "Try to auto-transfer savings at the start of the month",
            "Review subscription services you might not use",
            "Aim to increase savings rate by 1% each month"
        ],
        'Big Spender': [
            "Track every millime spent for 30 days",
            "Identify the 'Latte Factor' - small daily expenses adding up",
            "Use the 50/30/20 rule: 50% Needs, 30% Wants, 20% Savings",
            "Avoid impulsively buying during sales/soldes"
        ],
        'Wild Spender': [
            "URGENT: Stop using credit cards/loans immediately",
            "Cut discretionary spending (Eating out, Entertainment) to zero",
            "Negotiate with creditors if you have debt",
            "Consider a side hustle for extra income"
        ]
    }
    
    defaults = ["Maintain healthy financial habits", "Track your expenses regularly"]
    return recommendations.get(category, defaults)


@app.get("/api/v1/categorize-user/demo")
async def categorize_user_demo(user_id: str = "demo_user") -> dict:
    """
    Demo endpoint: Categorize a user based on mock profile data.
    """
    
    # Generate mock profile data compatible with new schema
    # Randomly assign a profile type for variety
    profile_type = np.random.choice(['saver', 'balanced', 'spender'])
    
    income = 3000.0
    
    if profile_type == 'saver':
        expenses = income * np.random.uniform(0.4, 0.6)
        fixed_ratio = 0.4
    elif profile_type == 'balanced':
        expenses = income * np.random.uniform(0.7, 0.9)
        fixed_ratio = 0.5
    else:
        expenses = income * np.random.uniform(0.95, 1.2)
        fixed_ratio = 0.6
        
    fixed_costs = expenses * fixed_ratio
    discretionary_costs = expenses * (1 - fixed_ratio)
    
    request = UserCategoryRequest(
        total_income=round(income, 2),
        total_expenses=round(expenses, 2),
        fixed_costs=round(fixed_costs, 2),
        discretionary_costs=round(discretionary_costs, 2)
    )
    
    result = await categorize_user_endpoint(request)
    
    result['user_data'] = {
        'user_id': user_id,
        'profile_type_simulated': profile_type,
        'income': request.total_income,
        'expenses': request.total_expenses
    }
    
    return result


class ForecastRequest(BaseModel):
    """Request for Prophet-based forecasting."""
    transactions: List[Transaction]
    forecast_days: int = Field(default=90, ge=1, le=365)
    include_holidays: bool = Field(default=True)


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
mock_transactions_db: dict[str, List[dict]] = {}

# Load categorization model (will be created after running notebook)
categorization_model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'user_category_model.pkl')

try:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            categorization_model = pickle.load(f)
        logger.info("✓ User categorization model loaded successfully")
    else:
        logger.warning("⚠ User categorization model not found. Run POC notebook first.")
except Exception as e:
    logger.error(f"Error loading categorization model: {e}")


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

# Tunisian Holidays for Prophet
TUNISIAN_HOLIDAYS = pd.DataFrame([
    {'holiday': 'Ramadan', 'ds': pd.to_datetime('2024-03-11'), 'lower_window': 0, 'upper_window': 30},
    {'holiday': 'Eid_al_Fitr', 'ds': pd.to_datetime('2024-04-10'), 'lower_window': 0, 'upper_window': 3},
    {'holiday': 'Eid_al_Adha', 'ds': pd.to_datetime('2024-06-16'), 'lower_window': 0, 'upper_window': 4},
    {'holiday': 'Back_to_School', 'ds': pd.to_datetime('2024-09-15'), 'lower_window': -7, 'upper_window': 7},
    {'holiday': 'Summer_Period', 'ds': pd.to_datetime('2024-07-01'), 'lower_window': 0, 'upper_window': 60},
    {'holiday': 'New_Year', 'ds': pd.to_datetime('2024-01-01'), 'lower_window': 0, 'upper_window': 1},
])


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


def generate_mock_transactions(user_id: str, num_days: int = 365) -> List[dict]:
    """Generate realistic mock transaction data for a user in Tunisian Dinars (TND)."""
    # Use deterministic seed for consistent demo data per user
    seed_val = int(hash(user_id) % 2**32)
    np.random.seed(seed_val)
    
    transactions = []
    end_date = datetime.now()
    start_date = end_date - timedelta(days=num_days)
    
    # 1. Monthly Recurring (Income & Bills)
    # -------------------------------------
    current = start_date
    while current <= end_date:
        # Salary (Income): 1200 - 2500 TND around 25th-28th
        if current.day == 26:
            salary = np.random.uniform(1800, 2200)
            transactions.append({
                "date": current.isoformat(),
                "category": "Salary",
                "amount": round(salary, 2),
                "type": "income"
            })
            
        # Rent (Expense): 500 - 900 TND around 1st-3rd
        if current.day == 2:
            rent = np.random.uniform(600, 800)
            transactions.append({
                "date": current.isoformat(),
                "category": "Rent",
                "amount": round(rent, 2),
                "type": "expense"
            })
            
        # Utilities (Expense): 80 - 150 TND around 10th
        if current.day == 10:
            util = np.random.uniform(80, 150)
            transactions.append({
                "date": current.isoformat(),
                "category": "Utilities",
                "amount": round(util, 2),
                "type": "expense"
            })
            
        current += timedelta(days=1)

    # 2. Daily Variable Expenses
    # --------------------------
    for day in range(num_days):
        current_date = start_date + timedelta(days=day)
        month = current_date.month
        
        # Seasonal Multiplier (e.g., Ramadan, Summer)
        multiplier = MONTHLY_MULTIPLIERS.get(month, 1.0)
        
        # Variable Expense Probability: 70% chance of spending each day
        if np.random.random() < 0.7:
            # Coffee/Food: 5 - 25 TND
            if np.random.random() < 0.6:
                amount = np.random.uniform(5, 25) * multiplier
                category = "Food & Drink"
            # Transport: 2 - 15 TND
            elif np.random.random() < 0.3:
                amount = np.random.uniform(2, 15) * multiplier
                category = "Transport"
            # Grocery Run: 40 - 120 TND (less frequent)
            else:
                amount = np.random.uniform(40, 120) * multiplier
                category = "Groceries"
                
            transactions.append({
                "date": current_date.isoformat(),
                "category": category,
                "amount": round(amount, 2),
                "type": "expense"
            })

    # 3. Occasional Expenses (Weekly/Bi-weekly)
    # -----------------------------------------
    # Entertainment / Shopping
    current = start_date
    while current <= end_date:
        # Every weekend (Friday/Saturday)
        if current.weekday() in [4, 5]: 
            if np.random.random() < 0.5: # 50% chance on weekends
                amount = np.random.uniform(50, 200)
                transactions.append({
                    "date": current.isoformat(),
                    "category": "Entertainment",
                    "amount": round(amount, 2),
                    "type": "expense"
                })
        current += timedelta(days=1)

    # Sort by date
    transactions.sort(key=lambda x: x["date"])
    
    return transactions


def forecast_with_prophet(
    transactions: List[Transaction], 
    forecast_days: int = 90,
    include_holidays: bool = True
) -> dict[str, Any]:
    """Use Prophet to forecast future EXPENSES only."""
    
    # 1. Filter & Prepare Data
    # Only keep expenses. Income confuses the expense forecast model.
    expense_data = []
    for trans in transactions:
        if trans.type == 'expense':
            # Ensure date is date-only for daily aggregation
            date_only = trans.date.date() if isinstance(trans.date, datetime) else trans.date
            expense_data.append({
                'ds': date_only,
                'y': trans.amount 
            })
            
    if not expense_data:
        # Fallback if no expenses
        return {
            "forecast_period_days": forecast_days,
            "predictions": [],
            "summary": {"total": 0, "avg": 0, "msg": "No expense data found"},
            "model_info": {}
        }
    
    df = pd.DataFrame(expense_data)
    
    # 2. Aggregate by Day (Sum daily expenses)
    df_daily = df.groupby('ds')['y'].sum().reset_index()
    df_daily = df_daily.sort_values('ds')
    
    # Check data duration
    data_duration_days = (df_daily['ds'].max() - df_daily['ds'].min()).days
    
    # 3. Configure Prophet
    # Yearly seasonality needs at least 1-2 years of data
    use_yearly = True if data_duration_days > 365 else False
    
    model = Prophet(
        yearly_seasonality=use_yearly,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_mode='multiplicative' # Expenses often scale with trend
    )
    
    # 4. Add Holidays
    if include_holidays:
        try:
            model.add_country_holidays(country_name='TN')
        except:
            pass # Fallback if TN holidays not supported in installed py-holidays ver
    
    # 5. Fit & Predict
    model.fit(df_daily)
    
    future = model.make_future_dataframe(periods=forecast_days)
    forecast = model.predict(future)
    
    # 6. Extract & Format Results
    last_date = df_daily['ds'].max()
    # Ensure comparsion works (timestamps)
    last_date_ts = pd.Timestamp(last_date)
    forecast_future = forecast[forecast['ds'] > last_date_ts].copy()
    
    predictions = []
    for _, row in forecast_future.iterrows():
        # Clamp negative predictions to 0
        predicted_val = max(0, row['yhat'])
        
        predictions.append({
            "date": row['ds'].strftime('%Y-%m-%d'),
            "predicted_amount": round(predicted_val, 2),
            "lower_bound": round(max(0, row['yhat_lower']), 2),
            "upper_bound": round(max(0, row['yhat_upper']), 2),
            "trend": round(row['trend'], 2),
        })
    
    # Summary stats
    if predictions:
        total_predicted = sum(p['predicted_amount'] for p in predictions)
        avg_daily = total_predicted / len(predictions)
        
        # High expense threshold (rent days etc)
        high_expense_days = [
            p for p in predictions 
            if p['predicted_amount'] > avg_daily * 2.0
        ]
    else:
        total_predicted = 0
        avg_daily = 0
        high_expense_days = []
    
    return {
        "forecast_period_days": forecast_days,
        "predictions": predictions,
        "summary": {
            "total_predicted_expenses": round(total_predicted, 2),
            "average_daily_expense": round(avg_daily, 2),
            "high_expense_days_count": len(high_expense_days),
            "high_expense_days": [p['date'] for p in high_expense_days[:10]],
        },
        "model_info": {
            "training_days": data_duration_days,
            "yearly_seasonality": use_yearly,
            "forecast_start": predictions[0]['date'] if predictions else None
        }
    }


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


@app.get("/api/v1/mock-data/{user_id}")
async def get_mock_data(user_id: str, days: int = 365) -> dict:
    """Generate and return mock transaction data for a user."""
    if user_id not in mock_transactions_db:
        mock_transactions_db[user_id] = generate_mock_transactions(user_id, days)
    
    return {
        "user_id": user_id,
        "transaction_count": len(mock_transactions_db[user_id]),
        "transactions": mock_transactions_db[user_id],
        "date_range": {
            "start": mock_transactions_db[user_id][0]["date"],
            "end": mock_transactions_db[user_id][-1]["date"],
        }
    }


@app.post("/api/v1/forecast")
async def create_forecast(request: ForecastRequest) -> dict:
    """Generate Prophet-based forecast for future expenses."""
    
    if not request.transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one transaction is required for forecasting"
        )
    
    try:
        forecast_result = forecast_with_prophet(
            request.transactions,
            request.forecast_days,
            request.include_holidays
        )
        
        return {
            "status": "success",
            "forecast": forecast_result,
            "request_info": {
                "input_transactions": len(request.transactions),
                "forecast_days": request.forecast_days,
                "holidays_included": request.include_holidays,
            }
        }
    
    except Exception as e:
        logger.error(f"Forecasting error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecasting failed: {str(e)}"
        )


@app.get("/api/v1/forecast/demo")
async def get_demo_forecast(
    user_id: str = "demo_user",
    forecast_days: int = 90,
    include_holidays: bool = True
) -> dict:
    """
    Get a demo forecast using pre-generated 3-month transaction data.
    Perfect for frontend integration without needing to POST data.
    
    Query Parameters:
    - user_id: User identifier (default: demo_user)
    - forecast_days: Number of days to forecast (default: 90, max: 365)
    - include_holidays: Include Tunisian holidays in forecast (default: true)
    """
    
    # Generate or retrieve mock data for the user
    if user_id not in mock_transactions_db:
        mock_transactions_db[user_id] = generate_mock_transactions(user_id, num_days=90)
    
    # Convert dict transactions to Transaction objects
    transactions = [
        Transaction(
            date=datetime.fromisoformat(t["date"]),
            category=t["category"],
            amount=t["amount"],
            type=t["type"]
        )
        for t in mock_transactions_db[user_id]
    ]
    
    try:
        forecast_result = forecast_with_prophet(
            transactions,
            forecast_days,
            include_holidays
        )
        
        return {
            "status": "success",
            "user_id": user_id,
            "forecast": forecast_result,
            "input_data": {
                "transaction_count": len(transactions),
                "date_range": {
                    "start": mock_transactions_db[user_id][0]["date"],
                    "end": mock_transactions_db[user_id][-1]["date"],
                },
                "forecast_days": forecast_days,
                "holidays_included": include_holidays,
            }
        }
    
    except Exception as e:
        logger.error(f"Demo forecasting error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecasting failed: {str(e)}"
        )


# ============================================================================
# RUN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
