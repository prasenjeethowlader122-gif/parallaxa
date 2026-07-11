'use client';
import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false, // important: don't auto-scan the whole page
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

export default function MermaidRenderer({ code }: { code: string }) {
  const [svg, setSvg] = useState < string > ('');
  const [error, setError] = useState < string | null > (null);
  const idRef = useRef(`mermaid-${useId().replace(/:/g, '')}`);
  
  useEffect(() => {
    let cancelled = false;
    if (!code?.trim()) return;
    
    mermaid
      .render(idRef.current, code)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to render diagram');
      });
    
    return () => {
      cancelled = true;
    };
  }, [code]);
  
  if (error) {
    return (
      <div className="my-8 p-4 rounded-2xl border border-red-100 bg-red-50 text-sm text-red-700">
        Diagram error: {error}
      </div>
    );
  }
  
  return (
    <div
      className="mermaid-wrapper my-8 flex justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}