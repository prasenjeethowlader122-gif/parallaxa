// lib/fonts.ts
import localFont from 'next/font/local'

export const spacegrotesk = localFont({
  src : [
    
    {
      path : '../public/local/font/IosevkaCharonMono-Regular.ttf',
      weight :'400',
      style : 'normal'
    }
  ]
})
export const Fugaz = localFont({
  src : [{
    path: '../public/local/font/FugazOne-Regular.ttf',
    weight: '400',
    style : 'normal'
  }]
})

export const slabo = localFont({
  src: [
    {
      path: '../public/local/font/IosevkaCharonMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    
    
  ],
  variable: '--font-slabo',
})