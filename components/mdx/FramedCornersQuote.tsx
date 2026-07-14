import React from "react";

/**
 * FramedQuote — pull quote with open bracket corners, centered text.
 *
 * Usage in .mdx:
 *
 * <FramedQuote author="John Johnson">
 *   First, solve the problem. Then, write the code.
 * </FramedQuote>
 */
export default function FramedQuote({ children, author }) {
  return (
    <blockquote
      style={{
        margin: 0,
        position: "relative",
        padding: "1.25rem 1.5rem",
      }}
    >
      <svg
        width="20"
        height="20"
        aria-hidden="true"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path
          d="M0 20 L0 0 L20 0"
          stroke="var(--border-strong)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
      <svg
        width="20"
        height="20"
        aria-hidden="true"
        style={{ position: "absolute", bottom: 0, right: 0 }}
      >
        <path
          d="M20 0 L20 20 L0 20"
          stroke="var(--border-strong)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>

      <p
        style={{
          fontFamily: "var(--font-voice)",
          fontSize: "17px",
          lineHeight: 1.55,
          color: "var(--text-primary)",
          margin: 0,
          textAlign: "center",
        }}
      >
        {children}
      </p>

      {author && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            margin: "12px 0 0",
            textAlign: "center",
          }}
        >
          {author}
        </p>
      )}
    </blockquote>
  );
}