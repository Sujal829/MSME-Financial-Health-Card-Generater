# AI-Powered MSME Credit Intelligence Platform

An enterprise-ready **Credit Underwriting & Risk Intelligence Platform** built to evaluate "credit-invisible" Micro, Small, and Medium Enterprises (MSMEs). 

Rather than relying on traditional, audited financial statements (P&L sheets, tax history, or collateral) which many new or cash-flow-driven MSMEs lack, this platform ingests and analyzes **alternate digital footprints**:
* **GST Portals**: Invoice frequencies, outward sales vs. purchases, compliance filing timelines.
* **UPI Merchant Records**: Daily P2M cash-flow velocity, customer review ratings, volume growth.
* **Bank Statements**: Average Daily Balances (ADB), cheque bounces, cash-withdrawal leakage rates.
* **EPFO Accounts**: Payroll outgoings, staff headcount growth, attrition volatility.
* **Utility Bills**: Speed and history of electricity/broadband payments.

---

## 1. Core Platform Architecture

The system is designed as a modular monorepo:
1. **Frontend (Vite + React + Tailwind + Recharts)**: A dashboard featuring an MSME Applicant Portal (simulators, AA consent flows, financial card metrics) and a Credit Officer Cockpit (XAI attributions, anomalies, peer-group indexing).
2. **Backend (Node.js + Express + Local DB)**: Integrates the flow of data, manages the application pipeline, stores scores/audits in local SQLite, and interacts with the AI core.
3. **AI Core Engine (Python FastAPI + Scikit-Learn)**: Processes engineered features, runs machine learning estimators (risk classifications, revenue forecasting, anomaly detection, clustering), and generates SHAP-like explanations for explainability (XAI).

---

## 2. Key Modules & AI Engine Capabilities

### 🛡️ ML Risk Classifier (XGBoost / RandomForest)
Trains on synthetic MSME histories to project the **Default Probability** of a business based on cash-flow metrics. Outputs are mapped into a multi-dimensional credit rating (0-1000 range).

### 🔮 Revenue Time-Series Forecaster (RandomForest Regressor)
Uses historical sales from GST receipts to project top-line revenues 3 months into the future (complete with confidence bands), enabling seasonal businesses (like fashion boutiques) to show long-term viability.

### 🛑 Isolation Forest Anomaly Detector
Scans the transaction matrices to identify suspect behavior. Manually overlays critical compliance rules to flag **circular/collusive trading loops** (shell companies), cash diversion leakage, or extreme cheque return charges.

### 📊 K-Means Sector Benchmarker
Groups businesses into sector clusters (Micro-Retail, Seasonal Boutique, SME Factory/Manufacturing). This ensures a small tea stall is benchmarked against fellow micro-retailers instead of large capital-intensive factories.

### 🔬 Explainable AI (XAI attributions)
Calculates SHAP-like attributions to explain *why* the AI assigned a score. It breaks down the positive forces reducing default risk (timely taxes, digital footprint) and negative forces raising risk (cheque returns, high cash withdrawals).

---

## 3. Getting Started

### Prerequisites
* **Node.js**: v18+ (tested on v26)
* **Python**: v3.10+ (tested on v3.14)

### Automated Launch (Windows)
We have provided an automated batch file to launch the platform:
1. Double-click the `start_services.bat` script in the root directory.
2. It will open separate command prompts and run the FastAPI server, Express API, and React Client concurrently.

### Manual Launch

#### 1. Start Python AI Core
```bash
cd ai_service
# Activate virtual environment
.\venv\Scripts\activate
# Install requirements
pip install -r requirements.txt
# Launch API
python main.py
```

#### 2. Start Node.js Backend API
```bash
cd backend
npm install
npm start
```

#### 3. Start React Frontend Client
```bash
cd frontend
npm install
npm run dev
```

The React App will be accessible at `http://localhost:5173`.

---

## 4. Sandbox Profiles & Test Cases
We seeded 4 representative MSME profiles in the database:
1. **Rajesh Kirana Store (Safe)**: High volume of small UPI receipts, consistent growth, timely GST returns, stable headcount. *Outcome: Score ~850, Approved.*
2. **Kavita Fashion Boutique (Seasonal)**: Strong festive peaks (Diwali, marriage seasons), occasional minor tax delay. *Outcome: Score ~690, Conditionally Approved.*
3. **Ananya Electronics (High Risk)**: Declining sales, multiple cheque bounces, high cash leakage, employee layoffs. *Outcome: Score ~450, Rejected.*
4. **Apex Industrial Parts (Suspicious/Fraud)**: Shell company, massive credit spikes from a single partner with immediate reversals back. *Outcome: Flagged by Anomaly/Fraud Engine, Underwriting Suspended.*
