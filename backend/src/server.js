const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const db = require('./utils/db');

const app = express();
const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8080';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Seed the DB with generated mock data if empty
function seedDatabase() {
  const existingProfiles = db.get('profiles');
  if (existingProfiles.length === 0) {
    console.log("Database is empty. Seeding from shared/mock_data.json...");
    const mockDataPath = path.join(__dirname, '..', '..', 'shared', 'mock_data.json');
    
    if (fs.existsSync(mockDataPath)) {
      const mockRaw = fs.readFileSync(mockDataPath, 'utf-8');
      const mockProfiles = JSON.parse(mockRaw);
      
      mockProfiles.forEach(p => {
        // Initialize consent as false
        db.insert('profiles', {
          ...p,
          consentGranted: false,
          consentDate: null
        });
        db.log(p.id, 'SYSTEM', `Initial profile seeded for ${p.name}`);
      });
      console.log(`Seeded ${mockProfiles.length} profiles successfully.`);
    } else {
      console.warn("WARNING: shared/mock_data.json not found! Run the mock data generator first.");
    }
  }
}

// Initialize database data
seedDatabase();

// ==========================================
// API Routes
// ==========================================

// 1. Get all MSME profiles (for onboarding/login selection)
app.get('/api/profiles', (req, res) => {
  try {
    const profiles = db.get('profiles').map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      gstin: p.gstin,
      pan: p.pan,
      businessAgeMonths: p.businessAgeMonths,
      mcaStatus: p.mcaStatus,
      geolocation: p.geolocation,
      consentGranted: p.consentGranted
    }));
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get detailed MSME profile (requires consent or will show raw info)
app.get('/api/profiles/:id', (req, res) => {
  try {
    const profile = db.findOne('profiles', { id: req.params.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Grant Consent (simulates Account Aggregator auth)
app.post('/api/profiles/:id/consent', async (req, res) => {
  try {
    const profile = db.findOne('profiles', { id: req.params.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    // Update consent status
    db.update('profiles', profile.id, {
      consentGranted: true,
      consentDate: new Date().toISOString()
    });
    
    db.log(profile.id, 'SYSTEM', 'User granted consent via Account Aggregator.');
    
    // Auto-trigger initial AI evaluation
    const updatedProfile = db.findOne('profiles', { id: req.params.id });
    let evaluationResult = null;
    
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/predict`, updatedProfile, { proxy: false });
      evaluationResult = response.data;
      
      // Store evaluation in database
      const existingEval = db.findOne('evaluations', { msmeId: profile.id });
      if (existingEval) {
        db.update('evaluations', existingEval.id, { result: evaluationResult });
      } else {
        db.insert('evaluations', {
          msmeId: profile.id,
          result: evaluationResult
        });
      }
      db.log(profile.id, 'SYSTEM', `AI Risk Engine completed evaluation. Score: ${evaluationResult.score}/1000.`);
    } catch (aiErr) {
      console.error("Failed to connect to Python AI Service:", aiErr.message);
      db.log(profile.id, 'SYSTEM', `AI Engine evaluation failed: ${aiErr.message}`);
    }

    res.json({ 
      success: true, 
      consentGranted: true, 
      evaluation: evaluationResult 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get AI Evaluation Report for an MSME
app.get('/api/profiles/:id/evaluation', (req, res) => {
  try {
    const profile = db.findOne('profiles', { id: req.params.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    if (!profile.consentGranted) {
      return res.status(403).json({ error: 'Consent not granted yet for this business.' });
    }
    
    const evaluation = db.findOne('evaluations', { msmeId: req.params.id });
    if (!evaluation) return res.status(404).json({ error: 'Evaluation report not generated yet.' });
    
    res.json(evaluation.result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Apply for a Loan
app.post('/api/profiles/:id/apply', (req, res) => {
  try {
    const profile = db.findOne('profiles', { id: req.params.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const evalReport = db.findOne('evaluations', { msmeId: req.params.id });
    if (!evalReport) return res.status(400).json({ error: 'Run AI evaluation before applying for a loan.' });
    
    const { requestedAmount, purpose } = req.body;
    
    const loanApp = db.insert('loans', {
      msmeId: profile.id,
      msmeName: profile.name,
      requestedAmount: parseInt(requestedAmount),
      purpose,
      aiRecommendation: evalReport.result.loan_recommendation,
      score: evalReport.result.score,
      status: evalReport.result.loan_recommendation.decision === 'REJECTED' ? 'REJECTED' : 'PENDING',
      decisionRemarks: evalReport.result.loan_recommendation.reason,
      officerDecisionBy: null,
      decisionDate: null
    });
    
    db.log(profile.id, 'LOAN', `Submitted loan application for ₹${requestedAmount}. Status: ${loanApp.status}`);
    res.json(loanApp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get all Loan applications (Bank Portal)
app.get('/api/loans', (req, res) => {
  try {
    const loans = db.get('loans');
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Make a decision on a loan application (Bank Portal)
app.post('/api/loans/:id/decision', (req, res) => {
  try {
    const { status, remarks, approvedAmount } = req.body; // status: 'APPROVED', 'REJECTED'
    
    const loanApp = db.findOne('loans', { id: req.params.id });
    if (!loanApp) return res.status(404).json({ error: 'Loan application not found' });
    
    const updatedLoan = db.update('loans', loanApp.id, {
      status,
      decisionRemarks: remarks,
      approvedAmount: status === 'APPROVED' ? parseInt(approvedAmount) : 0,
      officerDecisionBy: 'Credit Officer - John Doe',
      decisionDate: new Date().toISOString()
    });
    
    db.log(loanApp.msmeId, 'LOAN', `Loan application ${loanApp.id} was ${status} by officer. Approved: ₹${approvedAmount || 0}`);
    res.json(updatedLoan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Forecast Future Sales
app.get('/api/profiles/:id/forecast', async (req, res) => {
  try {
    const profile = db.findOne('profiles', { id: req.params.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const salesHistory = profile.gstData.map(g => g.sales);
    
    const response = await axios.post(`${AI_SERVICE_URL}/api/forecast`, {
      sales_history: salesHistory
    }, { proxy: false });
    
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. What-If Score Simulator
app.post('/api/profiles/:id/whatif', async (req, res) => {
  try {
    const profile = db.findOne('profiles', { id: req.params.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const response = await axios.post(`${AI_SERVICE_URL}/api/whatif`, {
      profile: profile,
      modifications: req.body.modifications
    }, { proxy: false });
    
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Simulate Live alternative transaction arrival (Real-time updates)
app.post('/api/profiles/:id/simulate-update', async (req, res) => {
  try {
    const profile = db.findOne('profiles', { id: req.params.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const { type, payload } = req.body; // type: 'UPI' or 'GST' or 'EPFO'
    
    let updatedProfile = { ...profile };
    let logMsg = '';
    
    if (type === 'UPI') {
      const amount = parseFloat(payload.amount);
      updatedProfile.upiData.push({
        date: new Date().toISOString().slice(0, 10),
        amount,
        type: 'Credit',
        status: 'Success',
        rating: '5.0'
      });
      
      // Update bank statement transactions and summary
      updatedProfile.bankStatement.transactions.push({
        date: new Date().toISOString().slice(0, 10),
        amount,
        type: 'Credit',
        category: 'UPI',
        description: 'UPI/LiveTx/Simulated'
      });
      
      // Add credit to current month summary
      const currentMonth = new Date().toISOString().slice(0, 7);
      const summaryList = updatedProfile.bankStatement.monthlySummary;
      const mIdx = summaryList.findIndex(s => s.month === currentMonth);
      if (mIdx !== -1) {
        summaryList[mIdx].totalCredits += amount;
        summaryList[mIdx].averageDailyBalance += amount * 0.5;
        summaryList[mIdx].endBalance += amount;
      }
      logMsg = `Received real-time UPI credit payment of ₹${amount}.`;
      
    } else if (type === 'GST') {
      const { sales, purchases } = payload;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const taxPaid = sales * 0.18 - purchases * 0.18;
      
      updatedProfile.gstData.push({
        month: currentMonth,
        sales: parseInt(sales),
        purchases: parseInt(purchases),
        taxPaid: Math.round(taxPaid),
        filingDate: new Date().toISOString().slice(0, 10),
        dueDate: `${currentMonth}-20`,
        lateDays: 0,
        status: "Filed"
      });
      logMsg = `New GST filing submitted for ${currentMonth}: Sales ₹${sales}, tax paid ₹${taxPaid}.`;
      
    } else if (type === 'EPFO') {
      const { headcount, totalWage } = payload;
      const currentMonth = new Date().toISOString().slice(0, 7);
      updatedProfile.epfoData.push({
        month: currentMonth,
        headcount: parseInt(headcount),
        totalWage: parseInt(totalWage),
        paymentDate: new Date().toISOString().slice(0, 10),
        dueDate: `${currentMonth}-15`,
        lateDays: 0
      });
      logMsg = `EPFO payroll submission: staff headcount ${headcount}, wage bill ₹${totalWage}.`;
    }
    
    // Save updated profile
    db.update('profiles', profile.id, updatedProfile);
    db.log(profile.id, type, logMsg);
    
    // Trigger AI Re-evaluation
    let evaluationResult = null;
    if (profile.consentGranted) {
      try {
        const response = await axios.post(`${AI_SERVICE_URL}/api/predict`, updatedProfile, { proxy: false });
        evaluationResult = response.data;
        
        const existingEval = db.findOne('evaluations', { msmeId: profile.id });
        if (existingEval) {
          db.update('evaluations', existingEval.id, { result: evaluationResult });
        }
        db.log(profile.id, 'SYSTEM', `AI Engine auto-recalculated score: ${evaluationResult.score}/1000.`);
      } catch (aiErr) {
        console.error("AI Re-evaluation failed:", aiErr.message);
      }
    }
    
    res.json({
      success: true,
      message: "Data simulated successfully.",
      evaluation: evaluationResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Get live audit log stream
app.get('/api/profiles/:id/audit-logs', (req, res) => {
  try {
    const logs = db.find('audit_logs', { msmeId: req.params.id });
    // Sort logs latest first
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
