# WeHelp - Financial Digital Twin

A personalized financial prediction system for Tunisian users.

## Overview

WeHelp creates a **Financial Digital Twin** - a personalized financial model that understands spending patterns and enables what-if simulations for informed financial decisions.

## Components

| Component | Description |
|-----------|-------------|
| `financial_twin_api/` | REST API for digital twin creation, forecasting, and simulations |
| `financial_twin_analysis.ipynb` | Dataset exploration and behavioral modeling |

## Quick Start

```bash
cd financial_twin_api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run API
python -m uvicorn app.simple_main:app --reload

# Run tests
python -m pytest tests/ -v
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/twins` | Create digital twin |
| `GET /api/v1/twins/{id}/forecast` | 12-month cash flow forecast |
| `POST /api/v1/twins/{id}/simulate` | What-if scenario simulation |
| `POST /api/v1/twins/{id}/recommend-loan` | Loan affordability check |

## Tech Stack

- **FastAPI** + **Pydantic** - API
- **Pandas** + **Scikit-learn** - ML
- **NumPy** - Computations

## License

MIT