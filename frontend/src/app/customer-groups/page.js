"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Users, Filter, Plus, Edit2, Trash2, ShieldCheck, UserCheck, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function CustomerGroupsPage() {
  const groups = [
    { name: "CORPORATE PARTNERS", type: "Entity", percentage: "+ 15.00%", icon: Briefcase, color: "text-brand-crimson", bg: "bg-brand-crimson/5" },
    { name: "CORE RETAIL", type: "Standard", percentage: "0.00%", icon: UserCheck, color: "text-brand-neonblue", bg: "bg-brand-neonblue/5" },
    { name: "BULK WHOLESALE", type: "Wholesale", percentage: "- 10.00%", icon: ShieldCheck, color: "text-green-500", bg: "bg-green-500/5" },
  ];

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-all duration-500">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="ENTITY SEGMENTATION" />

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative z-10 bg-brand-bgbase">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
               <motion.h2 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="text-[10px] font-black tracking-[4px] uppercase text-muted/60 mb-2"
               >
                 Hierarchical Definition
               </motion.h2>
               <h1 className="text-4xl font-rajdhani font-black tracking-tight text-main uppercase">
                 Segment <span className="text-brand-neonblue">Controls</span>
               </h1>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-brand-crimson text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px] flex items-center gap-4 hover:bg-red-700 transition shadow-[0_8px_20px_rgba(215,38,56,0.2)]"
            >
              <Plus size={18} strokeWidth={3} /> 
              Define New Segment
            </motion.button>
          </div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="glass-card p-10 shadow-[0_8px_40px_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-muted/20 rounded-full" />
                <div>
                   <h3 className="text-lg font-rajdhani font-black uppercase text-main tracking-[2px]">Configured Logic Layers</h3>
                   <p className="text-[10px] text-muted font-bold uppercase tracking-widest opacity-40">System-wide pricing & tax modifiers</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[3px] text-muted/30 border-b border-border/10">
                    <th className="pb-8 pr-4">Designation</th>
                    <th className="pb-8 px-4">Entity Type</th>
                    <th className="pb-8 px-4">Fiscal Modifier</th>
                    <th className="pb-8 px-4 text-right w-40">Operations</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {groups.map((group, i) => (
                    <motion.tr 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.01)" }}
                      className="border-b border-main/5 transition-all group"
                    >
                      <td className="py-8 pr-4">
                        <div className="flex items-center gap-4">
                           <div className={`p-3 ${group.bg} ${group.color} rounded-xl border border-current/10 transition-all group-hover:scale-110`}>
                              <group.icon size={18} />
                           </div>
                           <span className="font-black text-[15px] text-main tracking-tight group-hover:text-brand-neonblue transition-colors uppercase">{group.name}</span>
                        </div>
                      </td>
                      <td className="py-8 px-4">
                         <span className="text-[11px] font-black text-muted uppercase tracking-[2px] opacity-40">{group.type} Node</span>
                      </td>
                      <td className="py-8 px-4 font-mono font-black text-[14px] text-main tracking-tighter">
                        {group.percentage}
                      </td>
                      <td className="py-8 px-4 text-right">
                        <div className="flex justify-end gap-3 text-muted">
                          <button className="p-3 bg-brand-bgbase border border-border/20 rounded-xl hover:text-brand-neonblue hover:border-brand-neonblue/20 transition-all">
                             <Edit2 size={16} />
                          </button>
                          <button className="p-3 bg-brand-bgbase border border-border/20 rounded-xl hover:text-brand-crimson hover:border-brand-crimson/20 transition-all">
                             <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-4 py-6 bg-brand-bgbase/30 rounded-2xl border border-border/5">
               <div className="w-2 h-2 rounded-full bg-brand-neonblue animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-[3px] text-muted opacity-40">Security Status: Logic Enforced System-Wide</span>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
