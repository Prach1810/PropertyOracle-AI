// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App
import React, { useState } from 'react';

function App() {
  const [address, setAddress] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const startAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setLogs([]);
    
    // Simulate Agent Steps
    const steps = [
      "Initializing PropertyOracle Agent...",
      "Fetching data from Zillow API...",
      "Cross-referencing with MongoDB tax records...",
      "IDENTIFIED DISCREPANCY: Square footage mismatch found.",
      "Analyzing neighborhood crime & school ratings...",
      "Finalizing brief..."
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setIsAnalyzing(false);
          setShowResult(true);
        }
      }, (index + 1) * 800);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
  <div className="max-w-7xl mx-auto">
    {/* Header */}
    <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-600">
          PropertyOracle AI
        </h1>
        <p className="text-slate-500 text-sm italic"> See the comprehensive picture before purchasing your home</p>
      </div>
      <div className="px-3 py-1 rounded-full border border-emerald-500 bg-emerald-50 text-emerald-700 text-xs font-mono font-bold">
        Agent Status: Online
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        <form onSubmit={startAnalysis} className="flex gap-3">
          <input 
            type="text" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste Zillow URL or Property Address..." 
            className="flex-1 bg-white border border-slate-300 rounded-xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md">
            Generate Brief
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 min-h-[500px] shadow-sm">
              {!showResult ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <div className="w-16 h-16 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4" style={{ display: isAnalyzing ? 'block' : 'none' }}></div>
                  <p>{isAnalyzing ? "Agent is synthesizing data..." : "Enter an address to begin technical evaluation."}</p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <h2 className="text-2xl font-bold mb-4">Property Brief: 123 Palo Alto Way</h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-500 uppercase">Estimated Value</p>
                      <p className="text-xl font-mono text-emerald-400">$2,450,000</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-yellow-500/30">
                      <p className="text-xs text-yellow-500 uppercase">Data Alerts</p>
                      <p className="text-lg">1 Discrepancy Found</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-slate-400">
                    <p>The agent identified a mismatch between Zillow listing data (3,200 sqft) and Palo Alto tax records (2,850 sqft). This suggests an unpermitted addition.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Agent Logs */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 border border-slate-800 rounded-2xl p-5 h-full min-h-[600px] font-mono">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Agent Thinking Process
              </h3>
              <div className="space-y-4 text-[11px]">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 border-l border-slate-800 pl-4 relative">
                    <div className="absolute -left-[4.5px] top-1 w-2 h-2 bg-slate-700 rounded-full"></div>
                    <span className={log.includes('IDENTIFIED') ? 'text-yellow-500' : 'text-slate-400'}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;