"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, ShieldCheck, MapPin, Calendar, Edit3 } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const getInitials = (name) => {
    if (!name) return "AD";
    const clean = name.includes("@") ? name.split("@")[0] : name;
    const parts = clean.split(/[._\s]+/);
    if (parts.length > 1) {
      return (parts[0][0] + (parts[1][0] || "")).toUpperCase().slice(0, 2);
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const displayName = user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.full_name || user?.username || "Administrator");
  const userEmail = user?.email || (user?.username && !user.username.includes('@') ? `${user.username}@pcalley.com` : user?.username || "admin@pcalley.com");

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="USER PROFILE" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Profile Header */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-brand-surface border border-border rounded-[32px] p-8 md:p-12 mb-8 relative overflow-hidden shadow-sm"
            >
               <div className="absolute top-0 right-0 p-8">
                 <div 
                   onClick={() => router.push("/settings")}
                   className="w-12 h-12 rounded-2xl bg-brand-bgbase border border-border flex items-center justify-center text-muted hover:text-brand-neonblue transition-colors cursor-pointer"
                 >
                   <Edit3 size={20} />
                 </div>
               </div>

               <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
                 <div className="w-32 h-32 rounded-[40px] bg-gradient-to-tr from-brand-crimson to-brand-neonpurple flex items-center justify-center text-4xl font-black text-main shadow-2xl">
                   {getInitials(displayName)}
                 </div>
                 
                 <div className="text-center md:text-left">
                   <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                     <h2 className="text-4xl font-rajdhani font-bold text-main tracking-tight">{displayName}</h2>
                     <ShieldCheck size={24} className="text-brand-neonblue" />
                   </div>
                   <p className="text-xs font-black text-muted uppercase tracking-[4px] mb-6">{user?.role || "Global Administrator"}</p>
                   
                   <div className="flex flex-wrap justify-center md:justify-start gap-4">
                     <div className="flex items-center gap-2 px-4 py-2 bg-brand-bgbase border border-border rounded-xl text-[11px] font-bold text-muted">
                       <Mail size={14} className="text-brand-neonpurple" /> {userEmail}
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-brand-bgbase border border-border rounded-xl text-[11px] font-bold text-muted">
                       <Shield size={14} className="text-brand-neonblue" /> ID: AUTH-8829-X
                     </div>
                   </div>
                 </div>
               </div>
            </motion.div>

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-brand-surface border border-border rounded-[32px] p-8 shadow-sm"
              >
                <h3 className="text-[10px] font-black tracking-[4px] uppercase text-muted mb-8">Access Credentials</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-4 border-b border-border/50">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Username</span>
                    <span className="text-[13px] font-bold text-main">{user?.username || "root_admin"}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-border/50">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Last Access</span>
                    <span className="text-[11px] font-black text-brand-neonblue uppercase tracking-widest">Just Now</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-brand-surface border border-border rounded-[32px] p-8 shadow-sm"
              >
                <h3 className="text-[10px] font-black tracking-[4px] uppercase text-muted mb-8">System Permissions</h3>
                <div className="space-y-4">
                  {[
                    { label: "Inventory Scoping", status: "ENABLED", color: "text-brand-neonblue" },
                    { label: "Financial Voids", status: "ENABLED", color: "text-brand-neonblue" },
                    { label: "Personnel Entry", status: "ENABLED", color: "text-brand-neonblue" },
                    { label: "System Hardened", status: "VERIFIED", color: "text-brand-neonpurple" },
                  ].map((perm, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-brand-bgbase border border-border rounded-2xl group hover:border-brand-neonblue/20 transition-all">
                      <span className="text-[11px] font-bold text-muted uppercase tracking-widest">{perm.label}</span>
                      <span className={`text-[9px] font-black px-2 py-1 bg-brand-surface border border-border rounded-lg ${perm.color}`}>{perm.status}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
