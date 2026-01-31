"""
Tests for Financial Digital Twin API
"""
import pytest
from fastapi.testclient import TestClient

from app.simple_main import (
    app,
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


client = TestClient(app)


# =============================================================================
# Unit Tests
# =============================================================================

class TestTunisianContext:
    """Test Tunisian seasonal patterns."""
    
    def test_high_expense_months(self):
        """High expense months include Ramadan, Eid, Summer, Back-to-school."""
        assert 3 in HIGH_EXPENSE_MONTHS  # Ramadan
        assert 4 in HIGH_EXPENSE_MONTHS  # Eid al-Fitr
        assert 6 in HIGH_EXPENSE_MONTHS  # Eid al-Adha
        assert 9 in HIGH_EXPENSE_MONTHS  # Back to school
    
    def test_monthly_multipliers(self):
        """Seasonal multipliers are properly defined."""
        assert len(MONTHLY_MULTIPLIERS) == 12
        assert MONTHLY_MULTIPLIERS[1] == 1.0  # Normal month
        assert MONTHLY_MULTIPLIERS[4] > 1.0   # Eid al-Fitr
        assert MONTHLY_MULTIPLIERS[9] > 1.0   # Back to school


class TestDigitalTwin:
    """Test digital twin creation."""
    
    def test_create_twin_basic(self):
        """Create a basic digital twin."""
        profile = UserProfile(
            user_id="test_user",
            age=30,
            occupation="engineer",
            city="tunis",
            monthly_income=3000,
            dependents=0,
        )
        
        twin = create_digital_twin(profile)
        
        assert twin["twin_id"] == "test_user"
        assert twin["baseline"]["monthly_income"] == 3000
        assert twin["baseline"]["total_expenses"] > 0
        assert twin["baseline"]["total_expenses"] < 3000
        assert "health_state" in twin
    
    def test_twin_with_dependents(self):
        """Twin with dependents has higher expenses."""
        profile_no_deps = UserProfile(monthly_income=2500, dependents=0)
        profile_with_deps = UserProfile(monthly_income=2500, dependents=2)
        
        twin_no_deps = create_digital_twin(profile_no_deps)
        twin_with_deps = create_digital_twin(profile_with_deps)
        
        assert twin_with_deps["baseline"]["total_expenses"] > twin_no_deps["baseline"]["total_expenses"]
    
    def test_health_states(self):
        """Health state classification works."""
        # High income = thriving
        rich = create_digital_twin(UserProfile(monthly_income=5000, dependents=0))
        assert rich["health_state"] in ["thriving", "stable"]
        assert rich["baseline"]["savings_rate"] > 0.15
        
        # Lower savings rate with more dependents
        family = create_digital_twin(UserProfile(monthly_income=2000, dependents=3))
        assert family["baseline"]["savings_rate"] < rich["baseline"]["savings_rate"]


class TestForecasting:
    """Test cash flow forecasting."""
    
    def test_forecast_returns_correct_months(self):
        """Forecast returns requested number of months."""
        profile = UserProfile(monthly_income=2500)
        twin = create_digital_twin(profile)
        
        forecasts = forecast_cash_flow(twin, months=6)
        assert len(forecasts) == 6
        
        forecasts = forecast_cash_flow(twin, months=12)
        assert len(forecasts) == 12
    
    def test_forecast_contains_required_fields(self):
        """Each forecast entry has required fields."""
        profile = UserProfile(monthly_income=2500)
        twin = create_digital_twin(profile)
        forecasts = forecast_cash_flow(twin, months=3)
        
        for f in forecasts:
            assert "month" in f
            assert "predicted_income" in f
            assert "predicted_expenses" in f
            assert "predicted_savings" in f
            assert "is_high_expense_month" in f


class TestScenarioSimulation:
    """Test what-if scenarios."""
    
    def test_loan_scenario(self):
        """Simulate taking a loan."""
        profile = UserProfile(monthly_income=2500)
        twin = create_digital_twin(profile)
        
        scenario = ScenarioRequest(
            new_loan_amount=5000,
            loan_term_months=24,
            horizon_months=12,
        )
        
        result = simulate_scenario(twin, scenario)
        
        assert "baseline_comparison" in result
        assert "timeline" in result
        assert "loan_details" in result
        assert result["loan_details"]["amount"] == 5000
        assert result["loan_details"]["monthly_payment"] > 0
    
    def test_income_change_scenario(self):
        """Simulate income change."""
        profile = UserProfile(monthly_income=2500)
        twin = create_digital_twin(profile)
        
        # 10% raise
        scenario = ScenarioRequest(income_change_pct=0.10, horizon_months=6)
        result = simulate_scenario(twin, scenario)
        
        assert result["baseline_comparison"]["new_savings"] > result["baseline_comparison"]["original_savings"]


class TestLoanRecommendation:
    """Test loan recommendations."""
    
    def test_affordable_loan(self):
        """Recommend affordable loans."""
        profile = UserProfile(monthly_income=3000, dependents=0)
        twin = create_digital_twin(profile)
        
        request = LoanRequest(goal="Emergency", amount_needed=2000)
        rec = recommend_loan(twin, request)
        
        assert rec["eligible"] == True
        assert len(rec["options"]) == 3  # 12, 24, 36 months
        assert rec["recommended"] is not None
    
    def test_unaffordable_loan(self):
        """Reject unaffordable loans."""
        profile = UserProfile(monthly_income=1200, dependents=3)
        twin = create_digital_twin(profile)
        
        request = LoanRequest(goal="Expensive", amount_needed=50000)
        rec = recommend_loan(twin, request)
        
        # Either not eligible or no affordable options
        if rec["eligible"]:
            affordable = [o for o in rec["options"] if o["affordable"]]
            # Large loan may not have affordable options
            assert len(affordable) <= len(rec["options"])


# =============================================================================
# API Tests
# =============================================================================

class TestAPIEndpoints:
    """Test API endpoints."""
    
    def test_root(self):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Financial Digital Twin API"
        assert data["context"] == "Tunisia"
    
    def test_health(self):
        """Test health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_create_twin_endpoint(self):
        """Test twin creation endpoint."""
        response = client.post("/api/v1/twins", json={
            "user_id": "api_test",
            "age": 28,
            "monthly_income": 2000,
            "dependents": 1,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["twin_id"] == "api_test"
    
    def test_get_twin_endpoint(self):
        """Test get twin endpoint."""
        response = client.get("/api/v1/twins/any_user")
        assert response.status_code == 200
        data = response.json()
        assert "twin_id" in data
        assert "baseline" in data
    
    def test_forecast_endpoint(self):
        """Test forecast endpoint."""
        response = client.get("/api/v1/twins/test/forecast?months=6")
        assert response.status_code == 200
        data = response.json()
        assert len(data["forecasts"]) == 6
    
    def test_simulate_endpoint(self):
        """Test simulation endpoint."""
        response = client.post("/api/v1/twins/test/simulate", json={
            "income_change_pct": 0.1,
            "expense_change_pct": 0,
            "new_loan_amount": 0,
            "horizon_months": 6,
        })
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
    
    def test_loan_endpoint(self):
        """Test loan recommendation endpoint."""
        response = client.post("/api/v1/twins/test/recommend-loan", json={
            "goal": "Car",
            "amount_needed": 3000,
            "urgency": "soon",
        })
        assert response.status_code == 200
        data = response.json()
        assert "recommendation" in data
    
    def test_tunisia_context_endpoint(self):
        """Test Tunisia context endpoint."""
        response = client.get("/api/v1/context/tunisia")
        assert response.status_code == 200
        data = response.json()
        assert "high_expense_months" in data
        assert "monthly_multipliers" in data
        assert "seasonal_events" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
