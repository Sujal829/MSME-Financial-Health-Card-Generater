import React, { useState, useEffect } from 'react';
import {
  Building, User, CheckCircle2, AlertTriangle, Play, RefreshCw, Sliders,
  HelpCircle, ChevronRight, IndianRupee, ArrowLeft, Send, Sparkles, LogOut,
  Calendar, Layers, TrendingUp, DollarSign, Users, Award, ShieldAlert, Cpu
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, AreaChart, Area, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import api from '../utils/api';

export default function MSMEPortal({ setView }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profile, setProfile] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  // Alternative Data Tab
  const [activeTab, setActiveTab] = useState('gst');

  // Left column sub tab
  const [leftSubTab, setLeftSubTab] = useState('breakdown');

  // Real-time updates simulator
  const [simType, setSimType] = useState('UPI');
  const [simUpiAmount, setSimUpiAmount] = useState('1500');
  const [simGstSales, setSimGstSales] = useState('420000');
  const [simGstPurchases, setSimGstPurchases] = useState('310000');
  const [simEpfoHeadcount, setSimEpfoHeadcount] = useState('5');
  const [simEpfoWage, setSimEpfoWage] = useState('75000');
  const [simMsg, setSimMsg] = useState('');

  // What-if simulator state
  const [whatIfSales, setWhatIfSales] = useState(0);
  const [whatIfBounces, setWhatIfBounces] = useState(0);
  const [whatIfLateGst, setWhatIfLateGst] = useState(0);
  const [whatIfCashWd, setWhatIfCashWd] = useState(10);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Loan application state
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanApplied, setLoanApplied] = useState(null);
  const [appliedStatus, setAppliedStatus] = useState(null);

  // Fetch profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  // Fetch detailed profile when selected
  useEffect(() => {
    if (selectedProfileId) {
      fetchProfileDetails(selectedProfileId);
    } else {
      setProfile(null);
      setEvaluation(null);
    }
  }, [selectedProfileId]);

  // Sync what-if defaults once evaluation is fetched
  useEffect(() => {
    if (evaluation && profile) {
      const gstLateCount = profile.gstData.filter(g => g.lateDays > 0).length;
      const bankBounces = profile.bankStatement.monthlySummary.reduce((acc, curr) => acc + curr.chequeBounces + curr.autoDebitFailures, 0);
      const avgSales = profile.gstData.reduce((acc, curr) => acc + curr.sales, 0) / profile.gstData.length;
      const cashRate = profile.bankStatement.monthlySummary.reduce((acc, curr) => acc + curr.cashWithdrawals, 0) / profile.bankStatement.monthlySummary.reduce((acc, curr) => acc + curr.totalDebits, 1) * 100;

      setWhatIfSales(Math.round(avgSales));
      setWhatIfBounces(bankBounces);
      setWhatIfLateGst(gstLateCount);
      setWhatIfCashWd(Math.round(cashRate));
      setWhatIfResult(null);
      setLoanApplied(null);
    }
  }, [evaluation]);

  const fetchProfiles = async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfileDetails = async (id) => {
    setLoading(true);
    try {
      const data = await api.getProfile(id);
      setProfile(data);
      if (data.consentGranted) {
        const evalData = await api.getEvaluation(id);
        setEvaluation(evalData);
      } else {
        setEvaluation(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    setConsentLoading(true);
    try {
      const data = await api.grantConsent(profile.id);
      setProfile(prev => ({ ...prev, consentGranted: true }));
      setEvaluation(data.evaluation);
    } catch (err) {
      console.error(err);
    } finally {
      setConsentLoading(false);
    }
  };

  const handleApplyLoan = async (e) => {
    e.preventDefault();
    if (!loanAmount || !loanPurpose) return;
    try {
      const app = await api.applyLoan(profile.id, loanAmount, loanPurpose);
      setLoanApplied(app);
      setAppliedStatus(app.status);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateUpdate = async () => {
    setSimMsg('Sending update package...');
    let payload = {};
    if (simType === 'UPI') {
      payload = { amount: simUpiAmount };
    } else if (simType === 'GST') {
      payload = { sales: simGstSales, purchases: simGstPurchases };
    } else if (simType === 'EPFO') {
      payload = { headcount: simEpfoHeadcount, totalWage: simEpfoWage };
    }

    try {
      const res = await api.simulateUpdate(profile.id, simType, payload);
      setSimMsg('Live Event Synced! AI Score Recalculated.');
      // Refresh profile data
      setTimeout(() => {
        fetchProfileDetails(profile.id);
        setSimMsg('');
      }, 1500);
    } catch (err) {
      setSimMsg(`Simulation error: ${err.message}`);
    }
  };

  const handleRunWhatIf = async () => {
    setWhatIfLoading(true);
    // calculate modified features
    const originalSales = profile.gstData.reduce((acc, curr) => acc + curr.sales, 0) / profile.gstData.length;

    // Scale features based on sliders:
    // Sales factor
    const salesFactor = whatIfSales / originalSales;
    // Bounces mapping
    const cheque_bounce_count = whatIfBounces;
    // Late files compliance
    const tax_compliance_score = 1.0 - (whatIfLateGst / profile.gstData.length);
    // Cash leakage
    const cash_leakage_rate = whatIfCashWd / 100;

    const modifications = {
      avg_monthly_revenue: originalSales * salesFactor,
      cheque_bounce_count,
      tax_compliance_score,
      cash_leakage_rate
    };

    try {
      const res = await api.runWhatIf(profile.id, modifications);
      setWhatIfResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setWhatIfLoading(false);
    }
  };

  // Chart Formats
  const getGstChartData = () => {
    if (!profile) return [];
    return profile.gstData.map(g => ({
      name: g.month,
      Sales: g.sales,
      Purchases: g.purchases,
      Tax: g.taxPaid
    }));
  };

  const getBankChartData = () => {
    if (!profile) return [];
    return profile.bankStatement.monthlySummary.map(b => ({
      name: b.month,
      Credits: b.totalCredits,
      Debits: b.totalDebits,
      ADB: b.averageDailyBalance
    }));
  };

  const getEpfoChartData = () => {
    if (!profile) return [];
    return profile.epfoData.map(e => ({
      name: e.month,
      Employees: e.headcount,
      Payroll: e.totalWage / 1000 // In thousands
    }));
  };

  const getRadarData = () => {
    if (!evaluation) return [];
    const { breakdown } = evaluation;
    return [
      { subject: 'Revenue Stability', A: breakdown.revenue_stability, fullMark: 1000 },
      { subject: 'GST Compliance', A: breakdown.gst_compliance, fullMark: 1000 },
      { subject: 'Cash Flow', A: breakdown.cash_flow, fullMark: 1000 },
      { subject: 'Employee Stability', A: breakdown.employee_growth, fullMark: 1000 },
      { subject: 'Digital Footprint', A: breakdown.digital_footprint, fullMark: 1000 },
      { subject: 'Bank Behavior', A: breakdown.bank_behavior, fullMark: 1000 },
      { subject: 'Sector Growth', A: breakdown.business_growth, fullMark: 1000 }
    ];
  };

  if (!selectedProfileId) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6">
        <button
          onClick={() => setView('landing')}
          className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Landing Page
        </button>

        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
            <Building className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">MSME Account Selection</h2>
          <p className="text-slate-600 text-sm mb-6">
            To view the MSME dashboard, please select one of the registered business profiles from the credit sandbox.
          </p>

          <div className="space-y-3">
            {profiles.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedProfileId(p.id)}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500/40 hover:bg-slate-100/60 cursor-pointer text-left transition-all duration-200 group"
              >
                <div>
                  <h4 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
                    {p.name}
                  </h4>
                  <span className="text-xs text-slate-500">{p.type} • {p.pan}</span>
                </div>
                <div className="flex items-center gap-2">
                  {p.consentGranted ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] text-emerald-400 font-semibold border border-emerald-500/20">
                      CONSENTED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[9px] text-amber-400 font-semibold border border-amber-500/20">
                      PENDING
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-xs">Accessing credit registry records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Top Navbar */}
      <nav className="flex justify-between items-center max-w-7xl w-full mx-auto pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedProfileId('')}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {profile.name}
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {profile.type}
              </span>
            </h1>
            <span className="text-xs text-slate-500">GSTIN: {profile.gstin} • Age: {profile.businessAgeMonths} Months</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className={`w-2 h-2 rounded-full ${profile.consentGranted ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            {profile.consentGranted ? 'Account Aggregator Linked' : 'Consent Action Required'}
          </span>
          <button
            onClick={() => setSelectedProfileId('')}
            className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <div className="max-w-7xl w-full mx-auto grid lg:grid-cols-3 gap-6 py-6 flex-1">

        {/* ==========================================
            LEFT PANEL: Consent / Score Gauge
           ========================================== */}
        <div className="space-y-6 lg:col-span-1">
          {/* Account Aggregator Screen (No Consent) */}
          {!profile.consentGranted ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full blur-xl"></div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-amber-400" /> Account Aggregator Consent
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Under traditional banking, you must upload 3 years of audited financials. Under ULI/OCEN sandbox rules, you can grant direct consent to verify your real-time bank statement, GST, EPFO, and electricity bills automatically.
              </p>

              <div className="space-y-3 mb-6 bg-slate-100/40 p-4 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">1. GST Tax Portal (credits/debits)</span>
                  <span className="text-emerald-400 font-semibold">Ready</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">2. UPI Merchant API (P2M ledgers)</span>
                  <span className="text-emerald-400 font-semibold">Ready</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">3. ICICI/HDFC AA Bank Statements</span>
                  <span className="text-emerald-400 font-semibold">Ready</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">4. EPFO Employee Registry</span>
                  <span className="text-emerald-400 font-semibold">Ready</span>
                </div>
              </div>

              <button
                onClick={handleGrantConsent}
                disabled={consentLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold text-sm transition glow-green flex items-center justify-center gap-2"
              >
                {consentLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying OTP via AA...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Link Digital Accounts & Score
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Score Card Screen (With Consent) */
            <>
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-bl-full blur-xl"></div>
                <span className="text-xs text-slate-500 font-medium tracking-wider uppercase mb-1">
                  Alternative Financial Health Score
                </span>

                {/* Score Number Circle */}
                <div className="relative my-6 flex items-center justify-center">
                  {/* Outer glow circle */}
                  <div className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border-4 ${evaluation?.score >= 800 ? 'border-emerald-500/30 bg-emerald-500/5 glow-green' :
                      (evaluation?.score >= 650 ? 'border-blue-500/30 bg-emerald-500/5 glow-green' : 'border-red-500/30 bg-red-500/5 glow-red')
                    }`}>
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                      {evaluation?.score}
                    </span>
                    <span className="text-[10px] text-slate-500">/ 1000</span>
                  </div>
                </div>

                <div className="space-y-2 w-full mt-2">
                  <div className="flex justify-between items-center px-4 py-2 rounded-xl bg-slate-100/60 border border-slate-200">
                    <span className="text-xs text-slate-600">Risk Assessment</span>
                    <span className={`text-xs font-bold ${evaluation?.risk_rating === 'Low Risk' ? 'text-emerald-400' :
                        (evaluation?.risk_rating === 'Medium Risk' ? 'text-blue-400' : 'text-red-400')
                      }`}>{evaluation?.risk_rating}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 rounded-xl bg-slate-100/60 border border-slate-200">
                    <span className="text-xs text-slate-600">Default Probability</span>
                    <span className="text-xs font-bold text-slate-900">{evaluation?.default_probability}%</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 rounded-xl bg-slate-100/60 border border-slate-200">
                    <span className="text-xs text-slate-600">Peer Segment</span>
                    <span className="text-xs text-slate-700 font-semibold">{evaluation?.segment.name}</span>
                  </div>
                </div>

                {evaluation?.is_anomaly && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 text-left">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Security Alert:</span> Unusual digital activity flags detected. Loan underwriting suspended.
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-panel Navigation for Breakdown, suggestions, and stress-tests */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex border-b border-slate-200">
                  {['breakdown', 'tips', 'resilience'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLeftSubTab(tab)}
                      className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition capitalize ${leftSubTab === tab
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-slate-600 hover:text-slate-800'
                        }`}
                    >
                      {tab === 'tips' ? 'Score Tips' : tab}
                    </button>
                  ))}
                </div>

                {/* Sub Tab: Breakdown */}
                {leftSubTab === 'breakdown' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-400" /> Multi-Dimensional Profile
                    </h4>
                    <div className="h-[200px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" stroke="#475569" tick={{ fontSize: 9 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 1000]} tick={{ fontSize: 8 }} stroke="#e2e8f0" />
                          <Radar name="MSME" dataKey="A" stroke="#059669" fill="#059669" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Tips */}
                {leftSubTab === 'tips' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-yellow-400" /> Credit Score Builder Tips
                    </h4>
                    <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                      {evaluation?.suggestions?.map((tip, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-100/60 border border-slate-200 text-xs text-left">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate-800">{tip.action}</span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {tip.impact}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-normal">{tip.details}</p>
                          <div className="flex gap-2 mt-1.5 text-[9px] text-slate-500">
                            <span>Difficulty: <strong className="text-slate-600">{tip.difficulty}</strong></span>
                            <span>•</span>
                            <span>Metric: <strong className="text-slate-600">{tip.metric}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Resilience (Stress Test) */}
                {leftSubTab === 'resilience' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-teal-400" /> Stress Test Prediction
                    </h4>
                    <p className="text-[10px] text-slate-600 leading-relaxed text-left">
                      AI stress test models the impact of a severe macroeconomic shock (20% sales contraction, utility payment failures).
                    </p>
                    {evaluation?.stress_test && (
                      <div className="grid grid-cols-2 gap-3 text-xs text-left">
                        <div className="p-3 rounded-lg bg-slate-100/60 border border-slate-200">
                          <span className="block text-[10px] text-slate-500">Stressed Score</span>
                          <strong className="text-lg text-white block mt-0.5 font-mono">{evaluation.stress_test.stressed_score}</strong>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-100/60 border border-slate-200">
                          <span className="block text-[10px] text-slate-500">Survival Runway</span>
                          <strong className="text-lg text-white block mt-0.5 font-mono">{evaluation.stress_test.survival_days} Days</strong>
                        </div>
                        <div className="col-span-2 p-3 rounded-lg bg-slate-100/60 border border-slate-200 flex justify-between items-center">
                          <span className="text-[10px] text-slate-500">Resilience Rating</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${evaluation.stress_test.resilience_rating === 'High Resiliency' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              (evaluation.stress_test.resilience_rating === 'Moderate Resiliency' ? 'bg-emerald-500/10 text-blue-400 border-emerald-200' : 'bg-red-500/10 text-red-400 border-red-500/20')
                            }`}>{evaluation.stress_test.resilience_rating}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Real-time Event Simulator */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Alternative Feed Simulator
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-4">
              Simulate transactional cash-flows arriving. The scoring engine recalculates the credit card dynamically.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {['UPI', 'GST', 'EPFO'].map(t => (
                <button
                  key={t}
                  onClick={() => setSimType(t)}
                  className={`py-1.5 rounded-lg border text-xs font-semibold transition ${simType === t
                      ? 'bg-slate-100 border-blue-500/50 text-blue-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Sim input panels */}
            <div className="space-y-3 mb-4">
              {simType === 'UPI' && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">UPI Credit Amount (₹)</label>
                  <input
                    type="number"
                    value={simUpiAmount}
                    onChange={(e) => setSimUpiAmount(e.target.value)}
                    className="w-full bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              )}
              {simType === 'GST' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Sales (₹)</label>
                    <input
                      type="number"
                      value={simGstSales}
                      onChange={(e) => setSimGstSales(e.target.value)}
                      className="w-full bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Purchases (₹)</label>
                    <input
                      type="number"
                      value={simGstPurchases}
                      onChange={(e) => setSimGstPurchases(e.target.value)}
                      className="w-full bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}
              {simType === 'EPFO' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Employee Count</label>
                    <input
                      type="number"
                      value={simEpfoHeadcount}
                      onChange={(e) => setSimEpfoHeadcount(e.target.value)}
                      className="w-full bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Wage Bill (₹)</label>
                    <input
                      type="number"
                      value={simEpfoWage}
                      onChange={(e) => setSimEpfoWage(e.target.value)}
                      className="w-full bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSimulateUpdate}
              className="w-full py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-900 flex items-center justify-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" /> Push Live Transaction Feed
            </button>

            {simMsg && (
              <span className="block text-center text-[10px] text-emerald-400 mt-2 font-medium">
                {simMsg}
              </span>
            )}
          </div>

        </div>

        {/* ==========================================
            RIGHT CONTENT: Alternative Data Tabs & Simulators
           ========================================== */}
        <div className="space-y-6 lg:col-span-2">

          {/* Data Footprints Tabbed panel */}
          <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/40">
              {[
                { id: 'gst', label: 'GST Filings', icon: Calendar },
                { id: 'upi', label: 'UPI Trans.', icon: TrendingUp },
                { id: 'bank', label: 'Bank Statement', icon: IndianRupee },
                { id: 'epfo', label: 'EPFO & Utilities', icon: Users }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 py-3 px-4 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${activeTab === t.id
                        ? 'border-blue-500 text-blue-400 bg-slate-50/20'
                        : 'border-transparent text-slate-600 hover:text-slate-800'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              {!profile.consentGranted ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                  <CheckCircle2 className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs">No active consent. Grant Account Aggregator consent to decrypt alternative financial charts.</p>
                </div>
              ) : (
                <>
                  {/* GST Panel */}
                  {activeTab === 'gst' && (
                    <div className="space-y-6">
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getGstChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }} />
                            <Bar dataKey="Sales" fill="#059669" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Purchases" fill="#64748b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* GST ledger summary */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                              <th className="py-2">Month</th>
                              <th className="py-2">Outward Sales</th>
                              <th className="py-2">Purchases</th>
                              <th className="py-2">Net Tax Paid</th>
                              <th className="py-2">Filing Delay</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.gstData.slice(-5).map((g, i) => (
                              <tr key={i} className="border-b border-slate-200/50 hover:bg-slate-100/20 text-slate-700">
                                <td className="py-2 font-medium">{g.month}</td>
                                <td className="py-2">₹{g.sales.toLocaleString('en-IN')}</td>
                                <td className="py-2">₹{g.purchases.toLocaleString('en-IN')}</td>
                                <td className="py-2">₹{g.taxPaid.toLocaleString('en-IN')}</td>
                                <td className="py-2">
                                  {g.lateDays > 0 ? (
                                    <span className="text-red-400 font-semibold">{g.lateDays} Days Late</span>
                                  ) : (
                                    <span className="text-emerald-400 font-semibold">On-Time</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* UPI Panel */}
                  {activeTab === 'upi' && (
                    <div className="space-y-6">
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={profile.upiData.slice(-60)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 9 }} />
                            <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }} />
                            <Area type="monotone" dataKey="amount" stroke="#14b8a6" fill="rgba(20, 184, 166, 0.1)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-100/30 border border-slate-200/40 p-3 rounded-xl">
                        💡 UPI transactions serve as cash-flow velocity signals. High transaction count indicates high customer footfall, providing direct confirmation of top-line revenue without audited tax certificates.
                      </p>
                    </div>
                  )}

                  {/* Bank Statement Panel */}
                  {activeTab === 'bank' && (
                    <div className="space-y-6">
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getBankChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }} />
                            <Line type="monotone" dataKey="ADB" stroke="#f59e0b" strokeWidth={2} />
                            <Line type="monotone" dataKey="Credits" stroke="#059669" strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bank ledger summary */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                              <th className="py-2">Month</th>
                              <th className="py-2">Total Credits</th>
                              <th className="py-2">Average Bal (ADB)</th>
                              <th className="py-2">Cheque Bounces</th>
                              <th className="py-2">End Bal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.bankStatement.monthlySummary.slice(-5).map((b, i) => (
                              <tr key={i} className="border-b border-slate-200/50 hover:bg-slate-100/20 text-slate-700">
                                <td className="py-2 font-medium">{b.month}</td>
                                <td className="py-2">₹{b.totalCredits.toLocaleString('en-IN')}</td>
                                <td className="py-2">₹{b.averageDailyBalance.toLocaleString('en-IN')}</td>
                                <td className="py-2 text-center">
                                  {b.chequeBounces > 0 ? (
                                    <span className="text-red-400 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded">{b.chequeBounces}</span>
                                  ) : (
                                    <span className="text-slate-500">-</span>
                                  )}
                                </td>
                                <td className="py-2 font-semibold">₹{b.endBalance.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* EPFO Panel */}
                  {activeTab === 'epfo' && (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* EPFO Headcount */}
                        <div className="bg-slate-100/30 p-4 rounded-xl border border-slate-200">
                          <h5 className="text-xs font-semibold text-slate-600 mb-3">EPFO Headcount Stability</h5>
                          <div className="h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={getEpfoChartData()}>
                                <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 9 }} />
                                <YAxis stroke="#475569" tick={{ fontSize: 9 }} />
                                <Tooltip />
                                <Line type="step" dataKey="Employees" stroke="#f59e0b" strokeWidth={2} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* EPFO Payroll */}
                        <div className="bg-slate-100/30 p-4 rounded-xl border border-slate-200">
                          <h5 className="text-xs font-semibold text-slate-600 mb-3">EPFO Payroll Outgoings (in Thousands)</h5>
                          <div className="h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={getEpfoChartData()}>
                                <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 9 }} />
                                <YAxis stroke="#475569" tick={{ fontSize: 9 }} />
                                <Tooltip />
                                <Bar dataKey="Payroll" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Utilities grid */}
                      <div>
                        <h5 className="text-xs font-semibold text-slate-600 mb-3">Utility Payments Compliance (Electricity Bills)</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {profile.utilityBills.slice(-4).map((u, i) => (
                            <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-100/20 text-center">
                              <span className="block text-[10px] text-slate-500 font-semibold">{u.month}</span>
                              <span className="block text-sm font-bold text-slate-900 py-1">₹{u.amount.toLocaleString('en-IN')}</span>
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${u.status.includes('Late') || u.status.includes('Penalty')
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-emerald-500/10 text-emerald-400'
                                }`}>{u.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* What-If Simulator and Loan Apply Grid */}
          {profile.consentGranted && evaluation && (
            <div className="grid md:grid-cols-2 gap-6">

              {/* What-If Simulator Card */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-blue-400" /> What-If Credit Score Simulator
                  </h4>
                  <p className="text-[10.5px] text-slate-600 leading-relaxed mb-5">
                    Model adjustments to your business operations. See how optimizing specific factors boosts your score.
                  </p>

                  <div className="space-y-4">
                    {/* Sales slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Target Monthly Sales</span>
                        <span className="text-slate-700 font-bold">₹{whatIfSales.toLocaleString('en-IN')}</span>
                      </div>
                      <input
                        type="range"
                        min={Math.round(profile.gstData[0].sales * 0.4)}
                        max={Math.round(profile.gstData[0].sales * 2.0)}
                        step={10000}
                        value={whatIfSales}
                        onChange={(e) => setWhatIfSales(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Bounces slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Cheque/ECS Bounces</span>
                        <span className={`font-bold ${whatIfBounces > 0 ? 'text-red-400' : 'text-slate-700'}`}>
                          {whatIfBounces} Bounces
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={6}
                        step={1}
                        value={whatIfBounces}
                        onChange={(e) => setWhatIfBounces(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Late files slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Late Tax Filings (per 12m)</span>
                        <span className={`font-bold ${whatIfLateGst > 0 ? 'text-amber-400' : 'text-slate-700'}`}>
                          {whatIfLateGst} late periods
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={12}
                        step={1}
                        value={whatIfLateGst}
                        onChange={(e) => setWhatIfLateGst(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Cash withdrawals slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Cash Leakage (ATM withdrawals %)</span>
                        <span className="text-slate-700 font-bold">{whatIfCashWd}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        step={5}
                        value={whatIfCashWd}
                        onChange={(e) => setWhatIfCashWd(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <button
                    onClick={handleRunWhatIf}
                    disabled={whatIfLoading}
                    className="py-2 px-4 rounded-xl bg-emerald-600/10 border border-emerald-200 hover:bg-emerald-600/20 text-blue-400 text-xs font-semibold transition"
                  >
                    {whatIfLoading ? 'Analyzing...' : 'Simulate Score'}
                  </button>

                  {whatIfResult && (
                    <div className="text-right">
                      <span className="block text-[9px] text-slate-500 uppercase font-semibold">Simulated Score</span>
                      <span className="text-xl font-extrabold text-slate-900 flex items-center gap-1.5 justify-end">
                        {whatIfResult.simulated_score}
                        <span className={`text-xs font-bold ${whatIfResult.improvement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {whatIfResult.improvement >= 0 ? `+${whatIfResult.improvement}` : whatIfResult.improvement}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Loan Program Application */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" /> Pre-Approved Loan recommendation
                  </h4>

                  {evaluation.loan_recommendation.decision === 'REJECTED' ? (
                    <div className="py-4 text-slate-500 text-xs text-center border-b border-slate-200/40">
                      <ShieldAlert className="w-8 h-8 text-red-500/40 mx-auto mb-2" />
                      We cannot extend credit to this profile due to structural risk parameters. Review factors in the officer logs.
                    </div>
                  ) : (
                    <>
                      <p className="text-[10.5px] text-slate-600 leading-relaxed mb-4">
                        Based on your alternative score of <span className="text-blue-400 font-bold">{evaluation.score}</span>, the risk engine recommend:
                      </p>

                      <div className="grid grid-cols-3 gap-2 bg-slate-100/50 border border-slate-200/80 p-3 rounded-xl mb-4 text-center">
                        <div>
                          <span className="block text-[9px] text-slate-500 uppercase font-semibold">Max Capital</span>
                          <span className="text-sm font-bold text-slate-900">₹{evaluation.loan_recommendation.amount_inr.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-500 uppercase font-semibold">Interest Rate</span>
                          <span className="text-sm font-bold text-emerald-400">{evaluation.loan_recommendation.interest_rate_pct}% p.a.</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-500 uppercase font-semibold">Tenure</span>
                          <span className="text-sm font-bold text-slate-900">{evaluation.loan_recommendation.tenure_months}m</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Loan Apply Form */}
                  {evaluation.loan_recommendation.decision !== 'REJECTED' && !loanApplied && (
                    <form onSubmit={handleApplyLoan} className="space-y-3">
                      <div>
                        <label className="block text-[9.5px] text-slate-500 mb-1">Requested Loan Amount (₹)</label>
                        <input
                          type="number"
                          required
                          max={evaluation.loan_recommendation.amount_inr}
                          placeholder={`Max ₹${evaluation.loan_recommendation.amount_inr.toLocaleString('en-IN')}`}
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(e.target.value)}
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] text-slate-500 mb-1">Purpose of Loan</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Purchase inventory, expand storefront"
                          value={loanPurpose}
                          onChange={(e) => setLoanPurpose(e.target.value)}
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-black"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-800 font-semibold text-xs transition"
                      >
                        Submit Underwriting Request
                      </button>
                    </form>
                  )}

                  {loanApplied && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-100/40 text-xs">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-600">Application Status</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${appliedStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            (appliedStatus === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-blue-400 border-emerald-200')
                          }`}>{appliedStatus}</span>
                      </div>
                      <div className="space-y-1.5 text-slate-600 mt-2 pt-2 border-t border-slate-200/60">
                        <p><span className="text-slate-500">Ref:</span> {loanApplied.id}</p>
                        <p><span className="text-slate-500">Amount:</span> ₹{loanApplied.requestedAmount.toLocaleString('en-IN')}</p>
                        <p><span className="text-slate-500">Note:</span> A credit officer has been assigned. You can review decisions in the Bank Officer Portal.</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
