"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Modal({ title, eyebrow, onClose, children, wide = false }: {
  title: string; eyebrow?: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = panel.current?.querySelector<HTMLElement>("input, button, select, textarea, a[href]");
    (target ?? panel.current)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab" && panel.current) {
        const focusable = [...panel.current.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]")];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}>
      <div className={`modal-panel ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={panel}>
        <div className="modal-heading">
          <div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h2 id="modal-title">{title}</h2></div>
          <button className="icon-button" aria-label="Close dialog" onClick={() => onCloseRef.current()}><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, children, confirmLabel, onCancel, onConfirm, pending = false, danger = true }: {
  title: string; children: React.ReactNode; confirmLabel: string; onCancel: () => void; onConfirm: () => void; pending?: boolean; danger?: boolean;
}) {
  return (
    <Modal title={title} eyebrow="Please confirm" onClose={() => { if (!pending) onCancel(); }}>
      <div className="confirm-copy">{children}</div>
      <div className="modal-actions">
        <button className="button button-secondary" onClick={onCancel} disabled={pending}>Cancel</button>
        <button className={`button ${danger ? "button-danger" : "button-primary"}`} onClick={onConfirm} disabled={pending}>
          {pending ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
