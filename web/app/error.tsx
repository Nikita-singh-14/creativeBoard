"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("CreativeBoard page error", error); }, [error]);
  return (
    <main className="not-found-page" role="alert">
      <div className="empty-icon error-icon"><AlertCircle size={24} /></div>
      <span className="eyebrow">Something went wrong</span>
      <h1>Your ideas are safe.</h1>
      <p>We hit an unexpected error while loading this page. Please try again.</p>
      <div className="modal-actions"><button className="button button-secondary" onClick={reset}>Try again</button><Link href="/" className="button button-primary"><ArrowLeft size={15} /> Back to dashboard</Link></div>
    </main>
  );
}
