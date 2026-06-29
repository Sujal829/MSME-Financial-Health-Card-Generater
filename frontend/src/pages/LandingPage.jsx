import React from 'react';
import { ShieldCheck, Award, TrendingUp, Cpu, Building2, UserCircle2 } from 'lucide-react';

export default function LandingPage({ setView }) {
  return (
    <div className="min-h-screen flex flex-col justify-between p-6">
      {/* Header */}
      <header className="flex justify-between items-center max-w-7xl w-full mx-auto py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-700 flex items-center justify-center glow-green">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              CRED-INTEL AI
            </span>
            <span className="block text-[9px] text-slate-500 font-medium tracking-widest uppercase">
              Credit Intelligence Platform
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Account Aggregator Sandbox Ready
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto my-auto py-12 flex flex-col items-center">
        <div className="text-center max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 mb-4 hover:bg-emerald-50 transition-all duration-300">
            <ShieldCheck className="w-3.5 h-3.5" /> Next-Gen AI Underwriting for Credit-Invisible MSMEs
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 leading-tight">
            Bridging the Credit Gap for{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              Credit-Invisible MSMEs
            </span>
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Traditional banks ask for balance sheets and historical credit records. We analyze digital footprints—GST, UPI, EPFO, utility bills—to deliver instant, explainable risk models for digital lending ecosystems.
          </p>
        </div>

        {/* Portals Selector */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mt-4">
          {/* MSME Card */}
          <div
            onClick={() => setView('msme')}
            className="group relative rounded-2xl glass-panel p-8 cursor-pointer border border-slate-200 transition-all duration-500 hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-slate-100/60 flex flex-col justify-between h-[360px]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full group-hover:bg-emerald-500/20 transition-all duration-500 blur-xl"></div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                <UserCircle2 className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-800 group-hover:text-emerald-700 transition-colors">
                MSME Portal
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Grant digital consent to your alternative records (GST, UPI accounts, EPFO, electric bills), generate your Financial Health Card, simulate score improvements, and apply for working capital loans directly.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>EXPLORE BUSINESS PORTAL →</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-[10px] text-emerald-700 uppercase tracking-wider">
                Consent & Simulate
              </span>
            </div>
          </div>

          {/* Bank Officer Card */}
          <div
            onClick={() => setView('bank')}
            className="group relative rounded-2xl glass-panel p-8 cursor-pointer border border-slate-200 transition-all duration-500 hover:-translate-y-1 hover:border-amber-500/40 hover:bg-slate-100/60 flex flex-col justify-between h-[360px]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full group-hover:bg-amber-500/20 transition-all duration-500 blur-xl"></div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-purple-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                <Building2 className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-800 group-hover:text-amber-700 transition-colors">
                Bank Admin Portal
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Review loan applications with explainable AI (XAI) feature attributions. Analyze circular transaction alerts, fraud risk ratings, and industry benchmarking. Make data-driven credit underwriting decisions.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
              <span>ACCESS CREDIT WORKSPACE →</span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-[10px] text-amber-700 uppercase tracking-wider">
                Risk Engine Command
              </span>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl mt-16 border-t border-slate-200 pt-8 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center mb-2">
              <Award className="w-4 h-4 text-teal-600" />
            </div>
            <h4 className="font-semibold text-slate-800">Multi-Dimensional Score</h4>
            <p className="text-[10px] text-slate-500">Evaluates across 7 weighted cash-flow metrics</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
              <Cpu className="w-4 h-4 text-amber-700" />
            </div>
            <h4 className="font-semibold text-slate-800">Explainable AI (XAI)</h4>
            <p className="text-[10px] text-slate-500">Transparent credit scores with SHAP-like factors</p>
          </div>
          <div className="flex flex-col items-center col-span-2 md:col-span-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
            <h4 className="font-semibold text-slate-800">Real-Time Sync</h4>
            <p className="text-[10px] text-slate-500">Instant credit rating refreshes upon invoice updates</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-slate-600 border-t border-slate-200/60 pt-6 max-w-7xl w-full mx-auto">
        Designed for Fintech Hackathons & Bank Credit Automation • ULI, OCEN, and AA Sandbox Compliant • Version 1.0.0
      </footer>
    </div>
  );
}
