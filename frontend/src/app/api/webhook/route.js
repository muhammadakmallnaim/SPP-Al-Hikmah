import { coreApi } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Verifikasi webhook dari Midtrans menggunakan status()
    const transactionStatus = await coreApi.transaction.notification(body);

    const orderId = transactionStatus.order_id;
    const status = transactionStatus.transaction_status;
    const fraudStatus = transactionStatus.fraud_status;

    // Ambil order_id asli (karena kita menambahkan timestamp sebelumnya misal: TRX-123-1623812)
    const originalNoTransaksi = orderId.split('-').slice(0, 2).join('-');

    let statusUpdate = '';

    if (status === 'capture') {
      if (fraudStatus === 'accept') {
        statusUpdate = 'Lunas';
      }
    } else if (status === 'settlement') {
      statusUpdate = 'Lunas';
    } else if (status === 'cancel' || status === 'deny' || status === 'expire') {
      statusUpdate = 'Gagal';
    } else if (status === 'pending') {
      statusUpdate = 'Pending';
    }

    if (statusUpdate === 'Lunas') {
      // Update tabel Supabase
      const { error } = await supabase
        .from('pembayaran_spp')
        .update({ status_pembayaran: 'Lunas' })
        .eq('no_transaksi', originalNoTransaksi);

      if (error) throw error;
      console.log(`Sukses update status ${originalNoTransaksi} menjadi Lunas`);
    }

    return NextResponse.json({ message: 'Webhook received' }, { status: 200 });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}
