import React from 'react';
import Navbar from './Navbar';
import { Shield, Zap, Search, Lock, Mic, Video, Image as ImageIcon, BarChart3 } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: <Video className="w-8 h-8 text-blue-500" />,
      title: "Video Deepfake Detection",
      description: "Analyze frame-by-frame visual inconsistencies, facial tracking anomalies, and blending artifacts using state-of-the-art vision models."
    },
    {
      icon: <Mic className="w-8 h-8 text-purple-500" />,
      title: "Audio Forgery Analysis",
      description: "Detect synthetic voices and cloned audio through frequency analysis, finding unnatural breathing and spectral anomalies."
    },
    {
      icon: <ImageIcon className="w-8 h-8 text-pink-500" />,
      title: "Image Authenticity",
      description: "Uncover pixel-level tampering, AI generation artifacts from Midjourney/DALL-E, and metadata inconsistencies in photos."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-500" />,
      title: "Detailed Forensics Report",
      description: "Get a comprehensive breakdown of why media was flagged. We don't just give a score; we explain the 'why' with visual evidence."
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Zero Hallucination",
      description: "Built on deterministic forensic models to ensure extremely low false positive rates. Precision you can trust for journalistic integrity."
    },
    {
      icon: <Lock className="w-8 h-8 text-indigo-500" />,
      title: "Enterprise Privacy",
      description: "All media is processed in memory and immediately purged. We enforce a strict zero-retention policy to protect your sensitive data."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex flex-col font-sans">
      <Navbar />
      
      <div className="w-full flex-1 pt-24 pb-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-[800px] mx-auto mb-20">
            <h1 className="text-[48px] md:text-[64px] font-black text-[#1a1a1a] tracking-tight leading-[1.1] mb-6">
              Forensic power at your fingertips.
            </h1>
            <p className="text-[18px] md:text-[20px] text-gray-500 leading-relaxed font-medium">
              Schrödinger is equipped with multi-layered neural networks designed specifically to catch what the human eye and ear cannot.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 hover:-translate-y-2 transition-transform duration-300 group">
                <div className="w-16 h-16 rounded-[16px] bg-gray-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-[22px] font-bold text-[#1a1a1a] mb-4">{feature.title}</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
