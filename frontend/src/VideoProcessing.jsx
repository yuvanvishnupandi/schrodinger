import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { getAnalysisInput, clearAnalysisInput } from './fileStore';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Phase-based logs that sync with actual backend processing time
const PHASE_LOGS = {
  file: [
    { text: "$ schrödinger analyze --mode=video --engine=deep-forensics-v3", delay: 0 },
    { text: "  [INIT] Loading Schrödinger Video Forensics Engine v3.0...", delay: 800 },
    { text: "  [INIT] SigLIP Vision Transformer: google/siglip-base-patch16-224 ✓", delay: 1200 },
    { text: "  [INIT] MediaPipe Face Mesh: loaded (468 landmarks) ✓", delay: 1600 },
    { text: "  [INIT] OpenCV Haar Cascade: frontalface_default ✓", delay: 2000 },
    { text: "  [UPLOAD] Reading uploaded video file...", delay: 2500 },
    { text: "  [UPLOAD] File received and saved to temp buffer ✓", delay: 3200 },
    { text: "  [EXTRACT] Demuxing video container...", delay: 4000 },
    { text: "  [EXTRACT] Extracting 12 evenly-spaced keyframes...", delay: 5000 },
    { text: "  [LAYER 1] Running Dense Optical Flow (Farneback)...", delay: 6500 },
    { text: "  [LAYER 1] Analyzing inter-frame motion variance and angle distributions...", delay: 8000 },
    { text: "  [LAYER 2] Running Facial Asymmetry Analysis (Haar + L/R diff)...", delay: 10000 },
    { text: "  [LAYER 2] Computing left-right facial symmetry scores...", delay: 12000 },
    { text: "  [LAYER 3] Running MediaPipe Landmark Motion Analysis...", delay: 14000 },
    { text: "  [LAYER 3] Tracking 7 key facial landmarks across temporal sequence...", delay: 16000 },
    { text: "  [LAYER 4] Running SigLIP Temporal Consistency (batched)...", delay: 18000 },
    { text: "  [LAYER 4] Computing inter-frame semantic embedding cosine similarity...", delay: 22000 },
    { text: "  [LAYER 5] Running FFT GAN Fingerprint Detection...", delay: 26000 },
    { text: "  [LAYER 5] Measuring inter-frame high-frequency spectral variance...", delay: 28000 },
    { text: "  [AUDIO] Extracting audio track for voice analysis...", delay: 31000 },
    { text: "  [AUDIO] Loading Faster-Whisper Transformer...", delay: 34000 },
    { text: "  [AUDIO] Running Voice Activity Detection (VAD)...", delay: 42000 },
    { text: "  [AUDIO] Transcribing speech and analyzing linguistic intent...", delay: 52000 },
    { text: "  [FUSION] Weighted ensemble calibration with abstention logic...", delay: 65000 },
    { text: "  [LLM] Generating executive forensic summary...", delay: 68000 },
  ],
  url: [
    { text: "$ schrödinger analyze --mode=video-url --engine=deep-forensics-v3", delay: 0 },
    { text: "  [INIT] Loading Schrödinger Video Forensics Engine v3.0...", delay: 800 },
    { text: "  [INIT] SigLIP Vision Transformer: loaded ✓", delay: 1200 },
    { text: "  [INIT] MediaPipe Face Mesh: loaded ✓", delay: 1600 },
    { text: "  [DOWNLOAD] Resolving platform video URL via yt-dlp...", delay: 2200 },
    { text: "  [DOWNLOAD] Negotiating best quality stream (≤1080p)...", delay: 3500 },
    { text: "  [DOWNLOAD] Downloading video stream...", delay: 5000 },
    { text: "  [DOWNLOAD] Download complete ✓", delay: 8000 },
    { text: "  [EXTRACT] Demuxing video container...", delay: 9500 },
    { text: "  [EXTRACT] Extracting 12 evenly-spaced keyframes...", delay: 11000 },
    { text: "  [LAYER 1] Running Dense Optical Flow (Farneback)...", delay: 13000 },
    { text: "  [LAYER 1] Analyzing inter-frame motion variance...", delay: 15000 },
    { text: "  [LAYER 2] Running Facial Asymmetry Analysis...", delay: 17000 },
    { text: "  [LAYER 3] Running MediaPipe Landmark Motion Analysis...", delay: 20000 },
    { text: "  [LAYER 4] Running SigLIP Temporal Consistency...", delay: 24000 },
    { text: "  [LAYER 5] Running FFT GAN Fingerprint Detection...", delay: 28000 },
    { text: "  [FUSION] Weighted ensemble calibration...", delay: 32000 },
    { text: "  [LLM] Generating executive forensic summary...", delay: 35000 },
  ]
};

