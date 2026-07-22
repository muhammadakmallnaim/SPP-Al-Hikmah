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
        <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}></script>
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
