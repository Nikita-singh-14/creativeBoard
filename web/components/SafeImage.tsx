"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  placeholderLabel?: string;
}

export function SafeImage({ src, alt, className = "", placeholderLabel }: SafeImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const safeSource = src?.trim() ?? "";
  const valid = (() => {
    try {
      const url = new URL(safeSource);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  })();

  if (!valid || failedSource === safeSource) {
    return (
      <div className={`safe-image-placeholder ${className}`} role="img" aria-label={`${alt} (image unavailable)`}>
        <span className="placeholder-mark"><ImageOff size={20} /></span>
        {placeholderLabel ? <span className="placeholder-label">{placeholderLabel}</span> : null}
      </div>
    );
  }

  return (
    <div className={`safe-image-wrap ${className}`}>
      <div className="image-shimmer" aria-hidden="true" />
      <img src={safeSource} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(safeSource)} />
    </div>
  );
}
