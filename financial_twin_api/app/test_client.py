"""
Test client for Loan Risk Assessment API
"""
import requests
import json
from typing import Dict

# API base URL
BASE_URL = "http://localhost:8000/api/v1"


def test_health_check():
    """Test health check endpoint"""
    print("\n" + "="*50)
    print("Testing Health Check")
    print("="*50)
    
    response = requests.get("http://localhost:8000/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_model_info():
    """Test model info endpoint"""
    print("\n" + "="*50)
    print("Testing Model Info")
    print("="*50)
    
    response = requests.get(f"{BASE_URL}/loan/model-info")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def create_sample_request() -> Dict:
    """Create a sample loan request"""
    return {
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
            },
            {
                "category": "semi-fixed",
                "subcategory": "utilities",
                "monthly_baseline": 150.0,
                "seasonal_multipliers": {str(i): 1.0 for i in range(1, 13)},
                "volatility": 0.15
            }
        ],
        "obligations": [],
        "life_events": [],
        "future_incomes": [],
        "loan_amount": 15000.0,
        "loan_duration_months": 36,
        "loan_interest_rate": 9.5
    }


def test_quick_score():
    """Test quick score endpoint"""
    print("\n" + "="*50)
    print("Testing Quick Score")
    print("="*50)
    
    loan_data = create_sample_request()
    
    response = requests.post(
        f"{BASE_URL}/loan/quick-score",
        json=loan_data
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"\nRisk Score: {result['risk_score']:.1f}%")
        print(f"Risk Category: {result['risk_category']}")
        print(f"Recommendation: {result['recommendation']}")
        print(f"Default Probability: {result['default_probability']:.2%}")
    else:
        print(f"Error: {response.text}")


def test_full_assessment():
    """Test full assessment endpoint"""
    print("\n" + "="*50)
    print("Testing Full Assessment")
    print("="*50)
    
    loan_data = create_sample_request()
    
    response = requests.post(
        f"{BASE_URL}/loan/assess",
        json=loan_data
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        
        print(f"\n{'='*50}")
        print("OVERALL ASSESSMENT")
        print(f"{'='*50}")
        print(f"Risk Score: {result['risk_score']:.1f}%")
        print(f"Risk Category: {result['risk_category']}")
        print(f"Recommendation: {result['recommendation']}")
        
        print(f"\n{'='*50}")
        print("KEY METRICS")
        print(f"{'='*50}")
        print(f"Monthly Income: {result['monthly_income']:.2f} TND")
        print(f"Monthly Expenses: {result['monthly_expenses']:.2f} TND")
        print(f"Loan Payment: {result['monthly_loan_payment']:.2f} TND")
        print(f"Debt-to-Income: {result['debt_to_income_ratio']:.2%}")
        print(f"Net Cashflow: {result['net_monthly_cashflow']:.2f} TND")
        print(f"Buffer Months: {result['buffer_months']:.1f}")
        
        print(f"\n{'='*50}")
        print("RISK BREAKDOWN")
        print(f"{'='*50}")
        for breakdown in result['risk_breakdown']:
            status_emoji = {"good": "✓", "warning": "⚠", "critical": "✗"}
            emoji = status_emoji.get(breakdown['status'], "•")
            print(f"{emoji} {breakdown['category']}: {breakdown['score']:.0f}/100 ({breakdown['status']})")
        
        print(f"\n{'='*50}")
        print("TOP RISK DRIVERS")
        print(f"{'='*50}")
        for driver in result['top_risk_drivers'][:5]:
            print(f"• {driver['feature_name']}: {driver['shap_value']:.3f} (value: {driver['feature_value']:.2f})")
        
        print(f"\n{'='*50}")
        print("TOP PROTECTIVE FACTORS")
        print(f"{'='*50}")
        for factor in result['top_protective_factors'][:5]:
            print(f"• {factor['feature_name']}: {factor['shap_value']:.3f} (value: {factor['feature_value']:.2f})")
        
        if result['warnings']:
            print(f"\n{'='*50}")
            print("WARNINGS")
            print(f"{'='*50}")
            for warning in result['warnings']:
                print(f"⚠ {warning}")
        
        if result.get('recommendations_for_approval'):
            print(f"\n{'='*50}")
            print("RECOMMENDATIONS FOR APPROVAL")
            print(f"{'='*50}")
            for rec in result['recommendations_for_approval']:
                print(f"→ {rec}")
        
        print(f"\n{'='*50}")
        print("DEFAULT PROBABILITIES")
        print(f"{'='*50}")
        print(f"12 months: {result['default_probability_12_months']:.1%}")
        print(f"24 months: {result['default_probability_24_months']:.1%}")
    else:
        print(f"Error: {response.text}")


def test_explain():
    """Test explain endpoint"""
    print("\n" + "="*50)
    print("Testing Explain Endpoint")
    print("="*50)
    
    loan_data = create_sample_request()
    
    response = requests.post(
        f"{BASE_URL}/loan/explain",
        json=loan_data
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"\nRisk Score: {result['risk_score']:.1f}%")
        print("\nTop 5 Risk Drivers:")
        for driver in result['top_risk_drivers'][:5]:
            print(f"  • {driver['feature_name']}: {driver['shap_value']:.3f}")
    else:
        print(f"Error: {response.text}")


if __name__ == "__main__":
    print("\n" + "="*50)
    print("LOAN RISK ASSESSMENT API - TEST SUITE")
    print("="*50)
    
    try:
        # Run all tests
        test_health_check()
        test_model_info()
        test_quick_score()
        test_full_assessment()
        test_explain()
        
        print("\n" + "="*50)
        print("ALL TESTS COMPLETED")
        print("="*50 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n Error: Could not connect to API.")
        print("Make sure the server is running: uvicorn main:app --reload")
    except Exception as e:
        print(f"\n Error: {str(e)}")
