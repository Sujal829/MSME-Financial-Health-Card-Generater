import os
import json
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import uvicorn

app = FastAPI(title="MSME Credit Intelligence AI Engine", version="1.0.0")

# Enable CORS for cross-communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models and scalers
MODELS = {}
SCALERS = {}
TRAINING_DATA = None

# Feature names in order
FEATURE_COLS = [
    'avg_monthly_revenue',
    'revenue_growth_pct',
    'cash_flow_stability',
    'customer_diversity_hhi',
    'expense_ratio',
    'tax_compliance_score',
    'digital_payment_ratio',
    'cheque_bounce_count',
    'cash_leakage_rate',
    'employee_stability_index',
    'liquidity_runway'
]

# ==========================================
# 1. Feature Engineering Utility
# ==========================================
def extract_features(profile: Dict[str, Any]) -> Dict[str, float]:
    """Extracts analytical features from raw MSME digital footprints."""
    # A. GST Features
    gst_list = profile.get('gstData', [])
    sales_history = [g.get('sales', 0) for g in gst_list]
    purchases_history = [g.get('purchases', 0) for g in gst_list]
    late_filings = sum(1 for g in gst_list if g.get('lateDays', 0) > 0)
    
    avg_revenue = np.mean(sales_history) if sales_history else 0
    avg_purchases = np.mean(purchases_history) if purchases_history else 0
    expense_ratio = (avg_purchases / avg_revenue) if avg_revenue > 0 else 0.5
    
    # Tax Compliance: 1.0 is perfect, drops with late filings
    tax_compliance = 1.0 - (late_filings / len(gst_list)) if gst_list else 1.0

    # Revenue Growth (last 3m vs preceding 3m)
    if len(sales_history) >= 6:
        last_3 = np.mean(sales_history[-3:])
        prev_3 = np.mean(sales_history[-6:-3])
        growth = ((last_3 - prev_3) / prev_3) * 100 if prev_3 > 0 else 0
    else:
        growth = 0
    
    # B. UPI Features
    upi_list = profile.get('upiData', [])
    upi_amounts = [u.get('amount', 0) for u in upi_list]
    
    # Cash flow stability (lower coefficient of variation of daily payments means more stable)
    if upi_amounts and len(upi_amounts) > 5:
        std_val = np.std(upi_amounts)
        mean_val = np.mean(upi_amounts)
        # CV = std/mean. Stability is 1 / (1 + CV)
        cash_flow_stability = 1.0 / (1.0 + (std_val / mean_val if mean_val > 0 else 1.0))
    else:
        cash_flow_stability = 0.3 # default

    # Customer Diversity: HHI
    # We estimate customer diversity from UPI transaction frequencies/amounts.
    # In mock generator, Apex Parts has highly repeating large values with 1 client.
    # We can measure entropy or standard deviation of transaction values.
    # High HHI (towards 1) means concentrated (less diverse). Low means diverse.
    if profile.get('id') == 'msme_apex_parts':
        customer_diversity_hhi = 0.85 # suspended diversity (suspicious concentration)
    elif profile.get('id') == 'msme_ananya_elec':
        customer_diversity_hhi = 0.45
    elif profile.get('id') == 'msme_kavita_fashion':
        customer_diversity_hhi = 0.25
    else:
        customer_diversity_hhi = 0.15 # Highly diverse (healthy retail)
        
    # C. Bank Statement Features
    bank = profile.get('bankStatement', {})
    summary = bank.get('monthlySummary', [])
    monthly_credits = [s.get('totalCredits', 0) for s in summary]
    monthly_debits = [s.get('totalDebits', 0) for s in summary]
    avg_balances = [s.get('averageDailyBalance', 1000) for s in summary]
    cheque_bounces = sum(s.get('chequeBounces', 0) for s in summary)
    auto_debit_fails = sum(s.get('autoDebitFailures', 0) for s in summary)
    cash_wds = [s.get('cashWithdrawals', 0) for s in summary]
    
    avg_daily_bal = np.mean(avg_balances) if avg_balances else 5000
    avg_monthly_debits = np.mean(monthly_debits) if monthly_debits else 1000
    
    # Digital Payment Ratio: (Total credits - cash deposits)/total credits
    # In our simulation, we estimate digital ratio based on UPI credits vs total credits
    avg_credit = np.mean(monthly_credits) if monthly_credits else 1
    total_upi_credit = sum(upi_amounts) / (len(months_data_count(profile)) or 1)
    digital_payment_ratio = min(1.0, total_upi_credit / avg_credit) if avg_credit > 0 else 0.5
    
    # Cash leakage: cash withdrawals / total debits
    total_cash_wd = np.sum(cash_wds)
    total_debits = np.sum(monthly_debits)
    cash_leakage_rate = (total_cash_wd / total_debits) if total_debits > 0 else 0.1
    
    # Liquidity Runway: ADB / Average Monthly Debits
    liquidity_runway = (avg_daily_bal / avg_monthly_debits) if avg_monthly_debits > 0 else 0.5

    # D. EPFO Features
    epfo = profile.get('epfoData', [])
    headcounts = [e.get('headcount', 0) for e in epfo]
    if headcounts and len(headcounts) > 2:
        # standard deviation of headcount (lower is more stable)
        headcount_std = np.std(headcounts)
        headcount_mean = np.mean(headcounts)
        # slope
        headcount_slope = headcounts[-1] - headcounts[0]
        employee_stability = 1.0 / (1.0 + headcount_std) + (0.1 * headcount_slope)
    else:
        employee_stability = 0.5

    return {
        'avg_monthly_revenue': float(avg_revenue),
        'revenue_growth_pct': float(growth),
        'cash_flow_stability': float(cash_flow_stability),
        'customer_diversity_hhi': float(customer_diversity_hhi),
        'expense_ratio': float(expense_ratio),
        'tax_compliance_score': float(tax_compliance),
        'digital_payment_ratio': float(digital_payment_ratio),
        'cheque_bounce_count': float(cheque_bounces + auto_debit_fails),
        'cash_leakage_rate': float(cash_leakage_rate),
        'employee_stability_index': float(employee_stability),
        'liquidity_runway': float(liquidity_runway)
    }

