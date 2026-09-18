"use client";

import { motion } from "framer-motion";

/**
 * SYSTEM LOGO COMPONENT
 * Uses the official circular PC ALLEY logo.
 */

export const LogoIcon = ({ className = "w-12 h-12" }) => {
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`${className} relative flex items-center justify-center shrink-0`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt="PC ALLEY Logo"
        className="w-full h-full object-contain rounded-full drop-shadow-sm select-none"
      />
    </motion.div>
  );
};

export const LogoBrandingV2 = ({ className = "", size = "normal" }) => {
  // Determine sizes based on the 'size' prop
  const iconSize = size === "large" ? "w-12 h-12" : (size === "small" ? "w-8 h-8" : "w-10 h-10");
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
        <span className={`${mainTextSize} font-black tracking-tighter text-white font-rajdhani leading-[0.9]`}>
          PC ALLEY
        </span>
        <span className={`${subTextSize} tracking-[0.4em] text-slate-400 font-bold uppercase leading-tight mt-1.5`}>
          Integrated Systems
        </span>
      </motion.div>
    </div>
  );
};

export default LogoBrandingV2;
