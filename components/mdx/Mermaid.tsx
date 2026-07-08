'use client'

import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
})

export default function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && code) {
      ref.current.removeAttribute('data-processed')
      mermaid.contentLoaded()
    }
  }, [code])

  return (
    <div className="mermaid flex justify-center my-6" ref={ref}>
      {code}
    </div>
  )
}
