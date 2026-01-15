import React, { useState, useEffect, useRef } from 'react';

// --- Types ---
interface PropertyData {
  summary: string;
  discrepancies: string;
  raw_data: any[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// --- Modal Component ---
const SourceModal = ({ title, content, onClose }: { title: string, content: string, onClose: () => void }) => {
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="font-bold text-gray-800 text-xl">{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-white">
          <pre className="font-mono text-xs leading-relaxed text-gray-700 whitespace-pre-wrap bg-gray-50 p-5 rounded-2xl border border-gray-200">
            {content}
          </pre>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <span>⬇️</span> Download
          </button>
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [address, setAddress] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PropertyData | null>(null);
  const [selectedSource, setSelectedSource] = useState<{title: string, content: string} | null>(null);
  
  const [jobId, setJobId] = useState<string | null>(null);
  const pollInterval = useRef<number | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  const startAnalysis = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!address) return;
    setIsAnalyzing(true);
    setResult(null);
    setJobId(null);
    setChatHistory([]);
    setLogs(["[SYSTEM] Initializing Agent...", "[AGENT] Connecting to Orchestrator..."]);
    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: address }),
      });
      if (!response.ok) throw new Error("Backend unavailable");
      const data = await response.json();
      setJobId(data.job_id);
      setLogs(prev => [...prev, `[SYSTEM] Job dispatched (ID: ${data.job_id.slice(0, 8)}...)`, "[AGENT] Scraper Active..."]);
    } catch (error) {
      setLogs(prev => [...prev, "[ERROR] Connection failed. Is Flask running?"]);
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!jobId || !isAnalyzing) return;
    const poll = async () => {
      try {
        const resp = await fetch(`http://localhost:5000/api/result/${jobId}`);
        const data = await resp.json();
        if (data.status === 'complete') {
          setResult(data.data); 
          setIsAnalyzing(false);
          setLogs(prev => [...prev, "[BRAIN] Analysis Complete.", "[SYSTEM] Brief Synthesized."]);
        } else if (data.status === 'failed') {
          setIsAnalyzing(false);
          setJobId(null);
          setLogs(prev => [...prev, `[ERROR] Analysis failed: ${data.error}`]);
        } else {
          if (Math.random() > 0.7) setLogs(prev => [...prev, "[AGENT] Reasoning..."]);
        }
      } catch (err) { console.error(err); }
    };
    pollInterval.current = window.setInterval(poll, 2000);
    return () => { if (pollInterval.current) window.clearInterval(pollInterval.current); };
  }, [jobId, isAnalyzing]);

  const handleChat = async () => {
    if (!chatInput.trim() || !jobId) return; 
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      
      {selectedSource && (
        <SourceModal 
          title={selectedSource.title} 
          content={selectedSource.content} 
          onClose={() => setSelectedSource(null)} 
        />
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
                <span className="text-3xl">🏠</span>
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">
                  PropertyOracle AI
                </h1>
                <p className="text-blue-200 text-sm font-medium mt-1">Intelligent Real Estate Analysis Platform</p>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full text-xs font-bold border-2 ${
              isAnalyzing 
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 animate-pulse' 
                : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isAnalyzing ? 'bg-amber-300' : 'bg-emerald-300'}`}></div>
              {isAnalyzing ? 'ANALYZING' : 'READY'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          <button className="text-sm font-semibold text-blue-600 px-4 py-2 rounded-lg bg-blue-50">
            Dashboard
          </button>
          <button className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all">
            History
          </button>
          <button className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all">
            Settings
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Search Card */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-100">
             <div className="flex gap-3">
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startAnalysis(e)}
                  placeholder="🔍  Enter property URL from Zillow, Redfin, or Realty..." 
                  className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-400/30 focus:border-blue-500 outline-none transition-all text-gray-700 font-medium placeholder:text-gray-400"
                />
                <button 
                  onClick={startAnalysis}
                  disabled={isAnalyzing} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 disabled:hover:scale-100"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Analyzing
                    </>
                  ) : (
                    <><span className="text-xl">🚀</span> Analyze</>
                  )}
                </button>
             </div>
          </div>

          {/* Results Area */}
          <div className="bg-white border-2 border-gray-200 rounded-3xl shadow-xl min-h-[500px] relative overflow-hidden">
            {!result ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-blue-50">
                {isAnalyzing ? (
                  <div className="text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="font-bold text-lg text-blue-900">Analyzing Property Data...</p>
                    <p className="text-sm text-gray-500">This may take a few moments</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-8xl mb-6 opacity-20">🏠</div>
                    <p className="text-lg font-semibold text-gray-600">Ready for Analysis</p>
                    <p className="text-sm text-gray-400">Enter a property URL above to begin</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-blue-100">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">Executive Report</span>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mt-3">Analysis Complete</h2>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                    ID: {jobId?.slice(0,8)}
                  </div>
                </div>

                {/* Alert Box */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-8 flex gap-4 items-start shadow-md">
                  <div className="text-3xl bg-amber-100 p-3 rounded-xl">⚠️</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-900 text-sm uppercase mb-2 tracking-wide">Discrepancy Analysis</h4>
                    <p className="text-amber-900 leading-relaxed">{result.discrepancies}</p>
                  </div>
                </div>

                {/* Main Summary */}
                <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                  <h3 className="text-gray-800 font-bold text-xl mb-4 flex items-center gap-2">
                    <span className="text-2xl">📊</span> Property Summary
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
                </div>

                {/* Sources */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border-2 border-gray-200 p-6 mb-8">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-5 tracking-widest flex items-center gap-2">
                    <span className="text-lg">📚</span> Data Sources
                  </h3>
                  <div className="space-y-4">
                    {result.raw_data?.map((r: any, i: number) => (
                      <div key={i} className="pl-5 border-l-4 border-blue-400 bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {r.source}
                        </div>
                        
                        {r.data && typeof r.data === 'string' && (
                          <button 
                            onClick={() => setSelectedSource({ title: r.source, content: r.data })}
                            className="text-xs flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg font-semibold"
                          >
                            <span>🔍</span> View Details
                          </button>
                        )}

                        {r.data && typeof r.data === 'object' && (
                          <div className="grid grid-cols-2 gap-3 text-xs bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                            {Object.entries(r.data).map(([key, val]) => (
                              <div key={key} className="flex flex-col">
                                <span className="font-bold text-gray-500 uppercase text-[10px] mb-1">{key}</span>
                                <span className="text-gray-800 truncate font-medium" title={String(val)}>{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Interface */}
                <div className="mt-8 pt-8 border-t-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-3">
                    <span className="text-2xl bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-xl">💬</span>
                    Ask Follow-up Questions
                  </h3>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-5 mb-4 h-[280px] overflow-y-auto space-y-3 border-2 border-gray-200">
                    {chatHistory.length === 0 && (
                      <div className="text-center text-gray-400 text-sm mt-16">
                        💡 Ask me anything about this property...
                      </div>
                    )}
                    {chatHistory.map((msg, i) => (
                       <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm shadow-md ${
                           msg.role === 'user' 
                             ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm' 
                             : 'bg-white text-gray-800 border-2 border-gray-200 rounded-bl-sm'
                         }`}>
                           {msg.text}
                         </div>
                       </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="bg-white border-2 border-gray-200 px-5 py-3 rounded-2xl rounded-bl-sm text-sm text-gray-500 flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                          </div>
                          Thinking...
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <input 
                      className="flex-1 bg-white border-2 border-gray-300 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm focus:ring-4 focus:ring-blue-400/20 outline-none shadow-sm transition-all"
                      placeholder="e.g., What's the price history trend?"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                    />
                    <button 
                      onClick={handleChat}
                      disabled={isChatting}
                      className="bg-gradient-to-r from-gray-900 to-slate-800 hover:from-black hover:to-gray-900 disabled:from-gray-400 disabled:to-gray-500 text-white px-7 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                    >
                      Send
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Telemetry */}
        <div className="lg:col-span-4">
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-gray-200 rounded-3xl p-6 min-h-[600px] shadow-2xl flex flex-col border border-blue-800/30">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-700/30">
              <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                System Telemetry
              </h3>
              <div className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-1 rounded-md font-bold">LIVE</div>
            </div>
            
            <div className="font-mono text-[11px] space-y-3 overflow-y-auto flex-1">
              {logs.length === 0 && (
                <div className="text-gray-500 italic text-center mt-8">
                  <div className="text-2xl mb-2">⚡</div>
                  Awaiting input...
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 pl-4 border-l-2 border-blue-700/40 py-1.5 hover:border-blue-500/60 transition-colors">
                   <div className="flex-1">
                      <span className="text-blue-500/60 mr-3 text-[10px]">{new Date().toLocaleTimeString()}</span>
                      <span className={
                        log.includes('ERROR') ? 'text-red-400 font-bold' : 
                        log.includes('BRAIN') ? 'text-emerald-400 font-bold' : 
                        log.includes('AGENT') ? 'text-blue-300' : 
                        log.includes('SYSTEM') ? 'text-purple-300' : 'text-gray-400'
                      }>
                        {log}
                      </span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;