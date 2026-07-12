import './globals.css'

export const metadata = {
  title: 'Portal Siswa | SPP Al-Hikmah',
  description: 'Portal resmi pembayaran SPP Yayasan Al-Hikmah',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <main className="animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  )
}
