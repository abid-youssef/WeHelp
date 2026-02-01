"""
Cashflow Simulation Service
"""
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class CashflowSimulator:
    """
    Monte Carlo cashflow simulator for risk assessment
    """
    
    def __init__(
        self, 
        profile_data: Dict, 
        n_simulations: int = 100,
        horizon_months: int = 24
    ):
        """
        Initialize cashflow simulator
        
        Args:
            profile_data: User profile data
            n_simulations: Number of Monte Carlo simulations
            horizon_months: Forecast horizon in months
        """
        self.profile = profile_data
        self.n_simulations = n_simulations
        self.horizon_months = horizon_months
    
    def calculate_loan_payment(self) -> float:
        """Calculate monthly loan payment"""
        P = self.profile['loan_amount']
        r = self.profile['loan_interest_rate'] / 100 / 12
        n = self.profile['loan_duration_months']
        
        if r == 0:
            return P / n
        
        return P * (r * (1 + r)**n) / ((1 + r)**n - 1)
    
    def simulate_single_trajectory(self, seed: int = None) -> np.ndarray:
        """
        Simulate one possible cashflow trajectory
        
        Args:
            seed: Random seed for reproducibility
            
        Returns:
            Array of balance over time
        """
        if seed is not None:
            np.random.seed(seed)
        
        balance = np.zeros(self.horizon_months + 1)
        balance[0] = self.profile['current_balance']
        
        monthly_income = sum(s['amount'] for s in self.profile['income_streams'])
        loan_payment = self.calculate_loan_payment()
        
        for month in range(1, self.horizon_months + 1):
            # Income with reliability variation
            income = 0
            for stream in self.profile['income_streams']:
                reliability_factor = {
                    'high': (0.95, 1.05),
                    'medium': (0.80, 1.15),
                    'low': (0.60, 1.30)
                }
                low, high = reliability_factor[stream['reliability']]
                income += stream['amount'] * np.random.uniform(low, high)
            
            # Expenses with volatility and seasonality
            expenses = 0
            for exp_cat in self.profile['expenses']:
                current_month = month % 12 if month % 12 != 0 else 12
                seasonal_mult = exp_cat.get('seasonal_multipliers', {}).get(
                    current_month, 1.0
                )
                volatility = np.random.normal(1.0, exp_cat['volatility'])
                expenses += exp_cat['monthly_baseline'] * seasonal_mult * volatility
            
            # Recurring obligations
            obligations = sum(
                obl['monthly_amount'] 
                for obl in self.profile['obligations'] 
                if obl['remaining_months'] >= month
            )
            
            # Life events
            event_expense = 0
            current_month = month % 12 if month % 12 != 0 else 12
            for event in self.profile['life_events']:
                if current_month == event['start_month']:
                    event_expense += event['expense_impact']
            
            # Loan payment (only if within loan duration)
            loan_pmt = (
                loan_payment 
                if month <= self.profile['loan_duration_months'] 
                else 0
            )
            
            # Future income events
            future_income = 0
            for fut_inc in self.profile['future_incomes']:
                try:
                    event_date = datetime.strptime(
                        fut_inc['expected_date'], 
                        "%Y-%m-%d"
                    )
                    months_until = (event_date.year - 2026) * 12 + event_date.month - 1
                    if month == months_until:
                        conf_factor = {'high': 1.0, 'medium': 0.8, 'low': 0.6}
                        future_income += (
                            fut_inc['expected_amount'] * 
                            conf_factor[fut_inc['confidence']]
                        )
                except Exception as e:
                    logger.warning(f"Error processing future income: {e}")
            
            # Update balance
            net_cashflow = (
                income + future_income - 
                expenses - obligations - loan_pmt - event_expense
            )
            balance[month] = balance[month - 1] + net_cashflow
        
        return balance
    
    def run_monte_carlo(self) -> Dict[str, np.ndarray]:
        """
        Run Monte Carlo simulations
        
        Returns:
            Dictionary with trajectory statistics
        """
        trajectories = np.zeros((self.n_simulations, self.horizon_months + 1))
        
        for i in range(self.n_simulations):
            trajectories[i, :] = self.simulate_single_trajectory(seed=i)
        
        return {
            'trajectories': trajectories,
            'p10': np.percentile(trajectories, 10, axis=0),
            'p50': np.percentile(trajectories, 50, axis=0),
            'p90': np.percentile(trajectories, 90, axis=0),
            'mean': np.mean(trajectories, axis=0),
        }
    
    def calculate_stress_probability(
        self, 
        threshold: float = -500
    ) -> np.ndarray:
        """
        Calculate probability of balance falling below threshold
        
        Args:
            threshold: Balance threshold
            
        Returns:
            Array of stress probabilities for each month
        """
        results = self.run_monte_carlo()
        trajectories = results['trajectories']
        
        stress_prob = np.zeros(self.horizon_months + 1)
        for month in range(self.horizon_months + 1):
            stress_prob[month] = np.mean(trajectories[:, month] < threshold)
        
        return stress_prob
    
    def identify_default(
        self, 
        threshold: float = -500, 
        consecutive_months: int = 3
    ) -> bool:
        """
        Determine if profile defaults
        
        Args:
            threshold: Balance threshold
            consecutive_months: Number of consecutive months below threshold
            
        Returns:
            True if default detected, False otherwise
        """
        results = self.run_monte_carlo()
        median_trajectory = results['p50']
        
        consecutive_count = 0
        for balance in median_trajectory:
            if balance < threshold:
                consecutive_count += 1
                if consecutive_count >= consecutive_months:
                    return True
            else:
                consecutive_count = 0
        
        return False
    
    def get_cashflow_projection(self) -> List[Dict]:
        """
        Get formatted cashflow projection
        
        Returns:
            List of cashflow projections by month
        """
        results = self.run_monte_carlo()
        stress_prob = self.calculate_stress_probability()
        
        projection = []
        for month in range(self.horizon_months + 1):
            projection.append({
                'month': month,
                'p10': float(results['p10'][month]),
                'median': float(results['p50'][month]),
                'p90': float(results['p90'][month]),
                'stress_probability': float(stress_prob[month])
            })
        
        return projection
