'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(`[FATAL ROOT ERROR] [${new Date().toISOString()}]:`, error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#07090E] text-white min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#0D111A] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400 font-bold text-2xl">
            !
          </div>
          <h2 className="text-xl font-bold uppercase tracking-wider mb-2">
            System Level Outage Intercepted
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            A critical root error was contained. Click below to reinitialize the session.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg"
          >
            Reinitialize Subsystem
          </button>
        </div>
      </body>
    </html>
  );
}
