import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  return (
    <div className="w-screen h-screen relative flex items-center justify-center overflow-hidden font-sans bg-black">
      
      {/* 1. Base Blurred Background - Locked to viewport */}
      <img 
        src="/login-bg-pure.jpg"
        alt="background"
        className="fixed inset-0 w-[100vw] h-[100vh] object-cover z-0 pointer-events-none"
        style={{
          filter: 'blur(3px) brightness(0.95)',
          transform: 'scale(1.03)', // Prevent blurred white edges from bleeding into viewport
          transformOrigin: 'center center'
        }}
      />

      {/* 2. Main Modal Card */}
      {/* Framer motion preserves the -40px shift safely without overwriting CSS transforms! */}
      <motion.div 
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: -40 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        className="relative z-10 bg-[#fdfdfc] w-[1152px] h-[648px] max-w-[95vw] rounded-[36px] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.5)] flex p-2"
      >
        
        {/* Left Side: Painting (Sharp Crop Window) */}
        <div 
          className="w-[45%] h-full rounded-[30px] overflow-hidden relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.02)]"
        >
          {/* Pure CSS mathematical alignment to the viewport (0 JS required) */}
          <img 
            src="/login-bg-pure.jpg"
            alt="background sharp"
            className="absolute max-w-none object-cover pointer-events-none"
            style={{
              width: '100vw',
              height: '100vh',
              left: 'calc(-50vw + 608px)',
              top: 'calc(-50vh + 316px)',
              transform: 'scale(1.03)', // Exact same scale as background
              transformOrigin: 'center center'
            }}
          />
        </div>

        {/* Right Side: Outlet for Form Content */}
        <div className="w-[55%] h-full flex flex-col justify-between pl-14 pr-16 py-12 relative z-50 bg-[#fdfdfc] rounded-r-[30px]">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
}
