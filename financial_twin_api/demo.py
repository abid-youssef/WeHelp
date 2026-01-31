#!/usr/bin/env python3
"""
Demo script for Financial Digital Twin API
Tests all endpoints with Tunisian context
"""

import asyncio
from datetime import datetime

# Import the app directly for testing
from app.simple_main import (
    create_digital_twin,
    forecast_cash_flow,
    simulate_scenario,
    recommend_loan,
    UserProfile,
    LoanRequest,
    ScenarioRequest,
    MONTHLY_MULTIPLIERS,
    HIGH_EXPENSE_MONTHS,
)


def print_section(title: str):
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def demo():
    """Run demo of all features."""
    
    print_section("FINANCIAL DIGITAL TWIN - TUNISIAN DEMO")
    print(f"Generated at: {datetime.now().isoformat()}")
    
    # -------------------------------------------------------------------------
    # 1. Create Digital Twin
    # -------------------------------------------------------------------------
    print_section("1. CREATE DIGITAL TWIN")
    
    profile = UserProfile(
        user_id="ahmed_demo",
        age=35,
        occupation="private_sector",
        city="tunis",
        monthly_income=2500.0,  # TND
        dependents=2,
    )
    
    twin = create_digital_twin(profile)
    
    print(f"User: {twin['twin_id']}")
    print(f"Profile: {profile.age} yo, {profile.occupation}, {profile.city}")
    print(f"Monthly Income: {twin['baseline']['monthly_income']} TND")
    print(f"Monthly Expenses: {twin['baseline']['total_expenses']} TND")
    print(f"Monthly Savings: {twin['baseline']['monthly_savings']} TND")
    print(f"Savings Rate: {twin['baseline']['savings_rate']:.1%}")
    print(f"Financial Health: {twin['health_state'].upper()}")
    
    print("\nExpense Breakdown:")
    for cat, amt in twin['baseline']['monthly_expenses'].items():
        pct = amt / twin['baseline']['monthly_income'] * 100
        print(f"  • {cat:15}: {amt:7.2f} TND ({pct:.1f}%)")
    
    # -------------------------------------------------------------------------
    # 2. Cash Flow Forecast
    # -------------------------------------------------------------------------
    print_section("2. 12-MONTH CASH FLOW FORECAST")
    
    forecasts = forecast_cash_flow(twin, months=12)
    
    print(f"{'Month':<10} {'Income':>10} {'Expenses':>10} {'Savings':>10} {'Event':<25}")
    print("-" * 65)
    
    for f in forecasts:
        event = f.get('seasonal_event') or ""
        marker = "⚠️" if f['is_high_expense_month'] else "  "
        print(f"{f['month']:<10} {f['predicted_income']:>10.0f} {f['predicted_expenses']:>10.0f} {f['predicted_savings']:>10.0f} {marker} {event:<25}")
    
    total_savings = sum(f['predicted_savings'] for f in forecasts)
    print("-" * 65)
    print(f"{'TOTAL':>32} {total_savings:>10.0f} TND")
    
    high_months = [f['month'] for f in forecasts if f['is_high_expense_month']]
    print(f"\n⚠️ High Expense Months: {', '.join(high_months)}")
    
    # -------------------------------------------------------------------------
    # 3. Tunisian Seasonal Patterns
    # -------------------------------------------------------------------------
    print_section("3. TUNISIAN SEASONAL PATTERNS")
    
    events = {
        3: "Ramadan",
        4: "Eid al-Fitr",
        6: "Eid al-Adha",
        7: "Summer Holidays",
        8: "Summer Holidays",
        9: "Back to School",
    }
    
    print("Monthly Spending Multipliers:")
    for month, mult in MONTHLY_MULTIPLIERS.items():
        event = events.get(month, "")
        bar = "█" * int(mult * 10)
        print(f"  {month:2d}: {mult:.1f}x {bar:<15} {event}")
    
    # -------------------------------------------------------------------------
    # 4. What-If Scenario
    # -------------------------------------------------------------------------
    print_section("4. WHAT-IF SCENARIO: NEW LOAN")
    
    scenario = ScenarioRequest(
        income_change_pct=0.0,
        expense_change_pct=0.0,
        new_loan_amount=5000,  # 5000 TND loan
        loan_term_months=24,
        horizon_months=12,
    )
    
    result = simulate_scenario(twin, scenario)
    
    print(f"Scenario: Take a 5,000 TND loan over 24 months")
    print(f"\nBaseline Comparison:")
    print(f"  Original Monthly Savings: {result['baseline_comparison']['original_savings']} TND")
    print(f"  New Monthly Savings: {result['baseline_comparison']['new_savings']} TND")
    print(f"  Difference: {result['baseline_comparison']['difference']} TND")
    
    if result['loan_details']:
        print(f"\nLoan Details:")
        print(f"  Amount: {result['loan_details']['amount']} TND")
        print(f"  Monthly Payment: {result['loan_details']['monthly_payment']} TND")
        print(f"  Total Cost: {result['loan_details']['total_cost']} TND")
    
    print(f"\nStress Test ({result['stress_test']['scenario']}):")
    print(f"  Monthly Surplus: {result['stress_test']['monthly_surplus']} TND")
    print(f"  Sustainable: {'✅ Yes' if result['stress_test']['sustainable'] else '❌ No'}")
    
    # -------------------------------------------------------------------------
    # 5. Loan Recommendation
    # -------------------------------------------------------------------------
    print_section("5. LOAN RECOMMENDATION")
    
    loan_req = LoanRequest(
        goal="Emergency Fund",
        amount_needed=3000,  # Affordable amount
        urgency="soon",
    )
    
    recommendation = recommend_loan(twin, loan_req)
    
    print(f"Eligible: {'✅ Yes' if recommendation['eligible'] else '❌ No'}")
    
    if recommendation['eligible']:
        print(f"Goal: {recommendation['goal']}")
        print(f"Amount Needed: {recommendation['amount_requested']} TND")
        print(f"Max Affordable Payment: {recommendation['max_affordable_payment']} TND/month")
        
        print("\nLoan Options:")
        for opt in recommendation['options']:
            status = "✅" if opt['affordable'] else "❌"
            print(f"  {status} {opt['term_months']:2d} months: {opt['monthly_payment']:>7.2f} TND/mo | Total: {opt['total_cost']:>8.2f} TND")
        
        if recommendation['recommended']:
            rec = recommendation['recommended']
            print(f"\n💡 Recommended: {rec['term_months']} months at {rec['monthly_payment']} TND/month")
        
        print(f"\nTiming Advice:")
        print(f"  ⚠️ Avoid months: {recommendation['timing_advice']['avoid_months']}")
        print(f"  Reason: {recommendation['timing_advice']['reason']}")
    else:
        print(f"Reason: {recommendation['reason']}")
        print(f"Recommendation: {recommendation['recommendation']}")
    
    # -------------------------------------------------------------------------
    # 6. Summary
    # -------------------------------------------------------------------------
    print_section("DEMO SUMMARY")
    
    print("✅ Digital Twin Created - Personalized financial model")
    print("✅ 12-Month Forecast - Seasonal patterns included")
    print("✅ Tunisian Context - Ramadan, Eid, Summer, Back-to-school")
    print("✅ Scenario Simulation - What-if analysis")
    print("✅ Loan Recommendation - Affordability + timing advice")
    
    print("\n" + "=" * 60)
    print(" Demo Complete!")
    print("=" * 60)


if __name__ == "__main__":
    demo()
