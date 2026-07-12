import { coreApi } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { no_transaksi } = await request.json();
    
    // Cari transaksi di Midtrans
    // Karena kita pakai timestamp, kita ambil yg depannya mirip
    // Tapi wait, transaksi di db sudah menyimpan no_transaksi ori
    // Mari kita biarkan frontend ngirim order_id yang valid
    
    // Namun karena MVP, kita update langsung di Supabase
    // Ini hanya untuk keperluan bypass testing karena localhost tidak bisa terima webhook
    const { error } = await supabase
      .from('pembayaran_spp')
      .update({ status_pembayaran: 'Lunas' })
      .eq('no_transaksi', no_transaksi);

    if (error) throw error;
    
    return NextResponse.json({ message: 'Paksa lunas berhasil (Bypass Localhost)' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
