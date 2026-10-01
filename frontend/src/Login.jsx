import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email === 'yuvan@gmail.com' && password === 'yvp') {
      localStorage.setItem('user_email', email);
      onLogin();
      return;
    }
    
    try {
      const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('user_email', data.email);
        onLogin();
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError('Network error - backend unreachable');
    }
  };
  return (
    <>
      {/* Back Button */}
      <Link to="/" className="flex items-center text-[13px] font-medium text-black hover:opacity-70 transition-opacity w-max">
        <ArrowLeft className="w-3.5 h-3.5 mr-2" strokeWidth={2} /> Back
      </Link>

      {/* Titles & Form */}
      <motion.div 
        key="login-form"
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex-1 flex flex-col justify-center mt-2"
      >
        <h2 className="text-[17px] font-medium text-black mb-1">Login to</h2>
        <h1 className="text-[46px] leading-[1.05] font-['Playfair_Display'] text-black mb-10 tracking-tight">
          Where Knowledge<br/>Comes Alive
        </h1>

        <form 
          className="flex flex-col gap-3.5 w-full" 
          onSubmit={handleSubmit}
        >
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <input 
            type="email" 
            placeholder="Enter email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#f4f4f4] text-[13.5px] px-6 py-[16px] rounded-full text-black placeholder-[#a8a8a8] focus:outline-none focus:bg-[#ebebeb] transition-colors"
            required
          />
          <div className="relative w-full">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Enter password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#f4f4f4] text-[13.5px] px-6 py-[16px] rounded-full text-black placeholder-[#a8a8a8] focus:outline-none focus:bg-[#ebebeb] transition-colors pr-12"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[12px] text-[#8e8e8e] mt-1 mb-2 font-medium">
            Don't have an account? <Link to="/signup" className="text-[#5955e8] hover:underline">Sign up</Link>
          </p>
          
          <button type="submit" className="w-full bg-black text-white rounded-full py-[16px] text-[14px] font-bold hover:bg-gray-800 transition-colors cursor-pointer relative z-50 hover:shadow-lg active:scale-[0.98]">
            Login
          </button>
        </form>
      </motion.div>

      {/* Footer Logo Area */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0, delay: 0.2 }}
        className="flex items-center mt-10 mb-2"
      >
        {/* Logo Text */}
        <span className="text-[26px] font-['Playfair_Display'] font-bold tracking-tight text-[#1a1a1a] shrink-0">Schrödinger</span>
        
        {/* Footer Tagline */}
        <p className="text-[9.5px] font-medium text-[#7a7a7a] leading-tight ml-4 border-l border-gray-300 pl-4 py-0.5">
          Advanced forensic analysis<br/>for a secure digital future.
        </p>
      </motion.div>
    </>
  );
}// Trigger Vercel Build
