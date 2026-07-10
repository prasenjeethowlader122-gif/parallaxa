
'use client';

import React, { useEffect, useRef } from 'react';
{/**
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});
**/}
export default function MermaidRenderer({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && code) {
      ref.current.removeAttribute('data-processed');
      //mermaid.contentLoaded();
    }
  }, [code]);

  return (
    <div className="mermaid-wrapper my-8 flex justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100 overflow-x-auto">
      <div  className="mermaid">
        {code}
      </div>
    </div>
  );
}
