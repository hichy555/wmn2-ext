import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MailCMH – Email Extraction Tool',
  description: 'Extract and analyze emails from Gmail with detailed header analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