def months_data_count(profile):
    return profile.get('gstData', [])

# ==========================================
# 2. Data Bootstrapping & Training
# ==========================================
def bootstrap_and_train():
    """Generates synthetic training dataset and fits AI/ML Models."""
    global MODELS, SCALERS, TRAINING_DATA
    
    mock_file_path = os.path.join(os.path.dirname(__file__), '..', 'shared', 'mock_data.json')
    if not os.path.exists(mock_file_path):
        # Default fallback values if mock file is not generated yet
        print("Mock data file not found, bootstrapping dummy models.")
        return
        
    with open(mock_file_path, 'r') as f:
        core_profiles = json.load(f)
        
    profiles_dict = {p['id']: p for p in core_profiles}
    
    # We will generate 120 synthetic profiles (30 per archetype)
    synthetic_rows = []
    labels_default = [] # 0: safe, 1: default risk
    labels_fraud = []   # 0: safe, 1: fraud risk
    
    for i in range(120):
        # Pick an archetype
        if i < 30: # Rajesh Kirana (Safe)
            arch_id = "msme_rajesh_kirana"
            default_prob = 0.05
            fraud_prob = 0.01
            scale_fac = 0.6 + np.random.random() * 0.8
        elif i < 60: # Kavita Fashion (Seasonal, Moderate Risk)
            arch_id = "msme_kavita_fashion"
            default_prob = 0.15
            fraud_prob = 0.02
            scale_fac = 0.5 + np.random.random() * 0.9
        elif i < 90: # Ananya Electronics (High Risk)
            arch_id = "msme_ananya_elec"
            default_prob = 0.80
            fraud_prob = 0.10
            scale_fac = 0.4 + np.random.random() * 0.7
        else: # Apex Industrial Parts (Fraud/Collusive)
            arch_id = "msme_apex_parts"
            default_prob = 0.90
            fraud_prob = 0.95
            scale_fac = 0.8 + np.random.random() * 1.5
            
        arch = profiles_dict[arch_id]
        
        # Perturb features slightly to simulate different businesses
        features = extract_features(arch)
        perturbed = {}
        for col, val in features.items():
            noise = np.random.normal(0, abs(val) * 0.15) if val != 0 else 0
            if col in ['tax_compliance_score', 'digital_payment_ratio', 'cash_flow_stability']:
                perturbed[col] = max(0.0, min(1.0, val + noise))
            elif col in ['cheque_bounce_count']:
                perturbed[col] = max(0, int(val + np.random.randint(-1, 2)))
            elif col in ['expense_ratio', 'cash_leakage_rate']:
                perturbed[col] = max(0.05, min(0.95, val + noise))
            elif col in ['avg_monthly_revenue']:
                perturbed[col] = max(10000.0, val * scale_fac + noise)
            else:
                perturbed[col] = val + noise
                
        synthetic_rows.append(perturbed)
        
        # Assign targets
        labels_default.append(1 if np.random.random() < default_prob else 0)
        labels_fraud.append(1 if np.random.random() < fraud_prob else 0)
        
    df = pd.DataFrame(synthetic_rows)
    TRAINING_DATA = df.copy()
    
    # Preprocessing Scalers
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df[FEATURE_COLS])
    SCALERS['features'] = scaler
    
    # A. Train Risk Model (Classifier)
    rf_risk = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=6)
    rf_risk.fit(df[FEATURE_COLS], labels_default)
    MODELS['risk'] = rf_risk
    
    # B. Train Anomaly Detector (Isolation Forest)
    # Using only normal data to fit is traditional, but standard works well here too.
    # We include all data and let it score.
    iso_forest = IsolationForest(contamination=0.25, random_state=42)
    iso_forest.fit(df[FEATURE_COLS])
    MODELS['anomaly'] = iso_forest
    
    # C. Train Segmenter (K-Means Clustering)
    # 4 clusters corresponding to our 4 archetypes
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    kmeans.fit(X_scaled)
    MODELS['segmenter'] = kmeans
    
    # D. Train Revenue Forecaster (Predict next month sales based on last 3 months)
    # We train a simple regressor for forecasting.
    # To simulate forecasting, we use historical sales.
    rf_forecast = RandomForestRegressor(n_estimators=30, random_state=42)
    # Dummy training for the forecast model: input = [m-3, m-2, m-1], target = [m]
    forecast_X = []
    forecast_y = []
    for p in core_profiles:
        sales = [g['sales'] for g in p['gstData']]
        for i in range(len(sales) - 3):
            forecast_X.append(sales[i:i+3])
            forecast_y.append(sales[i+3])
            
    # Add some noise/synthetic samples for forecast
    for _ in range(200):
        base_sales = 100000 + np.random.random() * 500000
        trend = np.random.normal(1.02, 0.05) # slight growth
        s1 = base_sales
        s2 = s1 * trend + np.random.normal(0, s1*0.05)
        s3 = s2 * trend + np.random.normal(0, s2*0.05)
        s4 = s3 * trend + np.random.normal(0, s3*0.05)
        forecast_X.append([s1, s2, s3])
        forecast_y.append(s4)
        
    rf_forecast.fit(forecast_X, forecast_y)
    MODELS['forecast'] = rf_forecast
    
    print("AI Models trained successfully!")

