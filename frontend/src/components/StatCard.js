"use client";

import { motion } from "framer-motion";
import { useLayout } from "@/context/LayoutContext";

const StatCard = ({ title, value, subtext, icon: Icon, trend, colorClass = "red" }) => {
  const { isMobile } = useLayout();
  const isPositive = trend?.includes("▲") || trend?.startsWith("+") || trend?.includes("12.4%") || trend?.includes("8.1%");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.05)" }}
      className="relative p-5 sm:p-6 md:p-7 glass-card border border-border/50 group overflow-hidden bg-brand-surface/[0.02]"
    >
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-[2px] sm:tracking-[3px] text-main/40 font-black group-hover:text-brand-neonblue transition-all">{title}</h3>
            {Icon && (
              <div className="p-1.5 sm:p-2 mr-[-4px] rounded-xl bg-brand-bgbase border border-border/50 text-muted group-hover:text-brand-neonblue group-hover:border-brand-neonblue/20 transition-all shadow-inner">
                <Icon size={isMobile ? 12 : 16} />
              </div>
            )}
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-rajdhani font-black text-main tracking-tighter mb-1 group-hover:scale-[1.02] transition-transform origin-left truncate">
            {value}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {trend && (
            <div className={`px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-black tracking-wider ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-brand-crimson/10 text-brand-crimson'}`}>
              <span>{isPositive ? "▲" : "▼"}</span>
              {trend}
            </div>
          )}
          {subtext && <span className="text-[10px] text-main/30 font-black uppercase tracking-tight">{subtext}</span>}
        </div>
      </div>

      {/* Subtle corner glow */}
      <div className={`absolute -bottom-12 -right-12 w-32 h-32 blur-[60px] rounded-full pointer-events-none transition-all duration-700 opacity-0 group-hover:opacity-20 ${isPositive ? 'bg-green-500' : 'bg-brand-crimson'}`} />
    </motion.div>
  );
};

export default StatCard;