export default function VideoProcessing() {
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
  const isDoneRef  = useRef(false);
  const hasCompletedRef = useRef(false);

  const fileUrl = React.useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
  const isVideo = file && typeof file.type === 'string' && file.type.startsWith('video');
  const isImage = file && typeof file.type === 'string' && file.type.startsWith('image');

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

  // When backend finishes and logs have caught up, show results
  useEffect(() => {
    if (backendDone && backendData) {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;

      isDoneRef.current = true;
      // Clear all pending log timers
      timersRef.current.forEach(t => clearInterval(t));
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
      navigate('/video-detection');
      return;
    }

    // Polling true live logs from backend
    const pollInterval = setInterval(async () => {
      if (isDoneRef.current) return;
      try {
        const res = await fetch(`${BACKEND}/logs?t=${Date.now()}`);
        if (res.ok && !isDoneRef.current) {
          const data = await res.json();
          if (data && Array.isArray(data.logs)) {
            setLogs([
              isUrl ? "$ schrödinger analyze --mode=video-url --engine=deep-forensics-v3" : "$ schrödinger analyze --mode=video --engine=deep-forensics-v3",
              ...data.logs
            ]);
          }
        } else if (!res.ok) {
           setLogs(prev => [...prev, `[POLL ERROR] Server returned ${res.status}`]);
        }
      } catch (e) {
        setLogs(prev => [...prev, `[POLL ERROR] Network fetch failed: ${e.message}`]);
      }
    }, 500);
    timersRef.current.push(pollInterval);

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
        isDoneRef.current = true;
        timersRef.current.forEach(t => clearInterval(t));
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
      timersRef.current.forEach(t => clearInterval(t));
    };
  }, []);

  const progress = Math.min(99, Math.floor((logs.length / 15) * 100));
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col items-center px-4 py-10 gap-10">

        {/* Source label */}
        <div className="w-full max-w-[1400px]">
          <p className="text-[14px] text-[#5B6C8C] font-semibold tracking-wide uppercase">
            {isUrl ? `🔗 TARGET: ${url}` : `🎬 TARGET: ${file?.name}`}
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
              schrödinger — deep forensics engine — video analysis
            </span>
          </div>

          <div
            className="p-6 h-[480px] overflow-y-auto font-mono text-[14px] leading-[1.75] flex flex-col gap-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`div::-webkit-scrollbar{display:none}`}</style>
            {logs.map((log, i) => {
              const isCommand = typeof log === 'string' && log.startsWith('$');
              const isError = typeof log === 'string' && (log.includes('[ERROR]') || log.includes('Error'));
              const isSuccess = typeof log === 'string' && (log.includes('✓') || log.includes('Done') || log.includes('[COMPLETE]'));
              
              let colorClass = 'text-[#FFFFFF]'; // Default white
              if (isCommand) colorClass = 'text-[#FFFFFF] font-bold';
              else if (isError) colorClass = 'text-[#FF5F56]';
              else if (isSuccess) colorClass = 'text-[#27C93F]';

              return (
                <div key={i} className={`${colorClass} whitespace-pre-wrap`}>
                  {log}
                </div>
              );
            })}
            {!isComplete && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[#FFFFFF] font-bold">$</span>
                <span className="w-2 h-4 bg-[#FFFFFF] animate-pulse inline-block ml-1" />
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
                <Link to="/video-detection" className="mt-5 inline-block px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">
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
                      {isVideo && fileUrl ? (
                        <video src={fileUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      ) : isImage && fileUrl ? (
                        <img src={fileUrl} className="w-full h-full object-cover" alt="Uploaded File" />
                      ) : isUrl ? (
                        <img 
                          src={
                            (function(u){
                              try {
                                const parsed = new URL(u);
                                let v = parsed.searchParams.get('v');
                                if(!v && parsed.hostname.includes('youtu.be')) v = parsed.pathname.slice(1);
                                if(!v && parsed.pathname.includes('/shorts/')) v = parsed.pathname.split('/shorts/')[1].split('?')[0];
                                return v ? `https://img.youtube.com/vi/${v}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop';
                              } catch { return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop'; }
                            })(file?.name || (typeof url === 'string' ? url : ''))
                          } 
                          className="w-full h-full object-cover" alt="URL Media" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <VerdictIcon className={`w-24 h-24 ${isFake ? 'text-red-500' : isReal ? 'text-green-500' : 'text-yellow-500'}`} />
                        </div>
                      )}
                      
                      <div className={`absolute bottom-4 right-4 rounded-xl p-3 shadow-lg border border-white/20 ${isFake ? 'bg-red-500 text-white' : isReal ? 'bg-green-500 text-white' : 'bg-yellow-400 text-black'}`}>
                        <VerdictIcon className="w-6 h-6" />
                      </div>
                    </div>

                    <button onClick={() => window.print()} className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide shadow-md text-white transition-colors ${isFake ? 'bg-red-500 hover:bg-red-600' : isReal ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                      DOWNLOAD DOSSIER
                    </button>
                    <Link to="/video-detection" onClick={() => clearAnalysisInput()} className="w-full py-4 rounded-xl bg-gray-50 text-gray-700 font-bold text-sm tracking-wide border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors text-center">
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
                          {result.llm_summary || result.details?.vision || result.details?.audio || 'Analysis complete.'}
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
                        <span className="text-[11px] text-indigo-500 font-bold uppercase tracking-widest block mb-3">Visual Telemetry</span>
                        <p className="text-[13px] text-gray-600 font-mono leading-relaxed">{result.details?.vision || '—'}</p>
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
