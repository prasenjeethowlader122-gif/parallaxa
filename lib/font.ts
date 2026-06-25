import localFont from 'next/font/local'

// Bangla Font: Ekushy Font
export const banglaFont = localFont({
  src: [
    {
      path: '../public/local/font/TiroBangla-Regular.ttf',
      style: 'normal',
      weight: '400'
    }
  ],
  variable: '--font-bangla'
})

// Body Font: Miranda Sans (exported as sansFont)
export const sansFont = localFont({
  src: [
    {
      path: '../public/local/font/MirandaSans-Regular.ttf',
      style: 'normal',
      weight: '400'
    },
    {
      path: '../public/local/font/MirandaSans-Medium.ttf',
      style: 'normal',
      weight: '600'
    },
    {
      path: '../public/local/font/MirandaSans-Bold.ttf',
      style: 'normal',
      weight: '700'
    }
  ],
  variable: '--font-sans'
})

// Headline Font: Playfair Display (exported as serifFont)
export const serifFont = localFont({
  src: [
    {
      path: '../public/local/font/PlayfairDisplay-VariableFont_wght.ttf',
      style: 'normal'
    }
  ],
  variable: '--font-serif'
})

// Mono Font: Iosevka Charon Mono (exported as monoFont)
export const monoFont = localFont({
  src: [
    {
      path: '../public/local/font/IosevkaCharonMono-Regular.ttf',
      weight: '400',
      style: 'normal'
    },
    {
      path: '../public/local/font/IosevkaCharonMono-Medium.ttf',
      weight: '500',
      style: 'normal'
    }
  ],
  variable: '--font-mono'
})

// Compatibility exports for existing code
export const spacegrotesk = sansFont
export const Fugaz = serifFont
export const slabo = monoFont
