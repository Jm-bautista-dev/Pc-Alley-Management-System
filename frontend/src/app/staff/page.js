"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StaffRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/personnel");
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-bgbase flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-neonblue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs uppercase tracking-widest text-muted font-bold">Redirecting to Personnel Registry...</p>
      </div>
    </div>
  );
}
