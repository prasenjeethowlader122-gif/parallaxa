// lib/fonts.ts
import localFont from 'next/font/local'

export const spacegrotesk = localFont({
  src: [{
    path: '../public/local/font/MirandaSans-Regular.ttf',
    style: 'normal',
    weight: '400'
  }, {
    path: '../public/local/font/MirandaSans-Medium.ttf',
    style: 'normal',
    weight: '600'
  },
  {
    
    path: '../public/local/font/MirandaSans-Bold.ttf',
    style: 'normal',
    weight: '900'
    
  }]
})
export const Fugaz = localFont({
  src: [{
    path: '../public/local/font/PlayfairDisplay-VariableFont_wght.ttf',
    style: 'norma'
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