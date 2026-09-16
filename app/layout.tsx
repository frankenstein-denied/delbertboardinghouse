import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration'
import './globals.css'

export const metadata: Metadata = {
  title: 'Delbert — Your boarding house community',
  description: 'A private, friendly community space for Delbert housemates.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Delbert',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ServiceWorkerRegistration />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