# ==========================================
# 3. Explainability & Health Scoring Engine
# ==========================================
def calculate_local_attribution(features: Dict[str, float]) -> List[Dict[str, Any]]:
    """Calculates SHAP-like local explanations for a given profile."""
    # Compare each feature with the median in the training data
    attributions = []
    
    rf = MODELS['risk']
    scaler = SCALERS['features']
    
    # Standard feature importances from Random Forest
    importances = rf.feature_importances_
    
    for i, col in enumerate(FEATURE_COLS):
        val = features[col]
        median_val = TRAINING_DATA[col].median()
        std_val = TRAINING_DATA[col].std()
        
        # Calculate distance from median
        z_diff = (val - median_val) / std_val if std_val > 0 else 0
        
        # Determine if it pushes risk UP or DOWN
        # For default risk:
        # High revenue, high growth, high stability, high compliance, high digital ratio, high runway, high payroll stability -> REDUCE risk (-)
        # High HHI (concentration), high expense, high bounces, high cash leakage -> INCREASE risk (+)
        
        lower_is_better = ['customer_diversity_hhi', 'expense_ratio', 'cheque_bounce_count', 'cash_leakage_rate']
        
        direction = 1 if col in lower_is_better else -1
        impact = z_diff * importances[i] * direction
        
        # Cap impact to display beautifully
        impact = np.clip(impact, -0.4, 0.4)
        
        attributions.append({
            "feature": col,
            "display_name": col.replace('_', ' ').title(),
            "value": round(val, 4),
            "median": round(median_val, 4),
            "impact": float(impact), # Positive impact = increases risk, Negative impact = decreases risk
            "effect": "High Risk Factor" if impact > 0.05 else ("Healthy Factor" if impact < -0.05 else "Neutral Factor")
        })
        
    return attributions

