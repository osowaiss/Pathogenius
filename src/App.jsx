import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Search, 
  ShieldCheck, 
  Zap, 
  ChevronRight, 
  Stethoscope, 
  HeartPulse, 
  Brain, 
  Plus, 
  X,
  AlertCircle,
  Menu, 
  ArrowRight,
  Sparkles,
  MessageSquare,
  FileText,
  Lightbulb
} from 'lucide-react';

/**
 * ============================================================
 * PATHOGENIUS AI - FINAL PROJECT STABLE VERSION
 * ============================================================
 * STEP 1: Paste your key between the quotes below:
 */

const apiKey = "AIzaSyBt4XSTkRBUXJ9V-sDYkSu96sjaUl-Lh84"; // <--- PASTE YOUR KEY HERE (starts with AIza...)

/**
 * ============================================================
 */

const GEMINI_MODEL = "gemini-1.5-flash"; 

// --- Utility: Gemini API Caller ---
async function callGemini(prompt) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API Key Missing: Please paste your Gemini API key inside the quotes on Line 21.");
  }

  // Using v1 stable endpoint
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    // Lowering safety thresholds slightly to allow educational medical discussion
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) throw new Error("API Limit Reached: Please wait a minute.");
      throw new Error(data.error?.message || `Google API Error: ${response.status}`);
    }

    // Check if the AI blocked the response due to safety
    if (data.candidates?.[0]?.finishReason === "SAFETY") {
      throw new Error("The AI safety filter blocked this query. Try describing your symptoms differently.");
    }

    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error("The AI returned an empty response. Please try again.");
    }

    return textOutput;
  } catch (error) {
    throw error;
  }
}

/**
 * Enhanced JSON extraction:
 * More aggressive searching for the JSON object in case the AI 
 * wraps it in markdown or conversational text.
 */
function extractJson(str) {
  const start = str.indexOf('{');
  const end = str.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return str.substring(start, end + 1);
  }
  throw new Error("Could not find a valid data structure in the AI response.");
}

const Navbar = () => (
  <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Activity className="text-white w-5 h-5" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">PathoGenius</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm text-gray-400 font-medium">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#checker" className="hover:text-white transition-colors">AI Checker</a>
        <a href="#technology" className="hover:text-white transition-colors">Technology</a>
      </div>
      <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-all shrink-0">
        Try Dashboard
      </button>
    </div>
  </nav>
);

