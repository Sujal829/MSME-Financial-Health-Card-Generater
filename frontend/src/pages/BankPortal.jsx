import React, { useState, useEffect } from 'react';
import {
  Building2, Award, ShieldAlert, Sparkles, Check, X, RefreshCw, ArrowLeft,
  IndianRupee, TrendingUp, Users, AlertCircle, FileText, CheckCircle2, ChevronRight, Eye, Cpu
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line, CartesianGrid
} from 'recharts';
import api from '../utils/api';

export default function BankPortal({ setView }) {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [msmeDetails, setMsmeDetails] = useState(null);
  const [msmeEval, setMsmeEval] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Officer decision states
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');

  // Theme Colors for Charts
  const primaryColor = '#059669';
  const gridColor = '#e2e8f0';
  const axisColor = '#475569';
  const tooltipBg = '#ffffff';
  const tooltipBorder = '#cbd5e1';
  const tooltipTextColor = '#0f172a';

  useEffect(() => {
    fetchLoans();
  }, []);

  useEffect(() => {
    if (selectedLoan) {
      fetchLoanDetails(selectedLoan);
    } else {
      setMsmeDetails(null);
      setMsmeEval(null);
    }
  }, [selectedLoan]);

  const fetchLoans = async () => {
    setLoadingList(true);
    try {
      const data = await api.getLoans();
      // Sort latest first
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLoans(data);
      if (data.length > 0 && !selectedLoan) {
        setSelectedLoan(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchLoanDetails = async (loan) => {
    setLoadingDetails(true);
    try {
      const pData = await api.getProfile(loan.msmeId);
      setMsmeDetails(pData);

      const evalData = await api.getEvaluation(loan.msmeId);
      setMsmeEval(evalData);

      // Pre-fill approved amount with recommended or requested
      setApprovedAmount(loan.aiRecommendation?.amount_inr || loan.requestedAmount);
      setDecisionRemarks('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDecision = async (status) => {
    if (!selectedLoan) return;
    setActionLoading(true);
    try {
      const remarks = decisionRemarks || `${status === 'APPROVED' ? 'Approved' : 'Rejected'} by credit officer based on alternative score and risk parameters.`;
      const amt = status === 'APPROVED' ? approvedAmount : 0;

      const updated = await api.makeDecision(selectedLoan.id, status, remarks, amt);

      // Refresh local lists
      setLoans(prev => prev.map(l => l.id === selectedLoan.id ? updated : l));
      setSelectedLoan(updated);
      setDecisionRemarks('');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // SHAP Chart Format
  const getShapData = () => {
    if (!msmeEval) return [];
    // Filter explanations to show in chart
    return msmeEval.explanations.map(e => ({
      name: e.display_name,
      Impact: parseFloat((e.impact * 100).toFixed(2)),
      effect: e.effect,
      value: e.value
    })).sort((a, b) => Math.abs(b.Impact) - Math.abs(a.Impact)); // Sort by magnitude
  };

  // Generate dynamic Natural Language summary for the AI Copilot
  const generateCopilotSummary = () => {
    if (!msmeEval || !msmeDetails) return null;
    const { score, explanations, is_anomaly, suspicious_flags } = msmeEval;

    const strengths = [];
    const risks = [];

    // Sort attributions by impact
    const sortedAttributions = [...explanations].sort((a, b) => b.impact - a.impact);

    explanations.forEach(e => {
      if (e.impact < -0.08) {
        if (e.feature === 'tax_compliance_score') strengths.push("Excellent tax discipline with 100% on-time GST filing periods.");
        if (e.feature === 'digital_payment_ratio') strengths.push("High digital cash-flow footprints (high volume of UPI merchant receipts).");
        if (e.feature === 'avg_monthly_revenue') strengths.push(`Strong operating scale showing average monthly sales of ₹${Math.round(e.value).toLocaleString('en-IN')}.`);
        if (e.feature === 'cash_flow_stability') strengths.push("High sales stability with low coefficient of variation in daily UPI receipts.");
        if (e.feature === 'liquidity_runway') strengths.push("Healthy Average Daily Balance (ADB) maintaining a liquid runway.");
      } else if (e.impact > 0.08) {
        if (e.feature === 'cheque_bounce_count') risks.push(`Repetitive cash-flow stress evidenced by ${Math.round(e.value)} cheque or auto-debit return penalties.`);
        if (e.feature === 'cash_leakage_rate') risks.push(`Suspicious cash leakage rate: ${Math.round(e.value * 100)}% of debits occur via ATM cash withdrawals.`);
        if (e.feature === 'customer_diversity_hhi') risks.push("High client concentration risks; over 80% of sales depend on a single buyer.");
        if (e.feature === 'tax_compliance_score') risks.push("Chronic tax defaults with multiple delayed GST filing periods.");
      }
    });

    // Add baseline defaults
    if (strengths.length === 0) strengths.push("Consistent operational age and active registration on MCA.");
    if (risks.length === 0) risks.push("Standard sector-wide operational risk profile.");

    let recommendation = "";
    if (is_anomaly) {
      recommendation = "SUSPEND UNDERWRITING. The anomaly engine flags collusive transactions or severe discrepancies in GST vs. Bank statement credits. High probability of artificial revenue amplification.";
    } else if (score >= 800) {
      recommendation = `RECOMMEND IMMEDIATE APPROVAL of ₹${msmeEval.loan_recommendation.amount_inr.toLocaleString('en-IN')} at ${msmeEval.loan_recommendation.interest_rate_pct}% interest rate. Profile is low-risk, cash-flow stable, and tax compliant.`;
    } else if (score >= 650) {
      recommendation = `RECOMMEND CONDITIONAL APPROVAL of ₹${msmeEval.loan_recommendation.amount_inr.toLocaleString('en-IN')} with strict 12-24 month tenure. Seasonal fluctuations are visible, but baseline compliance is intact.`;
    } else {
      recommendation = "RECOMMEND REJECTION. High credit default risk prediction. Structural cash-flow deficits, low daily balances, or multiple return charges exceed acceptable risk thresholds.";
    }

    return { strengths, risks, recommendation };
  };

  const copilot = generateCopilotSummary();

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Top Navbar */}
      <nav className="flex justify-between items-center max-w-7xl w-full mx-auto pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('landing')}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Credit Intel Underwriting Cockpit
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Risk Admin Workspace
              </span>
            </h1>
            <span className="text-xs text-slate-500">Evaluating MSME Loan Proposals via Alternate Financial Profiles</span>
          </div>
        </div>

        <button
          onClick={fetchLoans}
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </nav>

      {/* Main Body Grid */}
      <div className="max-w-7xl w-full mx-auto grid lg:grid-cols-4 gap-6 py-6 flex-1">

        {/* ==========================================
            LEFT SIDEBAR: Loan Proposals List (1/4 col)
           ========================================== */}
        <div className="lg:col-span-1 glass-panel rounded-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[750px]">
          <div className="p-4 border-b border-slate-200 bg-slate-100/25">
            <h3 className="text-sm font-bold text-slate-900">Underwriting Pipelines</h3>
            <span className="text-[10px] text-slate-500">{loans.length} applications registered</span>
          </div>

          <div className="divide-y divide-slate-200 overflow-y-auto flex-1">
            {loadingList ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading queue...
              </div>
            ) : loans.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No active applications</div>
            ) : (
              loans.map(l => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLoan(l)}
                  className={`p-4 cursor-pointer text-left transition-all ${selectedLoan?.id === l.id
                      ? 'bg-slate-100/60 border-l-2 border-emerald-600'
                      : 'hover:bg-slate-100/20'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-xs text-slate-800 block truncate w-32">{l.msmeName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${l.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        (l.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100')
                      }`}>{l.status}</span>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-slate-500">Score: <strong className="text-slate-700">{l.score}</strong></span>
                    <span className="text-[10px] text-slate-700 font-semibold">₹{l.requestedAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ==========================================
            RIGHT MAIN: Detailed Application Cockpit (3/4 col)
           ========================================== */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedLoan ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-200 text-center text-slate-500 flex flex-col items-center justify-center h-[500px]">
              <FileText className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm">Select an MSME loan request from the pipeline list to run the credit dashboard.</p>
            </div>
          ) : loadingDetails || !msmeDetails || !msmeEval ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-200 text-center text-slate-500 flex flex-col items-center justify-center h-[500px]">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-xs">Generating AI credit risk models, segmentation clusters, and attributions...</p>
            </div>
          ) : (
            <>
              {/* Profile Overview Header Card */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 grid md:grid-cols-4 gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full blur-xl"></div>

                <div className="md:col-span-1 flex flex-col items-center justify-center border-r border-slate-200 pr-6 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Financial Health Score</span>

                  {/* Score Number Circle */}
                  <div className="relative my-3 flex items-center justify-center">
                    <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 ${msmeEval.score >= 800 ? 'border-emerald-500/30 bg-emerald-500/5 glow-green' :
                        (msmeEval.score >= 650 ? 'border-emerald-600/30 bg-emerald-50 glow-green' : 'border-red-500/30 bg-red-500/5 glow-red')
                      }`}>
                      <span className="text-2xl font-extrabold tracking-tight text-slate-900">{msmeEval.score}</span>
                      <span className="text-[9px] text-slate-500">/ 1000</span>
                    </div>
                  </div>

                  <span className={`text-[10.5px] font-bold mt-1 ${msmeEval.risk_rating === 'Low Risk' ? 'text-emerald-400' :
                      (msmeEval.risk_rating === 'Medium Risk' ? 'text-amber-500' : 'text-red-400')
                    }`}>{msmeEval.risk_rating}</span>
                </div>

                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">MSME Applicant</span>
                    <strong className="text-slate-800 text-sm block mt-0.5">{msmeDetails.name}</strong>
                    <span className="text-[10px] text-slate-600">{msmeDetails.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PAN / GSTIN</span>
                    <strong className="text-slate-700 block mt-0.5">{msmeDetails.pan}</strong>
                    <span className="text-[10px] text-slate-600">{msmeDetails.gstin}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Registry Status</span>
                    <span className="inline-flex items-center gap-1 mt-1 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      <Check className="w-3.5 h-3.5" /> Active on MCA
                    </span>
                  </div>
                  <div className="border-t border-slate-200/60 pt-3">
                    <span className="text-slate-500 block">Requested Capital</span>
                    <strong className="text-slate-800 text-sm block mt-0.5">₹{selectedLoan.requestedAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="border-t border-slate-200/60 pt-3">
                    <span className="text-slate-500 block">AI Recommended Loan</span>
                    <strong className="text-emerald-400 text-sm block mt-0.5">
                      {msmeEval.loan_recommendation.decision === 'REJECTED'
                        ? 'Not Recommended'
                        : `₹${msmeEval.loan_recommendation.amount_inr.toLocaleString('en-IN')}`}
                    </strong>
                  </div>
                  <div className="border-t border-slate-200/60 pt-3">
                    <span className="text-slate-500 block">AI Rec. Interest & Tenure</span>
                    <strong className="text-slate-700 block mt-0.5">
                      {msmeEval.loan_recommendation.decision === 'REJECTED'
                        ? '-'
                        : `${msmeEval.loan_recommendation.interest_rate_pct}% / ${msmeEval.loan_recommendation.tenure_months} Months`}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Warnings and Anomalies Panel */}
              {(msmeEval.is_anomaly || msmeEval.suspicious_flags.length > 0) && (
                <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20">
                  <h4 className="text-xs font-bold text-red-400 flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4.5 h-4.5" /> CRITICAL UNDERWRITING WARNINGS
                  </h4>
                  <ul className="space-y-1.5 text-xs text-red-300 list-disc pl-5">
                    {msmeEval.suspicious_flags.map((flag, idx) => (
                      <li key={idx} className="leading-relaxed">{flag}</li>
                    ))}
                    {msmeEval.is_anomaly && (
                      <li className="leading-relaxed font-semibold">Isolation Forest model flagged overall transactions layout as an extreme anomaly. High risk of fraudulent bookkeeping.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Copilot Natural Language Insights & Explainability SHAP Charts */}
              <div className="grid md:grid-cols-2 gap-6">

                {/* AI Copilot Advisor */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-warning" /> AI Credit Copilot Analysis
                    </h4>

                    {copilot && (
                      <div className="space-y-4 text-[11px] leading-relaxed">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">Core Strengths</span>
                          <ul className="space-y-1 text-slate-700 list-inside list-decimal">
                            {copilot.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>

                        <div>
                          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block mb-1">Vulnerabilities</span>
                          <ul className="space-y-1 text-slate-700 list-inside list-disc">
                            {copilot.risks.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>

                        <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-1">Risk Action Guideline</span>
                          <p className="text-slate-700 font-medium">{copilot.recommendation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SHAP Chart (XAI) */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" /> Explainable AI (SHAP Feature Attribution)
                  </h4>
                  <p className="text-[10px] text-slate-500 mb-4">
                    Shows positive attributions (reducing risk, green) vs negative attributions (increasing risk, red).
                  </p>

                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={getShapData().slice(0, 5)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis type="number" stroke={axisColor} tick={{ fontSize: 9 }} />
                        <YAxis type="category" dataKey="name" stroke={axisColor} tick={{ fontSize: 9 }} width={110} />
                        <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipTextColor }} />
                        <Bar dataKey="Impact" radius={[0, 4, 4, 0]}>
                          {getShapData().slice(0, 5).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.Impact < 0 ? '#10b981' : '#ef4444'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Peer Benchmarking & Sector Analysis */}
              {/* Stress & Forensics Advanced Analytics Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Advanced Stress Test Panel */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4 text-left">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-purple-400" /> Credit Stress Test Simulation
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Predicting MSME performance under severe macroeconomic stress parameters (e.g. 20% sales contraction, utility defaults).
                  </p>

                  {msmeEval.stress_test && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-100/60 border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase">Stressed Score</span>
                        <strong className="text-base text-slate-800 block mt-1 font-mono">{msmeEval.stress_test.stressed_score} / 1000</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-100/60 border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase">Runway Under Shock</span>
                        <strong className="text-base text-slate-800 block mt-1 font-mono">{msmeEval.stress_test.survival_days} Days</strong>
                      </div>
                      <div className="col-span-2 p-3 rounded-xl bg-slate-100/60 border border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Resilience Index</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${msmeEval.stress_test.resilience_rating === 'High Resiliency' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            (msmeEval.stress_test.resilience_rating === 'Moderate Resiliency' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-500/10 text-red-400 border-red-500/20')
                          }`}>{msmeEval.stress_test.resilience_rating}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Forensics / Integrity Audit Panel */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4 text-left">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-400" /> Transaction Forensics & Fraud Audit
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Algorithmic auditing of circular transactions, bank deposits mismatch, and cash diversion.
                  </p>

                  {msmeEval.forensics && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-100/60 border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase">Circular Flow Prob.</span>
                        <strong className={`text-base block mt-1 font-mono ${msmeEval.forensics.circular_flow_probability > 40 ? 'text-red-400' : 'text-emerald-400'
                          }`}>{msmeEval.forensics.circular_flow_probability}%</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-100/60 border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase">Book Integrity Score</span>
                        <strong className={`text-base block mt-1 font-mono ${msmeEval.forensics.revenue_integrity_score > 60 ? 'text-emerald-400' : 'text-red-400'
                          }`}>{msmeEval.forensics.revenue_integrity_score} / 100</strong>
                      </div>
                      <div className="col-span-2 p-3 rounded-xl bg-slate-100/60 border border-slate-200">
                        <span className="block text-[9px] text-slate-500 uppercase font-semibold mb-1">Forensic Warnings</span>
                        {msmeEval.forensics.flags && msmeEval.forensics.flags.length > 0 ? (
                          <ul className="text-[10px] text-red-300 list-disc pl-4 space-y-0.5">
                            {msmeEval.forensics.flags.map((flag, idx) => (
                              <li key={idx}>{flag}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold">No critical transaction anomalies flagged.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" /> Sector Peer Benchmarking
                </h4>

                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Underwriting Cohort</span>
                    <strong className="text-sm text-white block mt-1">{msmeEval.segment.name}</strong>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Applicant Health Score</span>
                    <strong className="text-base text-emerald-400 block mt-1">{msmeEval.score}</strong>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Cohort Average Score</span>
                    <strong className="text-base text-slate-700 block mt-1">{msmeEval.segment.peer_average_score}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-4 leading-relaxed bg-slate-100/20 p-3 rounded-xl border border-slate-200/40">
                  💡 MSMEs vary widely across sectors. K-Means clustering groups the business with peers (e.g. food stalls vs. spare parts factories) so credit officers do not penalize a small retailer for having lower average balances than a manufacturer.
                </p>
              </div>

              {/* Credit Officer Decision Workspace */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-4">Underwriting Decision Desk</h4>

                {selectedLoan.status !== 'PENDING' ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-100/40 text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-600">Loan Status</span>
                      <strong className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${selectedLoan.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>{selectedLoan.status}</strong>
                    </div>
                    <p className="text-slate-600 mt-2"><span className="text-slate-500">Remarks:</span> {selectedLoan.decisionRemarks}</p>
                    {selectedLoan.status === 'APPROVED' && (
                      <p className="text-slate-600 mt-1"><span className="text-slate-500">Approved Disbursed Capital:</span> <strong>₹{selectedLoan.approvedAmount?.toLocaleString('en-IN')}</strong></p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-3 border-t border-slate-200 pt-2">Authorized by {selectedLoan.officerDecisionBy} on {new Date(selectedLoan.decisionDate).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10.5px] text-slate-600 mb-1">Approved Principal Amount (₹)</label>
                        <input
                          type="number"
                          value={approvedAmount}
                          onChange={(e) => setApprovedAmount(e.target.value)}
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] text-slate-600 mb-1">Underwriting remarks / Conditions</label>
                        <input
                          type="text"
                          placeholder="Write decision rationale..."
                          value={decisionRemarks}
                          onChange={(e) => setDecisionRemarks(e.target.value)}
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-black"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <button
                        onClick={() => handleDecision('REJECTED')}
                        disabled={actionLoading}
                        className="py-2.5 px-6 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs transition flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Reject Loan Proposal
                      </button>

                      <button
                        onClick={() => handleDecision('APPROVED')}
                        disabled={actionLoading || msmeEval.is_anomaly}
                        className={`py-2.5 px-6 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 ${msmeEval.is_anomaly
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white glow-green'
                          }`}
                      >
                        <Check className="w-4 h-4" /> Approve & Disburse Capital
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </>
          )}

        </div>

      </div>
    </div>
  );
}
