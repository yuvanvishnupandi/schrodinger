import React from 'react';
import Navbar from './Navbar';
import { Mail, MapPin, Send } from 'lucide-react';

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
);

const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
);

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#FBFBFC] flex flex-col font-sans relative overflow-hidden">
      <Navbar />
      
      {/* Decorative background blur */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full flex-1 flex items-center justify-center py-20 px-6 z-10">
        <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column - Text & Info */}
          <div>
            <h1 className="text-[56px] lg:text-[72px] font-black text-[#1a1a1a] tracking-tight leading-[1.1] mb-6">
              Let's build<br/>trust together.
            </h1>
            <p className="text-[18px] text-gray-600 mb-12 max-w-[480px] leading-relaxed">
              Whether you're a journalist verifying a source, a researcher studying synthetic media, or just saying hi—we'd love to hear from you.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4 group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Mail className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Us</h4>
                  <p className="text-[18px] font-bold text-[#1a1a1a]">hello@schrodinger.io</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <MapPin className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-1">HQ</h4>
                  <p className="text-[18px] font-bold text-[#1a1a1a]">Silicon Valley, CA</p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:-translate-y-1 hover:shadow-md transition-all text-gray-600 hover:text-black">
                <GithubIcon />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:-translate-y-1 hover:shadow-md transition-all text-gray-600 hover:text-black">
                <TwitterIcon />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:-translate-y-1 hover:shadow-md transition-all text-gray-600 hover:text-black">
                <LinkedinIcon />
              </a>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="bg-white p-8 md:p-12 rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.07)] border border-gray-100">
            <h3 className="text-[24px] font-bold text-[#1a1a1a] mb-8">Send a message</h3>
            
            <form className="space-y-6" onSubmit={e => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-500 pl-1">First Name</label>
                  <input type="text" placeholder="John" className="w-full px-5 py-4 rounded-[16px] bg-[#F8FAFF] border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-[15px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-500 pl-1">Last Name</label>
                  <input type="text" placeholder="Doe" className="w-full px-5 py-4 rounded-[16px] bg-[#F8FAFF] border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-[15px]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-500 pl-1">Email</label>
                <input type="email" placeholder="john@example.com" className="w-full px-5 py-4 rounded-[16px] bg-[#F8FAFF] border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-[15px]" />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-500 pl-1">Message</label>
                <textarea rows="4" placeholder="How can we help?" className="w-full px-5 py-4 rounded-[16px] bg-[#F8FAFF] border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-[15px] resize-none"></textarea>
              </div>

              <button type="submit" className="w-full py-4 rounded-[16px] bg-[#1a1a1a] text-white font-bold text-[16px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors duration-300">
                Send Message <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