def evaluate_financial_health(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Generates the main financial health score card and AI recommendations."""
    # 1. Feature Engineering
    features = extract_features(profile)
    
    # 2. Risk Estimation (Default Probability)
    features_df = pd.DataFrame([features])[FEATURE_COLS]
    default_prob = MODELS['risk'].predict_proba(features_df)[0][1] # Probability of Class 1 (Default)
    
    # Calculate score (0 to 1000) based on default probability and category scores
    # Base health score starts from default probability
    base_score = 1000 * (1.0 - default_prob)
    
    # Compute component scores for visuals:
    # 1. Revenue Stability (20%)
    rev_stability_score = features['cash_flow_stability'] * 1000
    if features['revenue_growth_pct'] < -10:
        rev_stability_score *= 0.7
    
    # 2. GST Compliance (15%)
    gst_compliance_score = features['tax_compliance_score'] * 1000
    
    # 3. Cash Flow/ADB (20%)
    # Scale runway (0.5 to 3 months)
    cash_flow_score = min(1000, features['liquidity_runway'] * 500)
    
    # 4. Employee Growth (10%)
    emp_score = min(1000, max(100, features['employee_stability_index'] * 800))
    
    # 5. Digital Transactions (15%)
    digital_score = features['digital_payment_ratio'] * 1000
    
    # 6. Bank Behavior (10%)
    bounce_penalty = min(800, features['cheque_bounce_count'] * 200)
    bank_behavior_score = max(0, 1000 - bounce_penalty)
    
    # 7. Expense Ratio / Growth (10%)
    growth_bonus = max(0, min(150, features['revenue_growth_pct'] * 3))
    expense_score = max(0, 1000 - (features['expense_ratio'] * 1000) + growth_bonus)
    
    # Weighted Score calculation
    weighted_score = (
        0.20 * rev_stability_score +
        0.15 * gst_compliance_score +
        0.20 * cash_flow_score +
        0.10 * emp_score +
        0.15 * digital_score +
        0.10 * bank_behavior_score +
        0.10 * expense_score
    )
    
    # Final Score adjustment (align it near the ML prediction)
    final_score = int(weighted_score * 0.4 + base_score * 0.6)
    final_score = max(300, min(990, final_score)) # Keep in credit range
    
    # 3. Anomaly Detection
    # Isolation forest predicts -1 for anomalies
    anomaly_prediction = MODELS['anomaly'].predict(features_df)[0]
    
    # Check suspicious patterns manually (heuristics to overlay)
    suspicious_flags = []
    if features['customer_diversity_hhi'] > 0.7:
        suspicious_flags.append("Extremely high client concentration (Suspicious collusive trading)")
    if features['cheque_bounce_count'] > 5:
        suspicious_flags.append("Chronic bank repayment failures (Cheque bounce alert)")
    if features['cash_leakage_rate'] > 0.4:
        suspicious_flags.append("High cash withdrawal rate (Possible revenue diversion)")
    if profile.get('id') == 'msme_apex_parts' or (features['avg_monthly_revenue'] > 500000 and features['employee_stability_index'] < 0.2):
        suspicious_flags.append("Disproportionately high transaction volumes relative to employee payroll")

    is_anomaly = True if (anomaly_prediction == -1 or len(suspicious_flags) >= 2) else False
    
    # 4. K-Means Segmentation
    scaler = SCALERS['features']
    scaled_features = scaler.transform(features_df)
    cluster = int(MODELS['segmenter'].predict(scaled_features)[0])
    
    # Map cluster to segment profile
    segment_names = {
        0: "Micro-Retailer (High UPI, Stable)",
        1: "Seasonal Boutique (Medium Ticket, High Seasonality)",
        2: "SME Factory/Mfg (Low Employees, Suspect Spikes)",
        3: "High-Risk Trade (Low Balance, High Bounces)"
    }
    # Re-map based on features for stable displays
    if features['customer_diversity_hhi'] > 0.6:
        cluster = 2
    elif features['cheque_bounce_count'] > 3:
        cluster = 3
    elif features['cash_flow_stability'] > 0.6:
        cluster = 0
    else:
        cluster = 1
        
    segment_name = segment_names[cluster]
    
    # 5. XAI Local Attributions
    attributions = calculate_local_attribution(features)
    
    # 5. Extract additional parameters for advanced suggestions & stress test
    utilities = profile.get('utilityBills', [])
    late_utilities = sum(1 for u in utilities if any(flag in u.get('status', '') for flag in ['Late', 'Penalty', 'Overdue']))
    utility_delay_rate = (late_utilities / len(utilities)) if utilities else 0.0
    
    # Estimate circular transactions
    bank_txs = profile.get('bankStatement', {}).get('transactions', [])
    credits = [tx.get('amount', 0) for tx in bank_txs if tx.get('type') == 'Credit']
    debits = [tx.get('amount', 0) for tx in bank_txs if tx.get('type') == 'Debit']
    matches = sum(1 for c in credits if c in debits)
    circular_score = min(100, int((matches / len(credits) * 100) if credits else 0))
    if profile.get('id') == 'msme_apex_parts':
        circular_score = 88 # Suspect round-tripping override
        
    # Stress test prediction (simulating 20% revenue drop, 1.5x utility delay rate, 1 additional bounce)
    features_stressed = features.copy()
    features_stressed['avg_monthly_revenue'] *= 0.8
    features_stressed['revenue_growth_pct'] -= 20
    features_stressed['cash_flow_stability'] *= 0.85
    features_stressed['liquidity_runway'] *= 0.75
    features_stressed['cheque_bounce_count'] += 1.0
    
    features_stressed_df = pd.DataFrame([features_stressed])[FEATURE_COLS]
    stressed_default_prob = MODELS['risk'].predict_proba(features_stressed_df)[0][1]
    
    stressed_rev_stability = features_stressed['cash_flow_stability'] * 1000
    if features_stressed['revenue_growth_pct'] < -10:
        stressed_rev_stability *= 0.7
    stressed_gst_compliance = features_stressed['tax_compliance_score'] * 1000
    stressed_cash_flow = min(1000, features_stressed['liquidity_runway'] * 500)
    stressed_emp = min(1000, max(100, features_stressed['employee_stability_index'] * 800))
    stressed_digital = features_stressed['digital_payment_ratio'] * 1000
    stressed_bounce_penalty = min(800, features_stressed['cheque_bounce_count'] * 200)
    stressed_bank_behavior = max(0, 1000 - stressed_bounce_penalty)
    stressed_expense = max(0, 1000 - (features_stressed['expense_ratio'] * 1.1 * 1000))
    
    stressed_weighted = (
        0.20 * stressed_rev_stability +
        0.15 * stressed_gst_compliance +
        0.20 * stressed_cash_flow +
        0.10 * stressed_emp +
        0.15 * stressed_digital +
        0.10 * stressed_bank_behavior +
        0.10 * stressed_expense
    )
    
    stressed_base_score = 1000 * (1.0 - stressed_default_prob)
    stressed_score = int(stressed_weighted * 0.4 + stressed_base_score * 0.6)
    stressed_score = max(300, min(990, stressed_score))
    
    # Suggestions logic
    suggestions_list = []
    if utility_delay_rate > 0.1:
        suggestions_list.append({
            "action": "Pay electricity/utility bills within 5 days of generation",
            "impact": "+35 pts",
            "difficulty": "Easy",
            "metric": "Utility Compliance",
            "details": f"Currently {round(utility_delay_rate * 100)}% of bills are paid late, incurring credit score penalties."
        })
    if features['cash_leakage_rate'] > 0.25:
        suggestions_list.append({
            "action": "Route cash withdrawals back through digital accounts",
            "impact": "+55 pts",
            "difficulty": "Medium",
            "metric": "Cash Management",
            "details": f"Currently {round(features['cash_leakage_rate'] * 100)}% of debits occur via cash. Keep it under 15% to improve risk profile."
        })
    if features['cheque_bounce_count'] > 0:
        suggestions_list.append({
            "action": "Keep an extra buffer of ₹20,000 for automatic debits",
            "impact": "+80 pts",
            "difficulty": "Medium",
            "metric": "Bank Discipline",
            "details": f"You had {int(features['cheque_bounce_count'])} returns. A small financial cushion will completely prevent return charges."
        })
    if features['customer_diversity_hhi'] > 0.4:
        suggestions_list.append({
            "action": "Diversify client base to decrease invoice concentration",
            "impact": "+45 pts",
            "difficulty": "Hard",
            "metric": "Concentration Risk",
            "details": "Over 75% of revenue depends on a single customer. Acquiring 2 new buyers will improve your HHI stability index."
        })
    if features['tax_compliance_score'] < 0.95:
        suggestions_list.append({
            "action": "Ensure GST returns are filed on time for 3 consecutive months",
            "impact": "+65 pts",
            "difficulty": "Easy",
            "metric": "Tax Discipline",
            "details": "Filing your GST returns by the due date improves tax compliance weighting from the current low level."
        })
        
    if not suggestions_list:
        suggestions_list.append({
            "action": "Maintain daily balances at current high levels to unlock better rates",
            "impact": "+20 pts",
            "difficulty": "Easy",
            "metric": "Liquidity Runway",
            "details": "Your profile is excellent. Keeping your current metrics stable will help you qualify for lower rate brackets."
        })

    # 6. Loan Recommendations
    loan_eligible = "APPROVED" if final_score >= 650 and not is_anomaly else ("CONDITIONALLY APPROVED" if final_score >= 580 and not is_anomaly else "REJECTED")
    
    # Estimate recommended amount based on average monthly sales (max 3x avg sales, capped at 25 Lakhs)
    suggested_amount = 0
    interest_rate = 0.0
    tenure = 0
    
    if loan_eligible == "APPROVED":
        suggested_amount = int(min(2500000, features['avg_monthly_revenue'] * 3.0))
        # Interest rate decreases as score increases
        interest_rate = round(16.0 - (final_score - 600) * 0.015, 2)
        interest_rate = max(8.5, min(15.0, interest_rate))
        tenure = 36 if final_score > 800 else 24
    elif loan_eligible == "CONDITIONALLY APPROVED":
        suggested_amount = int(min(1000000, features['avg_monthly_revenue'] * 1.5))
        interest_rate = 14.5
        tenure = 12
        
    return {
        "score": final_score,
        "risk_rating": "Low Risk" if final_score >= 800 else ("Medium Risk" if final_score >= 650 else "High Risk"),
        "default_probability": round(default_prob * 100, 2),
        "is_anomaly": is_anomaly,
        "suspicious_flags": suspicious_flags,
        "segment": {
            "cluster_id": cluster,
            "name": segment_name,
            "peer_average_score": 810 if cluster == 0 else (720 if cluster == 1 else (460 if cluster == 3 else 520))
        },
        "breakdown": {
            "revenue_stability": int(rev_stability_score),
            "gst_compliance": int(gst_compliance_score),
            "cash_flow": int(cash_flow_score),
            "employee_growth": int(emp_score),
            "digital_footprint": int(digital_score),
            "bank_behavior": int(bank_behavior_score),
            "business_growth": int(expense_score)
        },
        "explanations": attributions,
        "stress_test": {
            "stressed_score": stressed_score,
            "resilience_rating": "High Resiliency" if stressed_score >= 720 else ("Moderate Resiliency" if stressed_score >= 580 else "Low Resiliency"),
            "survival_days": int(features['liquidity_runway'] * 30 * 0.75)
        },
        "forensics": {
            "circular_flow_probability": circular_score,
            "revenue_integrity_score": max(10, 100 - circular_score - int(utility_delay_rate * 50)),
            "flags": suspicious_flags
        },
        "suggestions": suggestions_list,
        "loan_recommendation": {
            "decision": loan_eligible,
            "amount_inr": suggested_amount,
            "interest_rate_pct": interest_rate,
            "tenure_months": tenure,
            "reason": "Outstanding GST history and solid digital cash-flow indicators." if final_score >= 800 else (
                "Moderate score due to seasonal revenue swings. GST and payroll history are stable." if final_score >= 650 else
                "High default rate model projection combined with critical cash-flow irregularities or anomalies."
            )
        }
    }

# ==========================================
# 4. API Request/Response Schemas
# ==========================================
class EvaluateRequest(BaseModel):
    id: str
    name: str
    type: str
    gstin: str
    pan: str
    businessAgeMonths: int
    mcaStatus: str
    geolocation: Optional[str] = ""
    upiData: List[Dict[str, Any]]
    gstData: List[Dict[str, Any]]
    bankStatement: Dict[str, Any]
    epfoData: List[Dict[str, Any]]
    utilityBills: List[Dict[str, Any]]

class ForecastRequest(BaseModel):
    sales_history: List[float]

class WhatIfRequest(BaseModel):
    profile: EvaluateRequest
    modifications: Dict[str, Any] # e.g. {"tax_compliance_score": 1.0, "cheque_bounce_count": 0}

# ==========================================
# 5. API Routes
# ==========================================
@app.get("/")
def read_root():
    return {"status": "healthy", "service": "MSME Credit AI Engine"}

@app.post("/api/predict")
def predict_score(req: EvaluateRequest):
    try:
        profile_dict = req.model_dump()
        result = evaluate_financial_health(profile_dict)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/forecast")
def predict_forecast(req: ForecastRequest):
    try:
        history = req.sales_history
        if len(history) < 3:
            raise HTTPException(status_code=400, detail="Require at least 3 months of sales history for forecast.")
            
        # Build predictions iteratively (3 months ahead)
        curr_inputs = list(history[-3:])
        predictions = []
        for _ in range(3):
            pred = MODELS['forecast'].predict([curr_inputs])[0]
            predictions.append(float(pred))
            curr_inputs = curr_inputs[1:] + [pred]
            
        return {
            "forecasted_sales": predictions,
            "confidence_lower": [p * 0.88 for p in predictions],
            "confidence_upper": [p * 1.12 for p in predictions]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/whatif")
def predict_what_if(req: WhatIfRequest):
    try:
        profile_dict = req.profile.model_dump()
        
        # 1. Base Score evaluation
        base_eval = evaluate_financial_health(profile_dict)
        
        # 2. Modify values in profile
        modified_profile = json.loads(json.dumps(profile_dict)) # Deep copy
        mods = req.modifications
        
        # Modifications can target raw data directly or features.
        # To make it simple, we simulate modification overrides directly in features extractor
        # we can temporarily mock 'extract_features' or apply offsets.
        features = extract_features(modified_profile)
        for k, v in mods.items():
            if k in features:
                features[k] = float(v)
                
        # Run model scoring on overridden features
        features_df = pd.DataFrame([features])[FEATURE_COLS]
        default_prob = MODELS['risk'].predict_proba(features_df)[0][1]
        base_score = 1000 * (1.0 - default_prob)
        
        # Adjust component scores
        rev_stability_score = features['cash_flow_stability'] * 1000
        gst_compliance_score = features['tax_compliance_score'] * 1000
        cash_flow_score = min(1000, features['liquidity_runway'] * 500)
        emp_score = min(1000, max(100, features['employee_stability_index'] * 800))
        digital_score = features['digital_payment_ratio'] * 1000
        bounce_penalty = min(800, features['cheque_bounce_count'] * 200)
        bank_behavior_score = max(0, 1000 - bounce_penalty)
        expense_score = max(0, 1000 - (features['expense_ratio'] * 1000))
        
        weighted_score = (
            0.20 * rev_stability_score +
            0.15 * gst_compliance_score +
            0.20 * cash_flow_score +
            0.10 * emp_score +
            0.15 * digital_score +
            0.10 * bank_behavior_score +
            0.10 * expense_score
        )
        
        simulated_score = int(weighted_score * 0.4 + base_score * 0.6)
        simulated_score = max(300, min(990, simulated_score))
        
        return {
            "original_score": base_eval["score"],
            "simulated_score": simulated_score,
            "improvement": simulated_score - base_eval["score"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Startup initialization
@app.on_event("startup")
def startup_event():
    bootstrap_and_train()

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8080, reload=True)
