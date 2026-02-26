import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Međuokružni odbojkaški savez Leskovac',
  description: 'Tabele, rezultati i raspored utakmica',
  icons: {
    icon: [
      { url: '/mos1.svg', type: 'image/svg+xml' },
    ],
    apple: '/mos1.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <head>
        <link rel="icon" href="/mos1.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/mos1-touch-icon.svg" />
        <meta name="theme-color" content="#002d63" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MOSL" />
      </head>
      <body>{children}</body>
    </html>
  )
}
