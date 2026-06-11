"use client";

import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

/**
 * MODERN LOGO COMPONENT
 * Clean, CSS-driven implementation based on the new brand identity.
 * Adapts to light/dark themes and any screen size.
 */

export const LogoIcon = ({ className = "w-12 h-12" }) => {
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`${className} relative flex items-center justify-center shrink-0 group`}
    >
      {/* Outer Glow Effect */}
      <div className="absolute inset-[-20%] bg-[#FF2D55] blur-[15px] opacity-20 group-hover:opacity-40 transition-opacity duration-300 rounded-[30%]" />
      
      {/* The Rounded Square Icon with Gradient and Inner Shadow */}
      <div className="relative w-full h-full bg-gradient-to-br from-[#FF6B8B] to-[#FF2D55] rounded-[30%] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(255,45,85,0.3)] border border-white/20 flex items-center justify-center overflow-hidden">
        
        {/* Subtle inner reflection */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent opacity-60 rounded-t-[30%]" />
        
        {/* Logo Icon inside the square */}
        <Cpu className="text-white relative z-10 w-[55%] h-[55%] drop-shadow-md" strokeWidth={2.5} />
      </div>
    </motion.div>
  );
};

export const LogoBrandingV2 = ({ className = "", size = "normal" }) => {
  // Determine sizes based on the 'size' prop
  const iconSize = size === "large" ? "w-12 h-12" : (size === "small" ? "w-7 h-7" : "w-10 h-10");
  const mainTextSize = size === "large" ? "text-3xl" : (size === "small" ? "text-lg" : "text-2xl");
  const subTextSize = size === "large" ? "text-[9px]" : (size === "small" ? "text-[6px]" : "text-[8px]");
  const gap = size === "large" ? "gap-4" : (size === "small" ? "gap-2" : "gap-3");

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      <LogoIcon className={`${iconSize}`} />
      
      <motion.div
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col justify-center"
      >
        <span className={`${mainTextSize} font-black tracking-tighter text-main font-rajdhani leading-[0.9]`}>
          PC ALLEY
        </span>
        <span className={`${subTextSize} tracking-[0.4em] text-muted font-bold uppercase leading-tight mt-1.5 opacity-70`}>
          Integrated Systems
        </span>
      </motion.div>
    </div>
  );
};

export default LogoBrandingV2;
