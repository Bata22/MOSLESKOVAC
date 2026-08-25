import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://mosleskovac.vercel.app'),
  title: 'Međuokružni odbojkaški savez Leskovac',
  description: 'Tabele, rezultati i raspored utakmica — MOSL liga sezona 2025/2026',
  keywords: ['odbojka', 'Leskovac', 'liga', 'tabela', 'MOSL', 'odbojkaški savez'],
  other:{'google-adsense-account': 'ca-pub-6353258661915240' },
  icons: {
    icon: [{ url: '/mos1.svg', type: 'image/svg+xml' }],
    apple: '/mos1.svg',
  },
  openGraph: {
    title: 'MOSL — Međuokružni odbojkaški savez Leskovac',
    description: 'Tabele, rezultati i raspored utakmica',
    siteName: 'MOSL Liga',
    locale: 'sr_RS',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <meta name="theme-color" content="#002d63" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MOSL" />
        <meta name="google-adsense-account" content="ca-pub-6353258661915240"></meta>
      </head>
      <body>{children}</body>
    </html>
  )
}
