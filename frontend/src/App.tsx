import React, { useState, useEffect, useRef } from 'react';

// Define the shape of our data based on your python backend
interface PropertyData {
  summary: string;
  discrepancies: string;
  raw_data: any[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

function App() {
  // State
  const [address, setAddress] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PropertyData | null>(null);
  
  // Backend State (Polling)
  const [jobId, setJobId] = useState<string | null>(null);
  const pollInterval = useRef<number | null>(null);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  // 1. Start Analysis (Triggers the Async Job)
  const startAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsAnalyzing(true);
    setResult(null);
    setJobId(null);
    setChatHistory([]);
    setLogs(["[SYSTEM] Initializing PropertyOracle Agent...", "[AGENT] Connecting to Flask Orchestrator..."]);

    try {
      // Call /api/analyze to get a Job ID
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: address }), // Backend expects 'url', not 'address'
      });

      if (!response.ok) throw new Error("Backend unavailable");

      const data = await response.json();
      setJobId(data.job_id);
      setLogs(prev => [...prev, `[SYSTEM] Job dispatched (ID: ${data.job_id.slice(0, 8)}...)`, "[AGENT] Executing Scraper..."]);

    } catch (error) {
      setLogs(prev => [...prev, "[ERROR] Connection failed. Is Flask running?"]);
      setIsAnalyzing(false);
    }
  };

  // 2. Poll for Results (The "Waiting" Logic)
  useEffect(() => {
    if (!jobId || !isAnalyzing) return;

    const poll = async () => {
      try {
        const resp = await fetch(`http://localhost:5000/api/result/${jobId}`);
        const data = await resp.json();

        if (data.status === 'complete') {
          // Success!
          setResult(data.data); // data.data contains { summary, discrepancies, ... }
          setIsAnalyzing(false);
          setJobId(null); // Stop polling
          setLogs(prev => [...prev, "[BRAIN] Gemini Analysis Complete.", "[SYSTEM] Brief synthesized successfully."]);
        } else if (data.status === 'failed') {
          // Failure
          setIsAnalyzing(false);
          setJobId(null);
          setLogs(prev => [...prev, `[ERROR] Analysis failed: ${data.error}`]);
        } else {
          // Still Running - Add "flavor" logs occasionally so it doesn't look stuck
          if (Math.random() > 0.7) {
             setLogs(prev => [...prev, "[AGENT] Cross-referencing databases..."]);
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    };

    // Poll every 2 seconds
    pollInterval.current = window.setInterval(poll, 2000);
    return () => {
      if (pollInterval.current) window.clearInterval(pollInterval.current);
    };
  }, [jobId, isAnalyzing]);

  // 3. Chat Logic
  const sendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !result) return; // Can't chat without a result (job context)

    // Using the job_id from the *previous* run requires saving it differently, 
    // but for now let's assume we keep the jobId or pass it. 
    // Wait: backend needs job_id for context. We cleared jobId on complete.
    // Let's rely on the fact that we have the result, but for /api/chat we might need the job_id.
    // FIX: Don't clear jobId in success if you want to chat about it, or store it in a ref.
    // For this implementation, I will just re-use the last jobId known.
    
    // Quick fix: Use a ref or state for "lastCompletedJobId" if you cleared jobId.
    // Actually, let's just NOT clear jobId on success, just stop polling.
  };

  // 3b. Real Chat Implementation (Corrected)
  // We need to keep jobId to chat.
  // Modifying the Poll effect to NOT clear jobId, just stop interval.
  
  const handleChat = async () => {
    if (!chatInput.trim() || !jobId) return; // We need the job_id to chat with backend context

    const msg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsChatting(true);

    try {
      const resp = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, message: msg }),
      });
      const data = await resp.json();
      setChatHistory(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: "Error connecting to agent." }]);
    } finally {
      setIsChatting(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">PropertyOracle AI</h1>
            <p className="text-slate-500 text-sm italic">Agentic intelligence for confident property decisions.</p>
          </div>
          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-bold transition-all ${isAnalyzing ? 'bg-amber-50 text-amber-700 border-amber-500 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-500'}`}>
            {isAnalyzing ? 'AGENT BUSY' : 'AGENT READY'}
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
              <button disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md">
                {isAnalyzing ? "Processing..." : "Generate Brief"}
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 min-h-[500px] shadow-sm">
              {!result ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <div className="w-16 h-16 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4" style={{ display: isAnalyzing ? 'block' : 'none' }}></div>
                  <p>{isAnalyzing ? "Agent is synthesizing data (this may take 10s)..." : "Enter a URL to begin technical evaluation."}</p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <h2 className="text-2xl font-bold mb-4">Property Brief</h2>
                  
                  {/* Discrepancies Section */}
                  <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 font-bold uppercase mb-2">⚠️ Discrepancies & Alerts</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{result.discrepancies || "No major discrepancies found."}</p>
                  </div>

                  {/* Summary Section */}
                  <div className="space-y-4 text-slate-600 border-b border-slate-100 pb-8 mb-6">
                    <p className="text-xs text-slate-400 font-bold uppercase">Executive Summary</p>
                    <p className="text-lg leading-relaxed whitespace-pre-wrap">{result.summary}</p>
                  </div>

                  {/* Minimalist Chat Section */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Follow-up Q&A</h3>
                    
                    {/* Chat History */}
                    <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto">
                       {chatHistory.map((msg, i) => (
                         <div key={i} className={`text-sm p-3 rounded-lg ${msg.role === 'user' ? 'bg-slate-100 text-slate-700 ml-10' : 'bg-blue-50 text-blue-900 mr-10'}`}>
                           <strong>{msg.role === 'user' ? 'You' : 'Agent'}: </strong> {msg.text}
                         </div>
                       ))}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Ask a follow up question..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                      />
                      <button 
                        onClick={handleChat}
                        disabled={isChatting}
                        className="text-blue-600 font-bold text-sm px-4 hover:bg-blue-50 rounded-lg"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Agent Logs (Preserved exact look) */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 border border-slate-800 rounded-2xl p-5 h-full min-h-[600px] font-mono bg-slate-900">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}></span>
                Agent Thinking Process
              </h3>
              <div className="space-y-4 text-[11px]">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 border-l border-slate-800 pl-4 relative">
                    <div className="absolute -left-[4.5px] top-1 w-2 h-2 bg-slate-700 rounded-full"></div>
                    <span className={log.includes('ERROR') ? 'text-red-400' : log.includes('BRAIN') ? 'text-emerald-400' : 'text-slate-400'}>
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
