import './globals.css'
import { Inter } from 'next/font/google'
import SiteNav from './components/SiteNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  metadataBase: new URL('https://40k.glizzy.dev'),
  title: '40k Helper',
  description: 'Datasheets, army lists and game-day tools for Warhammer 40,000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
