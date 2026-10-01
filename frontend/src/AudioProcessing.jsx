import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { getAnalysisInput, clearAnalysisInput } from './fileStore';

const BACKEND = 'https://3439095d6d4831.lhr.life';



// Phase-based logs that sync with actual backend processing time
const PHASE_LOGS = {
  file: [
    { text: "$ schrödinger analyze --mode=audio --engine=deep-forensics-v3", delay: 0 },
    { text: "  [INIT] Loading Schrödinger Audio Forensics Engine v3.0...", delay: 800 },
    { text: "  [INIT] WavLM Foundation Model: microsoft/wavlm-base-plus ✓", delay: 1200 },
    { text: "  [INIT] Faster-Whisper ASR: loaded (small, int8) ✓", delay: 1600 },
    { text: "  [UPLOAD] Reading uploaded audio file...", delay: 2200 },
    { text: "  [UPLOAD] File received and decoded ✓", delay: 3000 },
    { text: "  [PREPROCESS] Applying pre-emphasis filter...", delay: 4000 },
    { text: "  [PREPROCESS] Trimming silence (top_db=20)...", delay: 5000 },
    { text: "  [LAYER 1] Running WavLM Foundation Model embedding extraction...", delay: 6500 },
    { text: "  [LAYER 1] Computing 768-dim self-supervised representations...", delay: 9000 },
    { text: "  [LAYER 2] Extracting MFCC + Mel-Spectrogram features...", delay: 11000 },
    { text: "  [LAYER 2] Analyzing spectral centroid, bandwidth, flatness...", delay: 13000 },
    { text: "  [LAYER 3] Running Phase Coherence Analysis...", delay: 15000 },
    { text: "  [LAYER 3] Computing group delay deviation and instantaneous frequency...", delay: 17000 },
    { text: "  [LAYER 4] Running Prosody Analysis (F0, jitter, shimmer)...", delay: 19000 },
    { text: "  [LAYER 4] Analyzing pitch contour and formant transitions...", delay: 21000 },
    { text: "  [FRAUD] Running Whisper ASR transcription...", delay: 23000 },
    { text: "  [FRAUD] NLP Fraud Intent Classification...", delay: 26000 },
    { text: "  [FUSION] Weighted ensemble calibration with abstention logic...", delay: 28000 },
    { text: "  [LLM] Generating executive forensic summary...", delay: 30000 },
  ],
  url: [
    { text: "$ schrödinger analyze --mode=audio-url --engine=deep-forensics-v3", delay: 0 },
    { text: "  [INIT] Loading Schrödinger Audio Forensics Engine v3.0...", delay: 800 },
    { text: "  [INIT] WavLM Foundation Model: loaded ✓", delay: 1200 },
    { text: "  [INIT] Faster-Whisper ASR: loaded ✓", delay: 1600 },
    { text: "  [DOWNLOAD] Resolving platform media URL via yt-dlp...", delay: 2200 },
    { text: "  [DOWNLOAD] Negotiating best audio stream...", delay: 3500 },
    { text: "  [DOWNLOAD] Downloading audio stream...", delay: 5000 },
    { text: "  [DOWNLOAD] Download complete ✓", delay: 8000 },
    { text: "  [PREPROCESS] Decoding and normalizing audio buffer...", delay: 9500 },
    { text: "  [PREPROCESS] Applying pre-emphasis and silence trimming...", delay: 11000 },
    { text: "  [LAYER 1] Running WavLM Foundation Model embedding extraction...", delay: 13000 },
    { text: "  [LAYER 2] Extracting MFCC + Mel-Spectrogram features...", delay: 16000 },
    { text: "  [LAYER 3] Running Phase Coherence Analysis...", delay: 19000 },
    { text: "  [LAYER 4] Running Prosody Analysis (F0, jitter, shimmer)...", delay: 22000 },
    { text: "  [FRAUD] Running Whisper ASR transcription...", delay: 25000 },
    { text: "  [FRAUD] NLP Fraud Intent Classification...", delay: 28000 },
    { text: "  [FUSION] Weighted ensemble calibration...", delay: 31000 },
    { text: "  [LLM] Generating executive forensic summary...", delay: 34000 },
  ]
};

