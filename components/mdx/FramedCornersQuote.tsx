import React from "react";

/**
 * FramedQuote — premium pull quote with beautiful corner frames, centered text.
 */
export default function FramedQuote({
  children,
  author,
}: {
  children: React.ReactNode;
  author?: string;
}) {
  return (
    <blockquote className="relative my-8 px-8 py-6 bg-slate-50/70 border border-slate-100 rounded-2xl max-w-2xl mx-auto">
      {/* Top Left Corner */}
      <svg
        width="24"
        height="24"
        aria-hidden="true"
        className="absolute top-3 left-3 text-slate-400"
      >
        <path
          d="M0 24 L0 0 L24 0"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      {/* Bottom Right Corner */}
      <svg
        width="24"
        height="24"
        aria-hidden="true"
        className="absolute bottom-3 right-3 text-slate-400"
      >
        <path
          d="M24 0 L24 24 L0 24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      <div className="text-center text-slate-800 text-[17px] sm:text-lg leading-relaxed font-serif italic px-4">
        {children}
      </div>

      {author && (
        <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 mt-4 not-italic">
          — {author}
        </p>
      )}
    </blockquote>
  );
}
