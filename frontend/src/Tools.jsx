import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, ChevronRight, ChevronLeft, Image as ImageIcon, Check, Activity, Video, Mic, HelpCircle } from 'lucide-react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';

export default function Tools() {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const loadingMessages = [
    "Extracting forensic artifacts...",
    "Running deepfake detection models...",
    "Analyzing pixel inconsistencies...",
    "Querying neural networks...",
    "Finalizing verdict..."
  ];

  useEffect(() => {
    if (!isAnalyzing) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep(s => (s + 1) % loadingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  useEffect(() => {
    if (file && !isAnalyzing && progress < 100) {
      // Fake upload progress
      const pInt = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(pInt);
            return 100;
          }
          return p + 20;
        });
      }, 200);
      return () => clearInterval(pInt);
    }
  }, [file, isAnalyzing]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setProgress(0);
      setResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setIsAnalyzing(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${BACKEND}/analyze/media`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (data.error) {
        setResult({
          synthetic_score: 0, fraud_risk: 0, verdict: "BACKEND ERROR",
          details: { vision: data.error, audio: data.error, intent: "N/A" }
        });
      } else {
        setResult(data);
      }
    } catch (error) {
      setResult({
        synthetic_score: 0, fraud_risk: 0, verdict: "CONNECTION ERROR",
        details: { vision: "Failed to connect", audio: "Failed to connect", intent: "N/A" }
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    let loadingImg = "/uploading-monkey.png";
    if (loadingStep > 0) {
      loadingImg = "/fire-gif.gif";
    } else {
      if (file?.type?.startsWith('video/')) {
        loadingImg = "/loading-video.png";
      } else if (file?.type?.startsWith('audio/')) {
        loadingImg = "/loading-audio.png";
      }
    }

    return (
      <div className="min-h-screen bg-[#FBFBFC] flex flex-col items-center justify-center font-sans transition-opacity duration-500">
        <img src={loadingImg} alt="Uploading" className="w-[300px] mb-8" />
        <h2 className="text-[28px] font-medium text-[#1e2329] mt-2 tracking-tight animate-pulse">
          {loadingMessages[loadingStep]}
        </h2>
        <p className="text-[15px] font-medium text-[#8c94a0] mt-3">{file ? file.name : 'Processing...'}</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] font-sans flex items-center justify-center p-8">
        <div className="w-full max-w-[800px] bg-white rounded-3xl p-10 shadow-2xl">
           <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
              <div>
                <h3 className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-2">Forensic Verdict</h3>
                <h1 className="text-[32px] font-bold text-[#1a1a1a]">{file.name}</h1>
              </div>
              <span className={`px-6 py-2 rounded-full text-sm font-bold shadow-sm ${result.verdict.includes('AUTHENTIC') ? 'bg-green-100 text-green-700 border border-green-200' : result.verdict.includes('FAKE') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                {result.verdict}
              </span>
           </div>
           
           <div className="grid grid-cols-2 gap-8">
             <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <span className="text-sm text-gray-500 flex items-center gap-2 mb-3 font-medium"><Video className="w-4 h-4"/> Vision Analysis</span>
                <p className="text-[15px] font-bold text-gray-900">{result.details.vision}</p>
             </div>
             <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <span className="text-sm text-gray-500 flex items-center gap-2 mb-3 font-medium"><Mic className="w-4 h-4"/> Audio Analysis</span>
                <p className="text-[15px] font-bold text-gray-900">{result.details.audio}</p>
             </div>
           </div>
           
           <div className="mt-10 flex justify-end">
             <button onClick={() => { setFile(null); setResult(null); }} className="px-6 py-3 bg-[#1a1a1a] hover:bg-black text-white rounded-xl font-bold transition-colors">
               Analyze Another File
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans flex items-center justify-center p-8">
       {/* Background decorative elements */}
       <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50 to-transparent pointer-events-none"></div>

       {/* Upload Card */}
       <div className="w-[600px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-100 p-8 relative z-10 flex flex-col">
          
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-[18px] font-bold text-gray-900">Upload Photos</h2>
             <Link to="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
               <X className="w-4 h-4" />
             </Link>
          </div>

          {/* Drag & Drop Zone */}
          <div 
            className="w-full border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 flex flex-col items-center justify-center py-12 px-6 hover:bg-gray-100 hover:border-blue-300 transition-colors cursor-pointer relative"
            onClick={() => fileInputRef.current?.click()}
          >
             <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
             
             {/* Big Blue Icon inside Dropzone */}
             <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-blue-300 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-white/20 transform rotate-45 translate-x-4"></div>
                <ImageIcon className="w-8 h-8 text-white relative z-10" />
             </div>
             
             <p className="text-[15px] text-gray-900 font-bold mb-2">
               Drop your image here, or <span className="text-blue-600">browse</span>
             </p>
             <p className="text-[12px] text-gray-400 font-medium">Supports: PNG, JPG, JPEG, WEBP</p>
          </div>

          {/* File Selected State (Progress) */}
          {file && (
            <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                       {file.type.startsWith('image/') ? (
                         <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                       ) : (
                         <Video className="w-5 h-5 text-gray-400" />
                       )}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900 truncate max-w-[250px]">{file.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                 </div>
                 {progress >= 100 ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                 ) : (
                    <span className="text-[11px] font-bold text-gray-500">{progress}%</span>
                 )}
               </div>
               
               {/* Progress Bar */}
               <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1e3a8a] transition-all duration-300" style={{ width: `${progress}%` }}></div>
               </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
             <div className="h-px bg-gray-100 flex-1"></div>
             <span className="text-[11px] text-gray-400 font-bold uppercase">or</span>
             <div className="h-px bg-gray-100 flex-1"></div>
          </div>

          {/* Import from URL */}
          <div className="mb-8">
             <label className="block text-[13px] font-bold text-gray-900 mb-2">Import from URL</label>
             <div className="flex items-center gap-2">
               <input 
                 type="text" 
                 placeholder="Add file URL" 
                 className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-shadow"
               />
               <button className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                 Upload
               </button>
             </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
             <button className="flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-colors">
               <HelpCircle className="w-4 h-4" /> Help Centre
             </button>
             
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setFile(null)} 
                 className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleUpload}
                 disabled={!file || progress < 100}
                 className="px-8 py-2.5 bg-[#1e3a8a] hover:bg-[#152c6e] text-white rounded-xl text-[14px] font-bold transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Import
               </button>
             </div>
          </div>
       </div>
    </div>
  );
}