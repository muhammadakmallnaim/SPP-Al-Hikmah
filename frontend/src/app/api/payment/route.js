import { snap } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // 1. Dapatkan kelas_id dari riwayat_kelas
    const { data: riwayat } = await supabase
      .from('riwayat_kelas')
      .select('kelas_id')
      .eq('siswa_id', body.siswa_id)
      .eq('tahun_ajaran_id', body.tahun_ajaran_id)
      .single();
      
    if (!riwayat) throw new Error("Data riwayat kelas tidak ditemukan");

    // 2. Dapatkan nominal asli dari pengaturan_spp
    const { data: spp } = await supabase
      .from('pengaturan_spp')
      .select('nominal_spp')
      .eq('kelas_id', riwayat.kelas_id)
      .eq('tahun_ajaran_id', body.tahun_ajaran_id)
      .single();
      
    if (!spp) throw new Error("Pengaturan SPP tidak ditemukan");
    
    const realNominal = spp.nominal_spp;

    // Siapkan parameter transaksi untuk Midtrans
    let parameter = {
      "transaction_details": {
        "order_id": body.no_transaksi + "-" + Date.now(), // Tambah timestamp agar unik saat retry
        "gross_amount": realNominal
      },
      "item_details": [{
        "id": body.pembayaran_id,
        "price": realNominal,
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
