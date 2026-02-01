import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from .db_utils import get_db_connection

# ==============================================================================
# READINESS SCORE ENGINE
# ==============================================================================

def calculate_readiness_score_logic(user_id: str, upcoming_event_cost: float = 0.0) -> dict:
    """
    Computes a 0-100 readiness score based on 6 key financial components.
    """
    conn = get_db_connection()
    
    # 1. Fetch User Data
    user_row = conn.execute("SELECT * FROM clients WHERE id = ?", (user_id,)).fetchone()
    if not user_row:
        return {"error": "User not found"}
        
    # Get last 6 months transactions for behaviour analysis
    query = """
    SELECT * FROM transactions 
    WHERE user_id = ? 
    AND date >= date('now', '-6 months')
    """
    df = pd.read_sql_query(query, conn, params=(user_id,))
    conn.close()
    
    if df.empty:
        # Default fallback for empty history
        return {"score": 0, "components": [], "explanation": "No transaction history."}

    # Data Prep
    df['amount'] = pd.to_numeric(df['amount'])
    df['date'] = pd.to_datetime(df['date'])
    
    monthly_income = user_row['monthly_income']
    current_balance = user_row['current_balance']
    
    # Calculate Monthly Metrics
    df['month'] = df['date'].dt.to_period('M')
    monthly_stats = df.groupby(['month', 'type'])['amount'].sum().unstack(fill_value=0)
    
    if 'expense' not in monthly_stats.columns: monthly_stats['expense'] = 0
    if 'income' not in monthly_stats.columns: monthly_stats['income'] = 0
    
    avg_monthly_expenses = monthly_stats['expense'].mean() if not monthly_stats.empty else 0
    avg_monthly_income = monthly_stats['income'].mean() if not monthly_stats.empty else monthly_income # Fallback
    
    # --- COMPONENT 1: Liquidity (30%) ---
    # Metric: Months of Buffer
    months_of_buffer = current_balance / max(1, avg_monthly_expenses)
    # Score: 0 months -> 0, 6+ months -> 100
    liquidity_score = min(100, (months_of_buffer / 6) * 100)
    
    # --- COMPONENT 2: Savings Behavior (20%) ---
    # Metric: Savings Rate
    # (Income - Expense) / Income
    net_savings = avg_monthly_income - avg_monthly_expenses
    savings_rate = net_savings / max(1, avg_monthly_income)
    # Score: 0% -> 0, 20% -> 100
    savings_score = min(100, max(0, (savings_rate / 0.20) * 100))
    
    # --- COMPONENT 3: Income Stability (15%) ---
    # Metric: Income Std Dev / Mean
    income_std = monthly_stats['income'].std()
    income_cv = income_std / max(1, avg_monthly_income) if len(monthly_stats) > 1 else 0
    # Score: 0 CV -> 100, 0.5 CV -> 0
    income_stab_score = max(0, 100 - (income_cv * 200))
    
    # --- COMPONENT 4: Expense Volatility (10%) ---
    expense_std = monthly_stats['expense'].std()
    expense_cv = expense_std / max(1, avg_monthly_expenses) if len(monthly_stats) > 1 else 0
    expense_vol_score = max(0, 100 - (expense_cv * 150))
    
    # --- COMPONENT 5: Event Exposure (15%) ---
    # Metric: Event Cost / Monthly Income
    # If cost is 0 -> 100 score. If cost is 3x income -> 0 score.
    exposure_ratio = upcoming_event_cost / max(1, avg_monthly_income)
    exposure_score = max(0, 100 - (exposure_ratio * 33)) # 3x income = 0
    
    # --- COMPONENT 6: Debt Load (10%) ---
    # Mock Debt (using 0 for now as we don't have explicit debt table yet)
    # TODO: Add debt table
    debt_score = 80 # Default OK
    
    # --- WEIGHTED SUM ---
    final_score = (
        liquidity_score * 0.30 +
        savings_score * 0.20 +
        income_stab_score * 0.15 +
        expense_vol_score * 0.10 +
        exposure_score * 0.15 +
        debt_score * 0.10
    )
    
    components = [
        {"name": "Liquidity", "score": round(liquidity_score), "value": f"{months_of_buffer:.1f} months"},
        {"name": "Savings", "score": round(savings_score), "value": f"{savings_rate*100:.1f}% rate"},
        {"name": "Income Stability", "score": round(income_stab_score), "value": "Stable" if income_cv < 0.1 else "Volatile"},
        {"name": "Expense Control", "score": round(expense_vol_score), "value": "Good" if expense_cv < 0.2 else "Variable"},
        {"name": "Event Exposure", "score": round(exposure_score), "value": f"{exposure_ratio:.1f}x Income"},
        {"name": "Debt Load", "score": round(debt_score), "value": "Low"}
    ]
    
    # Generate Explanation
    drivers = sorted(components, key=lambda x: x['score'])
    worst_driver = drivers[0]
    best_driver = drivers[-1]
    
    explanation = f"Readiness is {int(final_score)}/100. Main drag is {worst_driver['name']} ({worst_driver['value']}). Strongest point is {best_driver['name']}."
    
    return {
        "score": int(final_score),
        "components": components,
        "explanation": explanation,
        "metrics": {
            "months_of_buffer": round(months_of_buffer, 2),
            "savings_rate": round(savings_rate, 2),
            "upcoming_event_cost": upcoming_event_cost
        }
    }

