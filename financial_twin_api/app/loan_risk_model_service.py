"""
Model Service - Handles model loading and predictions
"""
import pickle
import numpy as np
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import shap

logger = logging.getLogger(__name__)


class ModelService:
    """
    Service for managing ML models and making predictions
    """
    
    def __init__(self, models_dir: str = "models"):
        """
        Initialize model service
        
        Args:
            models_dir: Directory containing model files
        """
        self.models_dir = Path(models_dir)
        self.model = None
        self.feature_columns = None
        self.shap_explainer = None
        self._loaded = False
    
    def load_models(self):
        """
        Load all required models and artifacts
        """
        try:
            # Load the trained model
            model_path = self.models_dir / "loan_risk_model.pkl"
            logger.info(f"Loading model from {model_path}")
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
            
            # Load feature columns
            features_path = self.models_dir / "feature_columns.pkl"
            logger.info(f"Loading feature columns from {features_path}")
            with open(features_path, 'rb') as f:
                self.feature_columns = pickle.load(f)
            
            # Load SHAP explainer
            shap_path = self.models_dir / "shap_explainer.pkl"
            logger.info(f"Loading SHAP explainer from {shap_path}")
            with open(shap_path, 'rb') as f:
                self.shap_explainer = pickle.load(f)
            
            self._loaded = True
            logger.info("All models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    def is_loaded(self) -> bool:
        """Check if models are loaded"""
        return self._loaded
    
    def extract_features(self, profile_data: Dict) -> Dict[str, float]:
        """
        Extract features from user profile data
        
        Args:
            profile_data: Dictionary containing user profile information
            
        Returns:
            Dictionary of features ready for model prediction
        """
        # Calculate derived metrics
        monthly_income = sum(stream['amount'] for stream in profile_data['income_streams'])
        monthly_expenses = sum(exp['monthly_baseline'] for exp in profile_data['expenses'])
        monthly_obligations = sum(obl['monthly_amount'] for obl in profile_data['obligations'])
        
        # Calculate loan payment using annuity formula
        P = profile_data['loan_amount']
        r = profile_data['loan_interest_rate'] / 100 / 12  # Monthly rate
        n = profile_data['loan_duration_months']
        
        if r == 0:
            loan_payment = P / n
        else:
            loan_payment = P * (r * (1 + r)**n) / ((1 + r)**n - 1)
        
        # Income features
        income_types = [stream['type'] for stream in profile_data['income_streams']]
        has_freelance = int('freelance' in income_types)
        has_multiple_streams = int(len(profile_data['income_streams']) > 1)
        
        reliability_scores = {'high': 1.0, 'medium': 0.6, 'low': 0.3}
        avg_income_reliability = np.mean([
            reliability_scores[s['reliability']] 
            for s in profile_data['income_streams']
        ])
        
        income_amounts = [s['amount'] for s in profile_data['income_streams']]
        income_volatility = (np.std(income_amounts) / monthly_income 
                           if len(income_amounts) > 1 else 0)
        avg_income_growth = np.mean([s['growth_rate'] for s in profile_data['income_streams']])
        
        # Expense features
        fixed_expenses = sum(
            e['monthly_baseline'] 
            for e in profile_data['expenses'] 
            if e['category'] == 'fixed'
        )
        variable_expenses = sum(
            e['monthly_baseline'] 
            for e in profile_data['expenses'] 
            if e['category'] == 'variable'
        )
        expense_volatility = np.mean([e['volatility'] for e in profile_data['expenses']])
        
        # Seasonal exposure
        max_seasonal_multiplier = 1.0
        for expense in profile_data['expenses']:
            if expense.get('seasonal_multipliers'):
                max_seasonal_multiplier = max(
                    max_seasonal_multiplier,
                    max(expense['seasonal_multipliers'].values())
                )
        
        # Life event impact
        total_life_event_expense = sum(
            event['expense_impact'] 
            for event in profile_data['life_events']
        )
        max_single_event_expense = (
            max([e['expense_impact'] for e in profile_data['life_events']]) 
            if profile_data['life_events'] else 0
        )
        
        # Future income
        has_future_income = int(len(profile_data['future_incomes']) > 0)
        future_income_confidence = 0
        if profile_data['future_incomes']:
            conf_scores = {'high': 1.0, 'medium': 0.6, 'low': 0.3}
            future_income_confidence = np.mean([
                conf_scores[fi['confidence']] 
                for fi in profile_data['future_incomes']
            ])
        
        # Calculate ratios
        total_fixed_obligations = monthly_obligations + loan_payment + fixed_expenses
        debt_to_income = (
            (monthly_obligations + loan_payment) / monthly_income 
            if monthly_income > 0 else 999
        )
        fixed_expense_ratio = (
            total_fixed_obligations / monthly_income 
            if monthly_income > 0 else 999
        )
        expense_to_income = (
            (monthly_expenses + monthly_obligations + loan_payment) / monthly_income 
            if monthly_income > 0 else 999
        )
        
        # Liquidity metrics
        total_monthly_outflow = monthly_expenses + monthly_obligations + loan_payment
        buffer_months = (
            profile_data['current_balance'] / total_monthly_outflow 
            if total_monthly_outflow > 0 else 0
        )
        net_monthly_cashflow = monthly_income - total_monthly_outflow
        cashflow_margin = (
            net_monthly_cashflow / monthly_income 
            if monthly_income > 0 else -999
        )
        
        # Household pressure
        dependents_per_income_stream = (
            profile_data['dependents'] / len(profile_data['income_streams']) 
            if len(profile_data['income_streams']) > 0 else 0
        )
        income_per_household_member = (
            monthly_income / profile_data['household_size'] 
            if profile_data['household_size'] > 0 else 0
        )
        
        # Loan characteristics
        loan_to_income_ratio = (
            profile_data['loan_amount'] / (monthly_income * 12) 
            if monthly_income > 0 else 999
        )
        loan_payment_to_income = (
            loan_payment / monthly_income 
            if monthly_income > 0 else 999
        )
        
        # Construct feature dictionary
        features = {
            # Income features
            'monthly_income': monthly_income,
            'has_freelance_income': has_freelance,
            'has_multiple_income_streams': has_multiple_streams,
            'avg_income_reliability': avg_income_reliability,
            'income_volatility': income_volatility,
            'avg_income_growth_rate': avg_income_growth,
            
            # Expense features
            'monthly_expenses': monthly_expenses,
            'fixed_expenses': fixed_expenses,
            'variable_expenses': variable_expenses,
            'expense_volatility': expense_volatility,
            'max_seasonal_multiplier': max_seasonal_multiplier,
            
            # Life events
            'total_life_event_expense': total_life_event_expense,
            'max_single_event_expense': max_single_event_expense,
            
            # Future income
            'has_future_income': has_future_income,
            'future_income_confidence': future_income_confidence,
            
            # Obligations
            'monthly_obligations': monthly_obligations,
            'num_obligations': len(profile_data['obligations']),
            
            # Ratios & metrics
            'debt_to_income_ratio': debt_to_income,
            'fixed_expense_ratio': fixed_expense_ratio,
            'expense_to_income_ratio': expense_to_income,
            'buffer_months': buffer_months,
            'net_monthly_cashflow': net_monthly_cashflow,
            'cashflow_margin': cashflow_margin,
            
            # Household
            'household_size': profile_data['household_size'],
            'dependents': profile_data['dependents'],
            'dependents_per_income_stream': dependents_per_income_stream,
            'income_per_household_member': income_per_household_member,
            
            # Loan
            'loan_amount': profile_data['loan_amount'],
            'loan_duration_months': profile_data['loan_duration_months'],
            'loan_interest_rate': profile_data['loan_interest_rate'],
            'loan_payment': loan_payment,
            'loan_to_income_ratio': loan_to_income_ratio,
            'loan_payment_to_income': loan_payment_to_income,
            
            # Categorical
            'is_salaried': int(profile_data['employment_type'] == 'salaried'),
            'is_freelancer': int(profile_data['employment_type'] == 'freelancer'),
            'is_business_owner': int(profile_data['employment_type'] == 'business_owner'),
            'is_married': int(profile_data['marital_status'] == 'married'),
        }
        
        return features
    
    def predict_risk(self, features: Dict[str, float]) -> Tuple[float, np.ndarray]:
        """
        Predict default risk
        
        Args:
            features: Feature dictionary
            
        Returns:
            Tuple of (risk_score, probabilities)
        """
        if not self._loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        
        # Convert features to numpy array in correct order
        X = np.array([[features[col] for col in self.feature_columns]])
        
        # Get predictions
        probabilities = self.model.predict_proba(X)[0]
        risk_score = probabilities[1] * 100  # Convert to percentage
        
        return risk_score, probabilities
    
    def get_shap_values(self, features: Dict[str, float]) -> np.ndarray:
        """
        Calculate SHAP values for feature importance
        
        Args:
            features: Feature dictionary
            
        Returns:
            SHAP values array
        """
        if not self._loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        
        # Convert features to numpy array
        X = np.array([[features[col] for col in self.feature_columns]])
        
        # Calculate SHAP values
        shap_values = self.shap_explainer.shap_values(X)
        
        # For binary classification, take the positive class SHAP values
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        
        return shap_values[0]
    
    def get_feature_contributions(
        self, 
        features: Dict[str, float], 
        top_n: int = 5
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Get top feature contributions (both risk-increasing and risk-decreasing)
        
        Args:
            features: Feature dictionary
            top_n: Number of top features to return
            
        Returns:
            Tuple of (risk_drivers, protective_factors)
        """
        shap_values = self.get_shap_values(features)
        
        # Create list of feature contributions
        contributions = []
        for i, col in enumerate(self.feature_columns):
            contributions.append({
                'feature_name': col,
                'feature_value': features[col],
                'shap_value': float(shap_values[i]),
                'impact': 'increases_risk' if shap_values[i] > 0 else 'decreases_risk'
            })
        
        # Sort by absolute SHAP value
        contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)
        
        # Split into risk drivers and protective factors
        risk_drivers = [c for c in contributions if c['shap_value'] > 0][:top_n]
        protective_factors = [c for c in contributions if c['shap_value'] < 0][:top_n]
        
        return risk_drivers, protective_factors
