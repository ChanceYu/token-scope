import './globals.css'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'TokenScope',
  description: 'Track AI agent token usage and cost in one dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('dark', GeistSans.variable, GeistMono.variable)}>
      <body className="font-mono antialiased">{children}</body>
    </html>
  )
}