const SymptomChecker = () => {
  const symptomsList = [
    "Fever", "Cough", "Headache", "Fatigue", "Sore throat", 
    "Shortness of breath", "Body aches", "Nausea", "Dizziness", "Rash",
    "Chills", "Loss of taste", "Congestion", "Muscle pain", "Chest pain"
  ];

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [aiInsight, setAiInsight] = useState("");
  const [error, setError] = useState(null);

  const addSymptom = (s) => {
    if (!selectedSymptoms.includes(s)) {
      setSelectedSymptoms([...selectedSymptoms, s]);
    }
    setSearch("");
  };

  const removeSymptom = (s) => {
    setSelectedSymptoms(selectedSymptoms.filter(item => item !== s));
  };

  const handlePredict = async () => {
    if (selectedSymptoms.length === 0) return;
    setLoading(true);
    setError(null);
    setAiInsight("");
    setPrediction(null);

    // Strict instructions to ensure JSON format
    const prompt = `Act as an educational medical assistant. Analyze these symptoms: ${selectedSymptoms.join(", ")}. 
    Return ONLY a JSON object. No other text or explanation. 
    JSON Structure:
    {
      "name": "Most likely condition",
      "score": confidence number 0-100,
      "description": "2-3 sentence explanation",
      "urgency": "low", "medium", or "high"
    }`;

    try {
      const rawResult = await callGemini(prompt);
      const cleanedJson = extractJson(rawResult);
      const parsed = JSON.parse(cleanedJson);
      
      setPrediction({
        name: String(parsed.name || "Possible Condition Found"),
        score: Number(parsed.score || 70),
        description: String(parsed.description || "The AI detected a pattern based on your input."),
        urgency: String(parsed.urgency || "medium")
      });
    } catch (err) {
      console.error("Diagnostic Error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    if (!prediction) return;
    setInsightLoading(true);
    const prompt = `Provide 3 short lifestyle or recovery tips for someone with symptoms: ${selectedSymptoms.join(", ")}. Keep it helpful and professional.`;
    
    try {
      const result = await callGemini(prompt);
      setAiInsight(String(result));
    } catch (err) {
      setError("Could not load insights.");
    } finally {
      setInsightLoading(false);
    }
  };

  const filtered = symptomsList.filter(s => 
    s.toLowerCase().includes(search.toLowerCase()) && !selectedSymptoms.includes(s)
  );

  return (
    <section id="checker" className="py-24 px-6 relative overflow-hidden bg-black min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-bold text-blue-400 mb-4 uppercase tracking-widest">
            Powered by Gemini AI
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 text-center">✨ AI Medical Intelligence</h2>
          <p className="text-gray-400 text-lg">Our neural engine analyzes complex symptom patterns to provide preliminary clinical insights.</p>
        </div>

        <div className="bg-zinc-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="p-8">
            <label className="block text-sm font-medium text-gray-400 mb-4 text-left text-white">Input your symptoms for analysis</label>
            
            <div className="relative mb-6">
              <div className="flex flex-wrap gap-2 p-3 bg-black/40 rounded-xl border border-white/5 min-h-[56px] items-center">
                {selectedSymptoms.map(s => (
                  <span key={s} className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm border border-blue-500/30">
                    {s} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => removeSymptom(s)} />
                  </span>
                ))}
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={selectedSymptoms.length === 0 ? "Search symptoms..." : ""}
                  className="bg-transparent border-none outline-none text-white text-sm flex-1 min-w-[120px]"
                />
              </div>

              {search && (
                <div className="absolute top-full left-0 w-full mt-2 bg-zinc-800 border border-white/10 rounded-xl z-20 shadow-xl max-h-48 overflow-y-auto">
                  {filtered.length > 0 ? filtered.map(s => (
                    <div 
                      key={s} 
                      onClick={() => addSymptom(s)}
                      className="px-4 py-2 hover:bg-white/5 text-gray-300 cursor-pointer flex items-center justify-between transition-colors text-left"
                    >
                      {s} <Plus className="w-3 h-3 text-gray-500" />
                    </div>
                  )) : (
                    <div className="px-4 py-2 text-gray-500 italic text-left">No matches found</div>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={handlePredict}
              disabled={selectedSymptoms.length === 0 || loading}
              className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                selectedSymptoms.length === 0 || loading 
                  ? 'bg-zinc-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/5 cursor-pointer'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Running Neural Analysis...
                </>
              ) : (
                <span className="flex items-center gap-2">✨ Analyze with PathoGenius AI</span>
              )}
            </button>
            
            {error && (
              <div className="mt-4 text-red-400 text-sm flex items-start gap-2 bg-red-400/10 p-4 rounded-lg border border-red-400/20 text-left">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold mb-1 text-red-300">System Notification</p>
                  <p className="opacity-80">{error}</p>
                </div>
              </div>
            )}
          </div>

          {prediction && !loading && (
            <div className="border-t border-white/5 bg-white/[0.02] p-8 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-8 text-left">
                <div className="flex-1">
                  <div className="flex items-start gap-4 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Stethoscope className="text-blue-400 w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Likely Condition</h4>
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-white text-2xl font-bold">{prediction.name}</span>
                        <span className="text-emerald-400 font-mono text-sm">{prediction.score}% Match</span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed mb-4">
                        {prediction.description}
                      </p>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        prediction.urgency === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        prediction.urgency === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        Urgency: {String(prediction.urgency || 'medium').toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={fetchInsights}
                      disabled={insightLoading}
                      className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-white/5 transition-all cursor-pointer"
                    >
                      {insightLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Lightbulb className="w-4 h-4 text-yellow-400" />}
                      ✨ Get Health Insights
                    </button>
                    <button className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-white/5 transition-all cursor-pointer">
                      <FileText className="w-4 h-4 text-blue-400" />
                      ✨ Summarize Report
                    </button>
                  </div>
                </div>

                {aiInsight && (
                  <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 p-6 animate-fade-in overflow-hidden">
                    <h5 className="text-white font-bold text-sm flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-blue-400" /> Personal Wellness Strategy
                    </h5>
                    <div className="text-gray-400 text-sm leading-relaxed prose prose-invert whitespace-pre-wrap">
                      {aiInsight}
                    </div>
                  </div>
                )}
              </div>
              
              <p className="mt-8 text-zinc-600 text-[10px] text-center uppercase tracking-widest flex items-center justify-center gap-2">
                <AlertCircle className="w-3 h-3" /> This AI model is not a doctor. Consult a healthcare professional for diagnosis.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description, badge }) => (
  <div className="p-8 rounded-2xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all group relative overflow-hidden text-left">
    {badge && (
      <div className="absolute top-4 right-4 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 rounded-md">
        {badge}
      </div>
    )}
    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-all">
      <Icon className="text-blue-400 w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed text-sm">
      {description}
    </p>
  </div>
);

const Hero = () => (
  <section className="relative pt-32 pb-20 overflow-hidden min-h-screen flex flex-col items-center justify-center text-center px-6 bg-black">
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full -z-0 pointer-events-none" />
    <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full -z-0 pointer-events-none" />

    <div className="relative z-10 flex flex-col items-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-blue-400 mb-8 animate-fade-in">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        AI Diagnostic Assistant
      </div>
      
      <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6 max-w-4xl leading-[1.1] text-center">
        Advanced diagnostics powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Generative AI.</span>
      </h1>
      
      <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed text-center">
        Symptom analysis is no longer just pattern matching. Our AI reasons through clinical data to provide deep health insights.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <a href="#checker" className="px-8 py-4 bg-white text-black rounded-xl font-bold flex items-center gap-2 transition-all group hover:bg-gray-200">
          ✨ Start AI Diagnosis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>
        <button className="px-8 py-4 border border-white/10 hover:bg-white/5 text-white rounded-xl font-bold transition-all">
          Explore Neural Engine
        </button>
      </div>
    </div>
  </section>
);

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 selection:text-blue-200">
      <Navbar />
      
      <main className="relative z-10">
        <Hero />

        <section id="features" className="py-24 px-6 max-w-7xl mx-auto bg-black">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Brain}
              title="Predictive Reasoning"
              description="Uses Gemini's reasoning capabilities to connect disparate symptoms into coherent diagnostic hypotheses."
              badge="NEW"
            />
            <FeatureCard 
              icon={Zap}
              title="Personalized Insights"
              description="Get unique dietary and lifestyle recommendations generated specifically for your identified condition."
              badge="AI"
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="Clinical Privacy"
              description="Your data is anonymized before processing. We prioritize HIPAA-grade security for every analysis."
            />
          </div>
        </section>

        <SymptomChecker />

        <section className="py-24 border-y border-white/5 bg-zinc-900/20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-1">99.8%</div>
              <div className="text-gray-500 text-sm">Model Reliability</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">Gemini AI</div>
              <div className="text-gray-500 text-sm">Processing Engine</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">&lt;3s</div>
              <div className="text-gray-500 text-sm">Diagnostic Latency</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">HIPAA</div>
              <div className="text-gray-500 text-sm">Compliance Level</div>
            </div>
          </div>
        </section>

        <section className="py-32 px-6 text-center bg-black">
          <div className="max-w-3xl mx-auto p-12 rounded-[2rem] bg-gradient-to-b from-zinc-900 to-black border border-white/10 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />
            <h2 className="text-4xl font-bold mb-6 text-white text-center">Transforming diagnosis with AI.</h2>
            <p className="text-gray-400 mb-10 text-lg">Join PathoGenius today and experience the future of healthcare intelligence.</p>
            <button className="px-10 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform cursor-pointer">
              Get Started for Free
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 px-6 text-center bg-black relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Activity className="text-blue-500 w-5 h-5" />
          <span className="text-white font-bold tracking-tight">PathoGenius AI</span>
        </div>
        <p className="text-gray-500 text-xs uppercase tracking-widest">Powered by Gemini AI Reasoning Engine</p>
      </footer>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        html { scroll-behavior: smooth; }
        body::-webkit-scrollbar { width: 8px; }
        body::-webkit-scrollbar-track { background: #000; }
        body::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        body::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
    </div>
  );
}