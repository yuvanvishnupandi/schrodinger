import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileVideo, Link2 } from 'lucide-react';
import { setAnalysisInput } from './fileStore';
import Navbar from './Navbar';

function UploadCard({ onFileReady }) {
  const [file, setFile] = React.useState(null);
  const [progress, setProgress] = React.useState(0);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(p + 15, 100);
      setProgress(p);
      if (p >= 100) clearInterval(iv);
    }, 200);
  };

  return (
    <div className="flex-1 bg-white/95 backdrop-blur-xl rounded-[20px] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.10)] border border-white/60 flex flex-col overflow-hidden transition-all duration-300 hover:shadow-[0_16px_50px_-12px_rgba(0,0,0,0.15)] min-h-[370px]">
      <div className="px-5 py-4 border-b border-[#F0F5FA] bg-[#FAFCFF]/80">
        <span className="text-[15px] font-semibold text-[#5B6C8C]">Upload video file</span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {!file ? (
          <label className="w-full border-2 border-dashed border-[#DCE6F5] rounded-[16px] bg-[#FDFEFF]/80 hover:bg-[#F5F8FF] transition-colors flex flex-col items-center justify-center py-7 px-4 cursor-pointer mb-4 group h-full min-h-[220px]">
            <input type="file" className="hidden" accept="video/*,.mp4,.mov,.avi,.mkv,.webm" onChange={handleFileChange} />
            {/* 3D Folder Icon — Blue Video Theme */}
            <div className="relative w-[72px] h-[72px] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 drop-shadow-xl">
              <div className="absolute top-1 w-[62px] h-[46px] bg-[#E2E8F0] rounded-xl shadow-inner border border-white/50" />
              <div className="absolute top-[-2px] left-[5px] w-[22px] h-[14px] bg-[#E2E8F0] rounded-t-lg skew-x-[-15deg] origin-bottom-left border-t border-l border-white/50" />
              <div className="absolute bottom-1 w-[68px] h-[44px] bg-gradient-to-br from-[#38BDF8] to-[#2563EB] rounded-xl shadow-[0_10px_20px_-4px_rgba(37,99,235,0.55)] border-t border-white/40 flex items-center justify-center rotate-[-4deg] z-10">
                <FileVideo className="w-7 h-7 text-white drop-shadow" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-[13px] text-[#4A5568] text-center mb-1">
              Drag & drop or <span className="font-bold text-[#5C6AFF]">choose file</span>
            </p>
            <p className="text-[11px] text-[#8FA1C0] text-center">MP4, MOV, AVI, MKV, WEBM</p>
          </label>
        ) : (
          <div className="w-full flex flex-col items-center justify-center mb-4 bg-white/50 rounded-[16px] min-h-[220px]">
             {/* Monkey loading image */}
             <div className="relative w-28 h-20 mb-3">
                <img src="/uploading-monkey.png" alt="Analyzing..." className="w-full h-full object-contain mix-blend-multiply" />
             </div>
             <h3 className="text-[16px] font-medium text-[#1a1a1a] mb-1 tracking-tight">
                {progress < 30 ? "File is uploading..." : progress < 60 ? "Extracting features..." : progress < 90 ? "Analyzing with AI..." : "Finalizing report..."}
             </h3>
             <p className="text-[13px] text-gray-500 truncate max-w-[90%]">{file.name}</p>
          </div>
        )}

        {file && (
          <div className="w-full bg-[#FAFCFF] border border-[#E5EEF9] rounded-[14px] p-3 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[10px] bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
              <FileVideo className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[13px] font-semibold text-[#1a1a1a] truncate mr-2">{file.name}</span>
                <span className="text-[12px] font-bold text-[#5C6AFF] shrink-0">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#E5EEF9] rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-[#38BDF8] to-[#2563EB] rounded-full transition-all duration-300`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto">
          {progress === 100 ? (
            <button
              onClick={() => onFileReady(file)}
              className="w-full py-3 rounded-[12px] text-white font-bold text-[15px] bg-[#4274F6] shadow-[0_4px_15px_rgba(66,116,246,0.4)] hover:bg-[#325ec8] transition-all"
            >
              Run Analysis
            </button>
          ) : (
            <button disabled className="w-full py-3 rounded-[12px] font-bold text-[15px] bg-gray-200 text-gray-400 cursor-not-allowed">
              {file ? 'Uploading...' : 'Select a file to begin'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function URLCard({ onUrlReady }) {
  const [url, setUrl] = React.useState('');
  const [error, setError] = React.useState('');
  const [showErrorPopup, setShowErrorPopup] = React.useState(false);

  const validateUrl = (testUrl) => {
    const validDomains = [
      'youtube.com', 'youtu.be',
      'instagram.com',
      'x.com', 'twitter.com',
      'facebook.com', 'fb.watch', 'fb.com',
      'whatsapp.com', 'wa.me',
      'drive.google.com', 'dropbox.com'
    ];
    try {
      const hostname = new URL(testUrl).hostname;
      return validDomains.some(domain => hostname.includes(domain));
    } catch {
      return false;
    }
  };

  const handleRun = () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Please paste a URL first.'); return; }
    if (!validateUrl(trimmed)) {
      setShowErrorPopup(true);
      return;
    }
    setError('');
    onUrlReady(trimmed);
  };

  const platforms = [
    { name: 'YouTube', color: '#FF0000', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
    { name: 'Instagram', color: '#E1306C', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
    { name: 'X', color: '#000000', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg> },
    { name: 'Facebook', color: '#1877F2', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { name: 'WhatsApp', color: '#25D366', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.199 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
    { name: 'Google Drive', color: '#1FA463', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.3m16.55 5.5l-6.56 11.5H9.73l6.57-11.5"/></svg> },
    { name: 'Dropbox', color: '#0061FF', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12.01.78l6.76 4.33-6.76 4.35 6.76 4.33-6.76 4.33-6.76-4.33 6.76-4.33-6.76-4.35L12.01.78zM5.25 18.11l6.76 4.33 6.76-4.33v-1.12l-6.76 4.33-6.76-4.33v1.12z"/></svg> },
  ];

  return (
    <div className="flex-1 bg-white/95 backdrop-blur-xl rounded-[20px] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.10)] border border-white/60 flex flex-col overflow-hidden transition-all duration-300 hover:shadow-[0_16px_50px_-12px_rgba(0,0,0,0.15)] relative min-h-[370px]">
      
      {/* ERROR POPUP */}
      {showErrorPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 rounded-[20px]">
          <div className="bg-white rounded-[16px] shadow-2xl p-6 w-full max-w-[90%] flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 mb-1.5">Invalid Link</h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
              Please enter a valid link from YouTube, Instagram, X, Facebook, WhatsApp, Google Drive, or Dropbox.
            </p>
            <button
              onClick={() => setShowErrorPopup(false)}
              className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-[10px] hover:bg-gray-800 transition-colors text-[14px]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-b border-[#F0F5FA] bg-[#FAFCFF]/80">
        <span className="text-[15px] font-semibold text-[#5B6C8C]">Paste a link</span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex flex-wrap gap-2 mb-5">
          {platforms.map(p => (
            <span key={p.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E5EEF9] bg-[#F8FAFF] text-[12px] font-semibold text-[#5B6C8C] shadow-sm transition-all hover:bg-white hover:border-[#DCE6F5] hover:shadow hover:-translate-y-0.5 cursor-pointer">
              <span style={{ color: p.color, display: 'flex' }}>{p.icon}</span>
              {p.name}
            </span>
          ))}
        </div>

        <div className="relative mb-4 group">
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FA1C0] transition-colors group-focus-within:text-[#2563EB]" />
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleRun()}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full pl-10 pr-4 py-3.5 rounded-[14px] border-2 border-[#DCE6F5] bg-[#FDFEFF]/80 text-[14.5px] text-[#1a1a1a] placeholder-[#B0BDD8] outline-none focus:border-[#2563EB] focus:bg-white transition-all shadow-inner"
          />
        </div>

        {error && <p className="text-[12.5px] font-medium text-red-500 mb-3 -mt-2">{error}</p>}

        <p className="text-[12.5px] text-[#7A8CA6] leading-relaxed mb-6 font-medium">
          Paste any public video link from YouTube, Instagram, X, WhatsApp, Google Drive, or Dropbox. Our AI downloads and runs full visual deepfake analysis on the video.
        </p>

        <div className="mt-auto">
          <button
            onClick={handleRun}
            disabled={!url.trim()}
            className={`w-full py-3.5 rounded-[12px] text-white font-bold text-[15px] transition-colors ${
              url.trim()
                ? 'bg-[#1a1a1a] hover:bg-black shadow-sm border border-black'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            Analyze Link
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoDetection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#FAFAFA]">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full bg-[#FFEAE0] blur-[120px] opacity-80 mix-blend-multiply" />
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-[#DDF4FF] blur-[140px] opacity-90 mix-blend-multiply" />
        <div className="absolute bottom-[-20%] left-[20%] w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] rounded-full bg-[#F3E8FF] blur-[160px] opacity-70 mix-blend-multiply" />
      </div>
      {/* Film grain removed for performance */}
      <div className="z-50 relative w-full pt-2">
        <Navbar />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pt-4 pb-20 px-4 z-10 relative">
        <h1 className="text-[38px] md:text-[52px] font-bold text-[#1a1a1a] mb-2 tracking-tight text-center leading-[1.1]">
          Deepfake Video Detection
        </h1>
        <p className="text-[16px] text-[#6B7280] mb-8 text-center max-w-[600px]">
          Upload a video file or paste a link from any platform. Our AI runs multi-layer forensic analysis with highest accuracy and zero hallucination.
        </p>

        <div className="w-full max-w-[1100px] flex flex-col md:flex-row gap-5">
          <UploadCard onFileReady={(f) => { setAnalysisInput(f, null); navigate('/video-processing'); }} />

          {/* Divider */}
          <div className="flex md:flex-col items-center justify-center gap-2 shrink-0">
            <div className="flex-1 h-px md:h-auto md:w-px bg-[#E5EEF9]" />
            <span className="text-[12px] font-bold text-[#B0BDD8] uppercase tracking-widest px-2">or</span>
            <div className="flex-1 h-px md:h-auto md:w-px bg-[#E5EEF9]" />
          </div>

          <URLCard onUrlReady={(u) => { setAnalysisInput(null, u); navigate('/video-processing'); }} />
        </div>
      </div>
    </div>
  );
}
