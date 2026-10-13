"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RetiredDraftsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sell/all");
  }, [router]);
  return (
    <div className="flex h-screen items-center justify-center bg-brand-bgbase text-muted text-xs font-mono uppercase tracking-widest">
      Feature retired. Redirecting to All Sales...
    </div>
  );
}
