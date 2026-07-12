import { snap } from '@/lib/midtrans';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Siapkan parameter transaksi untuk Midtrans
    let parameter = {
      "transaction_details": {
        "order_id": body.no_transaksi + "-" + Date.now(), // Tambah timestamp agar unik saat retry
        "gross_amount": body.nominal
      },
      "item_details": [{
        "id": body.pembayaran_id,
        "price": body.nominal,
        "quantity": 1,
        "name": `SPP Bulan ${body.bulan}`,
      }],
      "customer_details": {
        "first_name": body.siswa_nama,
        "email": `${body.siswa_nis}@spp-alhikmah.edu`, // Dummy email if none exists
      }
    };

    // Buat token ke Midtrans Snap API
    const transaction = await snap.createTransaction(parameter);
    
    return NextResponse.json({ token: transaction.token });

  } catch (error) {
    console.error('Error create payment:', error);
    return NextResponse.json({ message: 'Gagal membuat pembayaran' }, { status: 500 });
  }
}
