"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminProductRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/purchases/restock");
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-bgbase flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-border border-t-brand-neonblue rounded-full animate-spin" />
        <p className="text-xs font-rajdhani font-bold uppercase tracking-widest text-muted">
          Redirecting to Procurement Restock Hub...
        </p>
      </div>
    </div>
  );
}
