'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log exception details with timestamp and stack trace for telemetry
    console.error(`[FRONTEND UNHANDLED ERROR] [${new Date().toISOString()}]:`, {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      digest: error?.digest
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0D111A] border border-red-500/20 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-xl">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
          <AlertTriangle size={32} />
        </div>
        
        <h2 className="text-xl font-bold font-rajdhani uppercase tracking-wider text-white mb-2">
          Interface Exception Intercepted
        </h2>
        
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          An unexpected interface state occurred. The subsystem remains active and safe.
          {error?.digest && (
            <span className="block text-xs font-mono text-gray-500 mt-2">
              Trace Vector: {error.digest}
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw size={14} />
            Recover View
          </button>
          
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
          >
            <Home size={14} />
            Command Core
          </Link>
        </div>
      </div>
    </div>
  );
}
