"""
Risk Assessment Service - Combines model predictions with cashflow analysis
"""
from typing import Dict, List, Tuple
import logging

from app.services.model_service import ModelService
from app.services.cashflow_service import CashflowSimulator

logger = logging.getLogger(__name__)


class RiskAssessmentService:
    """
    Main service for assessing loan risk
    """
    
    def __init__(self, model_service: ModelService):
        """
        Initialize risk assessment service
        
        Args:
            model_service: Loaded model service instance
        """
        self.model_service = model_service
    
    def assess_risk(self, profile_data: Dict) -> Dict:
        """
        Perform complete risk assessment
        
        Args:
            profile_data: User profile data
            
        Returns:
            Complete risk assessment results
        """
        # Extract features
        features = self.model_service.extract_features(profile_data)
        
        # Get risk prediction
        risk_score, probabilities = self.model_service.predict_risk(features)
        
        # Get SHAP explanations
        risk_drivers, protective_factors = (
            self.model_service.get_feature_contributions(features, top_n=5)
        )
        
        # Run cashflow simulation
        simulator = CashflowSimulator(
            profile_data, 
            n_simulations=100, 
            horizon_months=24
        )
        cashflow_projection = simulator.get_cashflow_projection()
        
        # Calculate default probabilities at different horizons
        stress_12_months = cashflow_projection[12]['stress_probability']
        stress_24_months = cashflow_projection[24]['stress_probability']
        
        # Categorize risk
        risk_category = self._categorize_risk(risk_score)
        recommendation = self._get_recommendation(risk_score, features)
        
        # Generate risk breakdown
        risk_breakdown = self._generate_risk_breakdown(features, risk_score)
        
        # Generate warnings and recommendations
        warnings = self._generate_warnings(features, cashflow_projection)
        recommendations_for_approval = (
            self._generate_recommendations(features, risk_score)
            if risk_score > 30
            else None
        )
        
        # Compile results
        return {
            # Overall assessment
            'risk_score': float(risk_score),
            'risk_category': risk_category,
            'recommendation': recommendation,
            
            # Key metrics
            'monthly_income': features['monthly_income'],
            'monthly_expenses': features['monthly_expenses'],
            'monthly_loan_payment': features['loan_payment'],
            'debt_to_income_ratio': features['debt_to_income_ratio'],
            'net_monthly_cashflow': features['net_monthly_cashflow'],
            
            # Risk breakdown
            'risk_breakdown': risk_breakdown,
            
            # Feature importance
            'top_risk_drivers': risk_drivers,
            'top_protective_factors': protective_factors,
            
            # Cashflow projection
            'cashflow_projection': cashflow_projection,
            
            # Additional insights
            'default_probability_12_months': float(stress_12_months),
            'default_probability_24_months': float(stress_24_months),
            'buffer_months': features['buffer_months'],
            
            # Warnings and recommendations
            'warnings': warnings,
            'recommendations_for_approval': recommendations_for_approval
        }
    
    def _categorize_risk(self, risk_score: float) -> str:
        """Categorize risk based on score"""
        if risk_score < 25:
            return "low"
        elif risk_score < 50:
            return "medium"
        elif risk_score < 75:
            return "high"
        else:
            return "very_high"
    
    def _get_recommendation(self, risk_score: float, features: Dict) -> str:
        """Get loan recommendation"""
        if risk_score < 30:
            return "approve"
        elif risk_score < 60:
            # Additional checks for medium risk
            if (features['debt_to_income_ratio'] < 0.4 and 
                features['buffer_months'] > 3):
                return "review"
            else:
                return "review"
        else:
            return "reject"
    
    def _generate_risk_breakdown(
        self, 
        features: Dict, 
        risk_score: float
    ) -> List[Dict]:
        """Generate detailed risk breakdown by category"""
        breakdown = []
        
        # Income stability
        income_score = self._assess_income_stability(features)
        breakdown.append({
            'category': 'Income Stability',
            'description': 'Reliability and consistency of income sources',
            'score': income_score,
            'status': self._get_status(income_score)
        })
        
        # Debt burden
        debt_score = self._assess_debt_burden(features)
        breakdown.append({
            'category': 'Debt Burden',
            'description': 'Current debt obligations relative to income',
            'score': debt_score,
            'status': self._get_status(debt_score)
        })
        
        # Liquidity
        liquidity_score = self._assess_liquidity(features)
        breakdown.append({
            'category': 'Liquidity',
            'description': 'Available cash reserves and buffer',
            'score': liquidity_score,
            'status': self._get_status(liquidity_score)
        })
        
        # Cashflow margin
        cashflow_score = self._assess_cashflow_margin(features)
        breakdown.append({
            'category': 'Cashflow Margin',
            'description': 'Monthly surplus after all expenses',
            'score': cashflow_score,
            'status': self._get_status(cashflow_score)
        })
        
        # Expense volatility
        expense_score = self._assess_expense_stability(features)
        breakdown.append({
            'category': 'Expense Stability',
            'description': 'Predictability of monthly expenses',
            'score': expense_score,
            'status': self._get_status(expense_score)
        })
        
        return breakdown
    
    def _assess_income_stability(self, features: Dict) -> float:
        """Assess income stability (0-100, higher is better)"""
        score = 50  # Start neutral
        
        # Reliability
        score += features['avg_income_reliability'] * 20
        
        # Multiple streams (good)
        if features['has_multiple_income_streams']:
            score += 10
        
        # Freelance income (risky)
        if features['has_freelance_income']:
            score -= 15
        
        # Income volatility
        score -= features['income_volatility'] * 30
        
        # Growth rate
        score += features['avg_income_growth_rate']
        
        return max(0, min(100, score))
    
    def _assess_debt_burden(self, features: Dict) -> float:
        """Assess debt burden (0-100, higher is better)"""
        dti = features['debt_to_income_ratio']
        
        if dti < 0.2:
            return 100
        elif dti < 0.3:
            return 85
        elif dti < 0.4:
            return 70
        elif dti < 0.5:
            return 50
        elif dti < 0.6:
            return 30
        else:
            return 10
    
    def _assess_liquidity(self, features: Dict) -> float:
        """Assess liquidity (0-100, higher is better)"""
        buffer = features['buffer_months']
        
        if buffer > 6:
            return 100
        elif buffer > 4:
            return 85
        elif buffer > 3:
            return 70
        elif buffer > 2:
            return 50
        elif buffer > 1:
            return 30
        else:
            return 10
    
    def _assess_cashflow_margin(self, features: Dict) -> float:
        """Assess cashflow margin (0-100, higher is better)"""
        margin = features['cashflow_margin']
        
        if margin > 0.3:
            return 100
        elif margin > 0.2:
            return 85
        elif margin > 0.1:
            return 70
        elif margin > 0:
            return 50
        elif margin > -0.1:
            return 30
        else:
            return 10
    
    def _assess_expense_stability(self, features: Dict) -> float:
        """Assess expense stability (0-100, higher is better)"""
        volatility = features['expense_volatility']
        seasonal = features['max_seasonal_multiplier']
        
        score = 100
        score -= volatility * 200  # High penalty for volatility
        score -= (seasonal - 1.0) * 50  # Penalty for seasonality
        
        return max(0, min(100, score))
    
    def _get_status(self, score: float) -> str:
        """Get status label from score"""
        if score >= 70:
            return "good"
        elif score >= 40:
            return "warning"
        else:
            return "critical"
    
    def _generate_warnings(
        self, 
        features: Dict, 
        cashflow_projection: List[Dict]
    ) -> List[str]:
        """Generate warnings based on risk factors"""
        warnings = []
        
        # High debt-to-income
        if features['debt_to_income_ratio'] > 0.5:
            warnings.append(
                f"High debt-to-income ratio: "
                f"{features['debt_to_income_ratio']:.1%}. "
                f"Recommended maximum is 40%."
            )
        
        # Low buffer
        if features['buffer_months'] < 2:
            warnings.append(
                f"Low cash reserves: Only {features['buffer_months']:.1f} "
                f"months of expenses. Recommend at least 3 months."
            )
        
        # Negative cashflow
        if features['net_monthly_cashflow'] < 0:
            warnings.append(
                f"Negative monthly cashflow: {features['net_monthly_cashflow']:.0f} TND. "
                f"Expenses exceed income."
            )
        
        # High expense volatility
        if features['expense_volatility'] > 0.3:
            warnings.append(
                "High expense volatility detected. "
                "Monthly expenses may vary significantly."
            )
        
        # Unstable income
        if features['avg_income_reliability'] < 0.7:
            warnings.append(
                "Income reliability concerns. "
                "Consider additional income verification."
            )
        
        # Cashflow stress
        for month in [6, 12, 18, 24]:
            if cashflow_projection[month]['stress_probability'] > 0.5:
                warnings.append(
                    f"High stress probability ({cashflow_projection[month]['stress_probability']:.0%}) "
                    f"at month {month}. Potential liquidity crisis."
                )
                break
        
        return warnings
    
    def _generate_recommendations(
        self, 
        features: Dict, 
        risk_score: float
    ) -> List[str]:
        """Generate recommendations for potential approval"""
        recommendations = []
        
        if risk_score > 30 and risk_score < 70:
            # Medium risk - possible approval with conditions
            
            if features['buffer_months'] < 3:
                recommendations.append(
                    "Request additional collateral or guarantor"
                )
            
            if features['debt_to_income_ratio'] > 0.4:
                recommendations.append(
                    "Consider reducing loan amount or extending duration "
                    "to improve DTI ratio"
                )
            
            if features['loan_duration_months'] < 36:
                recommendations.append(
                    "Extend loan duration to reduce monthly payment"
                )
            
            if features['has_freelance_income']:
                recommendations.append(
                    "Require 6 months of bank statements for income verification"
                )
            
            recommendations.append(
                "Set up automatic payments from salary account"
            )
        
        return recommendations if recommendations else None
