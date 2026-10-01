import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Image as ImageIcon, Mic, Video, FileText, Users, Sparkles, ArrowRight, LogOut } from 'lucide-react';

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (email) setUser(email);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    setUser(null);
  };

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    
    if (window.location.pathname !== '/hero' && window.location.pathname !== '/') {
      window.location.href = `/hero${targetId}`;
      return;
    }
    
    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;

    // Adjust for sticky navbar height (approx 80px)
    const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - 80;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    const duration = 1200; // 1.2 seconds for slow, cinematic scroll
    let start = null;

    const easing = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animation = (currentTime) => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const progress = Math.min(timeElapsed / duration, 1);
      
      window.scrollTo(0, startPosition + distance * easing(progress));
      
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        window.history.pushState(null, '', targetId);
      }
    };

    requestAnimationFrame(animation);
  };

  return (
      <div className="w-full bg-white/60 backdrop-blur-md py-4 z-50 sticky top-0">
        <div className="max-w-[900px] w-full mx-auto p-1.5 rounded-[20px] bg-[#E5EEF9]">
          <nav className="flex items-center justify-between px-3 py-2 bg-white rounded-[16px]">
            <div className="flex items-center w-1/3 justify-start pl-2">
              <Link to="/hero" className="hover:opacity-80 transition-opacity">
                <span className="text-[24px] font-['Playfair_Display'] font-bold tracking-tight text-[#1a1a1a]">Schrödinger</span>
              </Link>
            </div>
            
            <div className="flex items-center justify-center w-1/3 text-[15px] font-bold text-[#4B5563] relative gap-2">
              {/* Mega Menu Trigger */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className={`flex items-center gap-1 hover:bg-gray-100 rounded-[12px] px-4 py-2 transition-colors ${isToolsOpen ? 'bg-gray-100' : ''}`}
                >
                  Tools
                </button>
                
                {/* Mega Menu Dropdown */}
                <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[500px] lg:w-[600px] bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 p-0 transition-all duration-300 overflow-hidden flex flex-col ${isToolsOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                  
                  <div className="p-4 text-center border-b border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tools</span>
                  </div>
                  
                  <div className="grid grid-cols-3 w-full bg-white">
                    {/* Tool 1 */}
                    <Link to="/video-detection" className="flex flex-col items-center justify-center p-6 border-r border-gray-100 hover:bg-gray-50 transition-colors group/item">
                      <div className="w-12 h-12 rounded-[16px] bg-[#eff4fe] text-blue-600 flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                        <Video className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <span className="text-[13px] font-semibold text-gray-700">Video & Image</span>
                    </Link>

                    {/* Tool 2 */}
                    <Link to="/audio-detection" className="flex flex-col items-center justify-center p-6 border-r border-gray-100 hover:bg-gray-50 transition-colors group/item">
                      <div className="w-12 h-12 rounded-[16px] bg-[#eff4fe] text-blue-600 flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                        <Mic className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <span className="text-[13px] font-semibold text-gray-700">Audio</span>
                    </Link>

                    {/* Tool 3 */}
                    <a href="https://arxiv.org/abs/2008.12262" target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-6 hover:bg-gray-50 transition-colors group/item">
                      <div className="w-12 h-12 rounded-[16px] bg-[#eff4fe] text-blue-600 flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                        <Sparkles className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <span className="text-[13px] font-semibold text-gray-700">Research Links</span>
                    </a>
                  </div>

                </div>
              </div>

              <a href="/hero#technology" onClick={(e) => handleSmoothScroll(e, '#technology')} className="hover:bg-gray-100 rounded-[12px] px-4 py-2 transition-colors">Technology</a>
              <a href="/hero#developers" onClick={(e) => handleSmoothScroll(e, '#developers')} className="hover:bg-gray-100 rounded-[12px] px-4 py-2 transition-colors">Developers</a>
              <a href="/hero#faq" onClick={(e) => handleSmoothScroll(e, '#faq')} className="hover:bg-gray-100 rounded-[12px] px-4 py-2 transition-colors">FAQ</a>
            </div>

            <div className="flex items-center w-1/3 justify-end pr-2 gap-3">
              {user ? (
                <>
                  <a href="https://github.com/aaronchong888/DeepFake-Detect" target="_blank" rel="noreferrer" className="bg-[#111111] ring-[3px] ring-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center gap-3 hover:scale-105 hover:shadow-lg text-white pl-1.5 pr-5 py-1.5 rounded-full text-[14px] font-bold transition-all group">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="w-4 h-4 text-black" strokeWidth={2.5} />
                    </div>
                    View Repository
                  </a>
                  <button onClick={handleLogout} className="flex items-center justify-center p-2.5 rounded-full text-gray-400 hover:bg-red-500 hover:text-white transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]" title="Logout">
                    <LogOut className="w-[18px] h-[18px]" strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <Link to="/login" className="bg-gradient-to-b from-[#3a3a3a] to-[#141414] shadow-[0_4px_15px_rgba(0,0,0,0.3)] flex items-center gap-3 hover:scale-105 text-white pl-4 pr-1.5 py-1.5 rounded-[12px] text-[14px] font-bold transition-transform">
                  Sign In 
                  <div className="w-7 h-7 bg-white rounded-[8px] flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-black"/>
                  </div>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
  );
}