# ==============================================================================
# ADVISOR CLASSIFICATION
# ==============================================================================

def classify_client_logic(metrics: dict) -> dict:
    """
    Classifies client into 5 behavioral categories based on metrics.
    """
    buffer = metrics.get('months_of_buffer', 0)
    savings = metrics.get('savings_rate', 0)
    
    # Deterministic Rules
    if buffer >= 6 and savings >= 0.15:
        category = "Smart Saver"
        color = "green"
    elif buffer >= 3 and savings >= 0.05:
        category = "Balanced"
        color = "blue"
    elif buffer >= 1:
        category = "High Spender"
        color = "orange"
    elif buffer > 0:
        category = "Power Spender"
        color = "red"
    else:
        category = "Ultra Spender"
        color = "darkred"
        
    return {"category": category, "color": color}

# ==============================================================================
# STRESS TEST SIMULATION (Monte Carlo)
# ==============================================================================

def run_stress_test_logic(user_id: str, scenario: str, horizon_months: int = 12, n_sim: int = 100):
    """
    Runs a Monte Carlo simulation for user balance.
    """
    conn = get_db_connection()
    user_row = conn.execute("SELECT * FROM clients WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    
    if not user_row:
        return {"error": "User not found"}
        
    start_balance = user_row['current_balance']
    monthly_income = user_row['monthly_income']
    
    # Base Parameters (Mocked derived from history in real app)
    avg_expense = monthly_income * 0.8 # Assume 80% spend
    expense_std = avg_expense * 0.1
    
    # Scenario Adjustments
    income_multiplier = 1.0
    expense_multiplier = 1.0
    shock_one_time = 0
    
    if scenario == "job_loss_3m":
        # No income for first 3 months
        income_multiplier_array = [0, 0, 0] + [1.0] * (horizon_months - 3)
    elif scenario == "inflation":
        expense_multiplier = 1.15
        income_multiplier_array = [1.0] * horizon_months
    elif scenario == "medical_emergency":
        shock_one_time = 2000
        income_multiplier_array = [1.0] * horizon_months
    else:
        income_multiplier_array = [1.0] * horizon_months
        
    # Simulation Arrays [Sims, Months]
    sim_results = np.zeros((n_sim, horizon_months + 1))
    sim_results[:, 0] = start_balance
    
    for month in range(1, horizon_months + 1):
        # Monthly Income with noise
        inc = np.random.normal(monthly_income, monthly_income*0.05, n_sim) * income_multiplier_array[month-1]
        
        # Monthly Expense with noise
        exp = np.random.normal(avg_expense, expense_std, n_sim) * expense_multiplier
        
        if month == 1:
            exp += shock_one_time
            
        # Update Balance
        sim_results[:, month] = sim_results[:, month-1] + inc - exp
        
    # Analysis
    final_balances = sim_results[:, -1]
    prob_negative = np.mean(np.min(sim_results, axis=1) < 0)
    
    # Percentiles for graph
    p10 = np.percentile(sim_results, 10, axis=0)
    p50 = np.percentile(sim_results, 50, axis=0) # Median
    p90 = np.percentile(sim_results, 90, axis=0)
    
    # Recommendations
    actions = []
    if prob_negative > 0.2:
        needed_save = (avg_expense - monthly_income * 0.5) # Dummy logic
        actions.append(f"Reduce spending by {int(needed_save/2)} TND/month to drop risk.")
    
    return {
        "scenario": scenario,
        "horizon_months": horizon_months,
        "prob_negative": round(prob_negative * 100, 1),
        "median_end_balance": round(p50[-1], 2),
        "timeline": {
            "months": list(range(horizon_months + 1)),
            "p10": list(np.round(p10, 2)),
            "p50": list(np.round(p50, 2)),
            "p90": list(np.round(p90, 2))
        },
        "actions": actions
    }
