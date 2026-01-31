# Financial Digital Twin API

**Personalized financial predictions for Tunisian users** - A hackathon demo project.

## Features

- **Digital Twin Creation** - Generate a personalized financial model from user profile
- **Cash Flow Forecasting** - 12-month predictions with Tunisian seasonal patterns
- **What-If Scenarios** - Simulate income changes, expense adjustments, and loans
- **Loan Recommendations** - Affordability analysis with timing advice
- **Tunisian Context** - Ramadan, Eid al-Fitr, Eid al-Adha, Summer, Back-to-school patterns

## Quick Start

```bash
# Create virtual environment with uv
uv venv .venv
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Run demo
python demo.py

# Start API server
python -m uvicorn app.simple_main:app --reload
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/api/v1/twins` | POST | Create digital twin |
| `/api/v1/twins/{id}` | GET | Get digital twin |
| `/api/v1/twins/{id}/forecast` | GET | Cash flow forecast |
| `/api/v1/twins/{id}/simulate` | POST | Run what-if scenario |
| `/api/v1/twins/{id}/recommend-loan` | POST | Get loan recommendations |
| `/api/v1/context/tunisia` | GET | Tunisian financial context |

## Example Usage

### Create a Digital Twin

```bash
curl -X POST http://localhost:8000/api/v1/twins \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "ahmed",
    "age": 35,
    "occupation": "engineer",
    "city": "tunis",
    "monthly_income": 2500,
    "dependents": 2
  }'
```

### Get Cash Flow Forecast

```bash
curl http://localhost:8000/api/v1/twins/ahmed/forecast?months=12
```

### Simulate a Loan

```bash
curl -X POST http://localhost:8000/api/v1/twins/ahmed/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "new_loan_amount": 5000,
    "loan_term_months": 24,
    "horizon_months": 12
  }'
```

### Get Loan Recommendation

```bash
curl -X POST http://localhost:8000/api/v1/twins/ahmed/recommend-loan \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Emergency Fund",
    "amount_needed": 3000,
    "urgency": "soon"
  }'
```

## Tunisian Seasonal Patterns

The API accounts for major Tunisian financial events:

| Month | Event | Spending Multiplier |
|-------|-------|---------------------|
| March | Ramadan | 1.4x |
| April | Eid al-Fitr | 1.6x |
| June | Eid al-Adha | 1.5x |
| July-Aug | Summer Holidays | 1.3-1.4x |
| September | Back to School | 1.6x |
| December | Year End | 1.2x |

## Running Tests

```bash
python -m pytest tests/test_simple.py -v
```

## Project Structure

```
financial_twin_api/
├── app/
│   └── simple_main.py    # Simplified API (single file)
├── tests/
│   └── test_simple.py    # Unit & API tests
├── demo.py               # Demo script
├── requirements.txt      # Dependencies
└── README.md
```

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation
- **NumPy** - Numerical computations
- **uv** - Fast Python package installer

## License

MIT