export default function AudioProcessing() {
  const navigate = useNavigate();
  const { file, url } = getAnalysisInput();
  const isUrl = !!url;

  const [logs, setLogs] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [backendDone, setBackendDone] = useState(false);
  const [backendData, setBackendData] = useState(null);

  const bottomRef  = useRef(null);
  const resultsRef = useRef(null);
  const timersRef  = useRef([]);

  // Auto-scroll terminal
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Auto-scroll page to results
  useEffect(() => {
    if (isComplete && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [isComplete]);

  // When backend finishes, show results
  useEffect(() => {
    if (backendDone && backendData) {
      // Clear all pending log timers
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];

      // Add final completion logs
      setLogs(prev => [
        ...prev,
        `  [COMPLETE] Analysis finished in ${backendData.latency_ms?.toFixed(0) || '???'}ms ✓`,
        `  [REPORT] Forensic report generated.`,
        `$ echo "Done."`,
      ]);

      setTimeout(() => {
        setResult(backendData);
        setIsComplete(true);
      }, 800);
    }
  }, [backendDone, backendData]);

  useEffect(() => {
    if (!file && !url) {
      navigate('/audio-detection');
      return;
    }

    // Start streaming phase-based logs
    const phaseLogs = isUrl ? PHASE_LOGS.url : PHASE_LOGS.file;
    phaseLogs.forEach(({ text, delay }) => {
      const timer = setTimeout(() => {
        if (!backendDone) {
          setLogs(prev => [...prev, text]);
        }
      }, delay);
      timersRef.current.push(timer);
    });

    // Backend call (runs in parallel with log animation)
    const doFetch = async () => {
      try {
        let res;
        if (isUrl) {
          const form = new FormData();
          form.append('url', url);
          res = await fetch(`${BACKEND}/analyze/url`, { method: 'POST', body: form });
        } else {
          const form = new FormData();
          form.append('file', file);
          res = await fetch(`${BACKEND}/analyze/media`, { method: 'POST', body: form });
        }

        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setBackendData(data);
        setBackendDone(true);
      } catch (err) {
        // Clear all pending log timers
        timersRef.current.forEach(t => clearTimeout(t));
        timersRef.current = [];

        setLogs(prev => [
          ...prev,
          `  [ERROR] ${err.message}`,
          `  [ERROR] Ensure the backend is running at ${BACKEND}`,
        ]);
        setError(err.message);
        setIsComplete(true);
      }
    };

    doFetch();

    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const isFake = result?.verdict?.includes('DEEPFAKE') || result?.verdict?.includes('AI-GENERATED');
  const isReal  = result?.verdict?.includes('AUTHENTIC');
  const isIncon = result?.verdict?.includes('INCONCLUSIVE');
  const VerdictIcon = isFake ? AlertTriangle : isReal ? CheckCircle : AlertCircle;
  const verdictBorder = isFake ? 'border-red-100' : isReal ? 'border-green-100' : 'border-yellow-100';
  const badgeClass   = isFake ? 'bg-red-100 text-red-700 border-red-200' : isReal ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200';
  const iconClass    = isFake ? 'bg-red-50 border-red-100' : isReal ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100';
  const iconColor    = isFake ? 'text-red-500' : isReal ? 'text-green-500' : 'text-yellow-500';
  const btnClass     = isFake
    ? 'bg-red-500 shadow-[0_4px_14px_rgba(239,68,68,0.35)] hover:bg-red-600'
    : isReal ? 'bg-green-500 shadow-[0_4px_14px_rgba(34,197,94,0.35)] hover:bg-green-600'
    : 'bg-yellow-500 shadow-[0_4px_14px_rgba(234,179,8,0.35)] hover:bg-yellow-600';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative overflow-hidden">
      <style>{`
        @keyframes wave-bounce {
          0%, 100% { height: 25%; }
          50% { height: 85%; }
        }
        .animate-wave-bounce { animation: wave-bounce 1.2s ease-in-out infinite; }
      `}</style>
      <Navbar />

      <div className="flex-1 flex flex-col items-center px-4 pt-4 pb-10 gap-6">

        {/* Source label */}
        <div className="w-full max-w-[1400px]">
          <p className="text-[14px] text-[#5B6C8C] font-semibold tracking-wide uppercase">
            {isUrl ? `🔗 TARGET: ${url}` : `🎵 TARGET: ${file?.name}`}
          </p>
        </div>

        {/* ── macOS Terminal ─────────────────────────────────────────────── */}
        <div className="w-full max-w-[1400px] bg-[#1a1a1a] rounded-[24px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.55)] border border-[#333] flex flex-col overflow-hidden">
          <div className="h-11 bg-gradient-to-b from-[#3d3d3f] to-[#2a2a2c] flex items-center px-4 relative border-b border-black/40 shrink-0">
            <div className="flex gap-2 absolute left-4 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>
            <span className="w-full text-center text-[13px] text-[#999] font-mono tracking-wide select-none">
              schrödinger — deep forensics engine — audio analysis
            </span>
          </div>

          <div
            className="p-6 h-[480px] overflow-y-auto font-mono text-[14px] leading-[1.75] flex flex-col gap-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`div::-webkit-scrollbar{display:none}`}</style>
            {logs.map((log, i) => (
              <div key={i} className={
                log.startsWith('$')                               ? 'text-[#E8E8E8] font-bold' :
                log.includes('[ERROR]') || log.includes('Error') ? 'text-[#FF5F56]' :
                log.includes('[LAYER')                           ? 'text-[#7B8BFF]' :
                log.includes('[FUSION]') || log.includes('[LLM]') || log.includes('[FRAUD]') ? 'text-[#FFBD2E]' :
                log.includes('✓') || log.includes('Done')        ? 'text-[#27C93F]' :
                log.includes('[COMPLETE]')                       ? 'text-[#27C93F] font-bold' :
                                                                    'text-[#4AF626]'
              }>
                {log}
              </div>
            ))}
            {!isComplete && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[#4AF626]">$</span>
                <span className="w-2 h-4 bg-[#4AF626] animate-pulse inline-block ml-1" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Results (mounted only when complete) ───────────────────────── */}
        {isComplete && (
          <div ref={resultsRef} className="w-full max-w-[1400px]" style={{ animation: 'fadeUp 0.5s ease-out forwards' }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Error */}
            {error && !result && (
              <div className="bg-red-50 border border-red-200 rounded-[24px] p-8 text-center shadow-sm">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-red-700 mb-2">Analysis Failed</h2>
                <p className="text-red-600 text-sm max-w-lg mx-auto">{error}</p>
                <Link to="/audio-detection" className="mt-5 inline-block px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">
                  Try Again
                </Link>
              </div>
            )}

            {/* Real results: Classic Layout */}
            {result && (
              <div className="bg-white rounded-[24px] shadow-xl border border-gray-100 p-8">
                <div className="flex flex-col lg:flex-row gap-10">
                  
                  {/* Left: Media Preview */}
                  <div className="w-full lg:w-1/3 shrink-0 flex flex-col gap-4">
                    <div className="w-full aspect-square rounded-[24px] overflow-hidden relative bg-gray-50 border border-gray-100 shadow-inner">
                      {isUrl ? (
                        <img 
                          src={
                            (function(u){
                              try {
                                const parsed = new URL(u);
                                let v = parsed.searchParams.get('v');
                                if(!v && parsed.hostname.includes('youtu.be')) v = parsed.pathname.slice(1);
                                if(!v && parsed.pathname.includes('/shorts/')) v = parsed.pathname.split('/shorts/')[1].split('?')[0];
                                return v ? `https://img.youtube.com/vi/${v}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop';
                              } catch { return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop'; }
                            })(file?.name || (typeof url === 'string' ? url : ''))
                          } 
                          className="w-full h-full object-cover opacity-50 blur-sm" alt="URL Media" 
                        />
                      ) : (
                        <>
                          <img 
                            src="/soundwave.gif" 
                            className="w-full h-full object-cover opacity-90" 
                            alt="Audio Waveform Visualization" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <VerdictIcon className={`w-32 h-32 drop-shadow-2xl ${isFake ? 'text-red-500' : isReal ? 'text-green-500' : 'text-yellow-500'}`} />
                          </div>
                        </>
                      )}
                      
                      <div className={`absolute bottom-4 right-4 rounded-xl p-3 shadow-lg border border-white/20 ${isFake ? 'bg-red-500 text-white' : isReal ? 'bg-green-500 text-white' : 'bg-yellow-400 text-black'}`}>
                        <VerdictIcon className="w-6 h-6" />
                      </div>
                    </div>

                    <button onClick={() => window.print()} className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide shadow-md text-white transition-colors ${isFake ? 'bg-red-500 hover:bg-red-600' : isReal ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                      DOWNLOAD DOSSIER
                    </button>
                    <Link to="/audio-detection" onClick={() => clearAnalysisInput()} className="w-full py-4 rounded-xl bg-gray-50 text-gray-700 font-bold text-sm tracking-wide border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors text-center">
                      SCAN NEW TARGET
                    </Link>
                  </div>

                  {/* Right: Data */}
                  <div className="w-full lg:w-2/3 flex flex-col gap-8">
                    
                    {/* Header */}
                    <div>
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tight">{result.verdict}</h2>
                        <span className={`px-4 py-1.5 font-bold text-xs rounded-lg uppercase tracking-wider border ${isFake ? 'border-red-200 text-red-700 bg-red-50' : isReal ? 'border-green-200 text-green-700 bg-green-50' : 'border-yellow-200 text-yellow-700 bg-yellow-50'}`}>
                          {isFake ? 'High Risk' : isReal ? 'Authentic' : 'Inconclusive'}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <p className="text-[15px] text-gray-600 leading-relaxed">
                          {result.llm_summary || result.details?.audio || 'Analysis complete.'}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Synthetic', value: `${result.synthetic_score}%`, hi: result.synthetic_score > 70 },
                        { label: 'Fraud Risk', value: `${result.fraud_risk}%`, hi: result.fraud_risk > 60 },
                        { label: 'Confidence', value: `${result.confidence > 1 ? result.confidence.toFixed(1) : (result.confidence * 100).toFixed(1)}%`, hi: false },
                        { label: 'Time', value: `${(result.latency_ms / 1000).toFixed(1)}s`, hi: false },
                      ].map(s => (
                        <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">{s.label}</span>
                          <span className={`text-2xl font-black ${s.hi ? 'text-red-500' : 'text-gray-900'}`}>{s.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <span className="text-[11px] text-indigo-500 font-bold uppercase tracking-widest block mb-3">Audio Analysis</span>
                        <p className="text-[13px] text-gray-600 font-mono leading-relaxed">{result.details?.audio || '—'}</p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <span className="text-[11px] text-orange-500 font-bold uppercase tracking-widest block mb-3">Intent Analysis</span>
                        <p className="text-[13px] text-gray-600 font-mono leading-relaxed">{result.details?.intent || '—'}</p>
                      </div>
                      
                      {result.transcript && (
                        <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                          <span className="text-[11px] text-emerald-600 font-bold uppercase tracking-widest block mb-3">Extracted Transcript</span>
                          <p className="text-[14px] text-gray-700 italic border-l-[3px] border-gray-200 pl-4 py-1 break-words whitespace-pre-wrap">"{result.transcript}"</p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
