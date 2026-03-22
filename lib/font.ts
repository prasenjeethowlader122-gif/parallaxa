// lib/fonts.ts
import localFont from 'next/font/local'

export const spacegrotesk = localFont({
  src: '../public/local/font/AtkinsonHyperlegibleNext-VariableFont_wght.ttf',
  variable: '--font-space-grotesk',
})

export const slabo = localFont({
  src: [
    {
      path: '../public/local/font/PlaypenSans[wght].ttf',
      weight: '400',
      style: 'normal',
    },
    
    
  ],
  variable: '--font-slabo',
})