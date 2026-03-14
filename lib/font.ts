// lib/fonts.ts
import localFont from 'next/font/local'

export const spacegrotesk = localFont({
  src: '../public/local/font/SpaceGrotesk-VariableFont_wght.ttf',
  variable: '--font-space-grotesk',
})

export const slabo = localFont({
  src: [
    {
      path: '../public/local/font/Slabo27px-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-slabo',
})