<p align="center">
  <img src="assets/twinSightLogo.png" alt="TwinSight Logo" width="200"/>
</p>

<h1 align="center">TwinSight - Financial Life Companion</h1>

<p align="center">
  AI-assisted banking that anticipates your financial future
</p>

<p align="center">
  <a href="http://34.155.235.146:3000/">
    <img src="https://img.shields.io/badge/Live%20Demo-View%20App-blue?style=for-the-badge" alt="Live Demo"/>
  </a>
</p>

---

## What is TwinSight?

TwinSight creates a **Digital Twin** of your financial life. Instead of showing static balances, it simulates how your finances evolve month-by-month accounting for income, expenses, life events (Ramadan, Eid, weddings, back-to-school), and unexpected shocks.

**For Users**: See your future balance, stress-test decisions, get actionable savings advice.  
**For Banks**: Better risk visibility, faster loan decisions, client segmentation.

---

## Repository Contents

| Component | Description |
|-----------|-------------|
| `FrontEnd/` | Next.js web application |
| `financial_twin_api/` | FastAPI backend for forecasting and simulations |
| `financial_twin_analysis.ipynb` | Dataset exploration and behavioral modeling |
| `POC_Prophet.ipynb` | Time-series forecasting with Prophet + Tunisian holidays |
| `POC_User_Categorization.ipynb` | User segmentation (5 spending profiles) |
| `loan_risk_breakdown_nb.ipynb` | Loan risk scoring and explainability |

---

## Quick Start

```bash
# Backend API
cd financial_twin_api
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend
cd FrontEnd
pnpm install && pnpm dev
```

---

## Google Cloud Resources

| Service | Usage |
|---------|-------|
| **Google Colab** | Notebook execution and model training |
| **Google Cloud Platform** | App deployment and hosting |

---

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Pydantic, NumPy
- **ML/Analysis**: Pandas, Scikit-learn, Prophet
- **Deployment**: Google Cloud Platform

---

## License

MIT