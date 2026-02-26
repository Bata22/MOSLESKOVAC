import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Međuokružni odbojkaški savez Leskovac',
  description: 'Tabele, rezultati i raspored utakmica ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  )
}
