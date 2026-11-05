"use client";

import { AlertCircle, ArrowLeft, ArrowRight, FolderOpen, Search } from "lucide-react";
import Link from "next/link";

export function LoadingCards({ count = 3 }: { count?: number }) {
  return <div className="project-grid" aria-label="Loading projects">{Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index}><div className="skeleton-cover" /><div className="skeleton-line wide" /><div className="skeleton-line" /></div>)}</div>;
}

export function EmptyState({ filtered = false, onClear, onCreate }: { filtered?: boolean; onClear?: () => void; onCreate?: () => void }) {
  const Icon = filtered ? Search : FolderOpen;
  return (
    <section className="empty-state">
      <div className="empty-icon"><Icon size={24} /></div>
      <h2>{filtered ? "No projects match" : "Your next big idea starts here"}</h2>
      <p>{filtered ? "Try a different search or clear the filters." : "Create a project to bring all your inspiration together."}</p>
      {filtered ? <button className="button button-secondary" onClick={onClear}>Clear filters</button> : <button className="button button-primary" onClick={onCreate}>Create your first project <ArrowRight size={16} /></button>}
    </section>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="error-state" role="alert">
      <div className="empty-icon error-icon"><AlertCircle size={23} /></div>
      <h2>We couldn’t load your workspace</h2>
      <p>{message}</p>
      <button className="button button-secondary" onClick={onRetry}>Try again</button>
    </section>
  );
}

export function NotFoundState({ message = "We couldn’t find the page you’re looking for." }: { message?: string }) {
  return (
    <main className="not-found-page">
      <span className="eyebrow">404 · Page not found</span>
      <h1>Looks like this canvas is blank.</h1>
      <p>{message}</p>
      <Link href="/" className="button button-primary"><ArrowLeft size={16} /> Back to dashboard</Link>
    </main>
  );
}
