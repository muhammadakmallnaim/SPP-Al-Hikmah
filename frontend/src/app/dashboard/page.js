'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [siswa, setSiswa] = useState(null);
  const [tagihan, setTagihan] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Ambil sesi siswa
    const session = localStorage.getItem('siswa_spp');
    if (!session) {
      router.push('/');
      return;
    }
    const dataSiswa = JSON.parse(session);
    setSiswa(dataSiswa);
    fetchTagihan(dataSiswa);
  }, [router]);

  const fetchTagihan = async (dataSiswa) => {
    try {
      // 1. Ambil Tahun Ajaran Aktif
      const { data: taData } = await supabase
        .from('tahun_ajaran')
        .select('*')
        .eq('status_aktif', true)
        .single();
        
      if (!taData) throw new Error("Tidak ada tahun ajaran aktif.");

      // 2. Ambil Pengaturan SPP untuk kelas siswa ini di tahun ajaran aktif
      const { data: pengaturanData } = await supabase
        .from('pengaturan_spp')
        .select('*')
        .eq('kelas_id', dataSiswa.kelas_id)
        .eq('tahun_ajaran_id', taData.id)
        .single();

      if (!pengaturanData) throw new Error("Pengaturan SPP untuk kelas Anda belum diatur oleh Admin.");

      // 3. Ambil data pembayaran yang SUDAH DIBAYAR (Lunas/Pending)
      const { data: pembayaranData } = await supabase
        .from('pembayaran_spp')
        .select('*')
        .eq('siswa_id', dataSiswa.id)
        .eq('tahun_ajaran_id', taData.id);

      // 4. Buat daftar 12 bulan (Tahun Ajaran Juli-Juni)
      const bulanList = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
      
      const tagihanArray = bulanList.map((bulan) => {
        // Cek apakah bulan ini sudah ada di tabel pembayaran
        const bayar = pembayaranData?.find(p => p.bulan_dibayar === bulan);
        return {
          id: bayar ? bayar.id : `${dataSiswa.id}-${bulan}`,
          bulan_dibayar: bulan,
          nominal_dibayar: bayar ? bayar.nominal_dibayar : pengaturanData.nominal_spp,
          status_pembayaran: bayar ? bayar.status_pembayaran : 'Belum Dibayar',
          no_transaksi: bayar ? bayar.no_transaksi : `TRX-${dataSiswa.id}-${new Date().getTime()}`,
          tahun_ajaran: taData,
          tahun_ajaran_id: taData.id,
          isPaid: bayar && bayar.status_pembayaran === 'Lunas'
        };
      });

      setTagihan(tagihanArray);
    } catch (err) {
      console.error('Gagal mengambil tagihan:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBayar = async (t) => {
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pembayaran_id: t.id,
          nominal: t.nominal_dibayar,
          bulan: t.bulan_dibayar,
          siswa_nama: siswa.nama_siswa,
          siswa_nis: siswa.nis,
          no_transaksi: t.no_transaksi,
          siswa_id: siswa.id,
          tahun_ajaran_id: t.tahun_ajaran_id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal membuat transaksi');

      window.snap.pay(data.token, {
        onSuccess: async function() {
          alert("Pembayaran berhasil!");
          
          if (t.status_pembayaran === 'Belum Dibayar') {
             await supabase.from('pembayaran_spp').insert({
               no_transaksi: t.no_transaksi,
               siswa_id: siswa.id,
               tahun_ajaran_id: t.tahun_ajaran_id,
               bulan_dibayar: t.bulan_dibayar,
               nominal_dibayar: t.nominal_dibayar,
               status_pembayaran: 'Lunas',
               kasir_id: 1 // Default admin / sistem
             });
          } else {
             await supabase.from('pembayaran_spp')
              .update({ status_pembayaran: 'Lunas' })
              .eq('no_transaksi', t.no_transaksi);
          }
          
          fetchTagihan(siswa);
        },
        onPending: function() {
          alert("Menunggu pembayaran...");
          buatPembayaranPending(t);
        },
        onError: function() {
          alert("Pembayaran gagal!");
        },
        onClose: function() {
          console.log('Pop-up ditutup tanpa menyelesaikan pembayaran');
        }
      });
      
    } catch (err) {
      alert(err.message);
    }
  };

  // Memasukkan data ke Supabase sebagai "Pending" agar webhook nanti bisa update jadi "Lunas"
  const buatPembayaranPending = async (t) => {
    // Cek dulu apakah row sudah ada (misal sudah pernah klik bayar)
    if (t.status_pembayaran === 'Belum Dibayar') {
       await supabase.from('pembayaran_spp').insert({
         no_transaksi: t.no_transaksi,
         siswa_id: siswa.id,
         tahun_ajaran_id: t.tahun_ajaran_id,
         bulan_dibayar: t.bulan_dibayar,
         nominal_dibayar: t.nominal_dibayar,
         status_pembayaran: 'Pending',
         kasir_id: 1 // Default admin / sistem
       });
       fetchTagihan(siswa);
    }
  }

  if (loading || !siswa) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data tagihan...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} async></script>

      <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Halo, {siswa.nama_siswa}</h2>
            <p style={{ color: 'var(--text-muted)' }}>NIS: {siswa.nis}</p>
          </div>
          <button 
            className="btn-primary" 
            style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', boxShadow: 'none' }}
            onClick={() => { localStorage.removeItem('siswa_spp'); router.push('/'); }}
          >
            Keluar
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Daftar Tagihan & Pembayaran SPP</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
        {tagihan.map((t) => (
          <div key={t.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '1.1rem' }}>Bulan {t.bulan_dibayar}</h4>
                <span className={`badge ${t.isPaid ? 'badge-success' : t.status_pembayaran === 'Pending' ? 'badge-warning' : ''}`} style={{ background: t.isPaid ? '' : t.status_pembayaran === 'Pending' ? '' : 'rgba(239,68,68,0.2)', color: t.isPaid ? '' : t.status_pembayaran === 'Pending' ? '' : 'var(--danger)' }}>
                  {t.status_pembayaran}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
                {t.tahun_ajaran?.nama_tahun_ajaran} ({t.tahun_ajaran?.semester})
              </p>
              <p style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                Rp {t.nominal_dibayar.toLocaleString('id-ID')}
              </p>
            </div>
            
            {!t.isPaid && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, opacity: t.status_pembayaran === 'Pending' ? 0.5 : 1 }}
                  onClick={() => handleBayar(t)}
                  disabled={t.status_pembayaran === 'Pending'}
                >
                  {t.status_pembayaran === 'Pending' ? 'Menunggu' : 'Bayar Sekarang'}
                </button>

                {t.status_pembayaran === 'Pending' && (
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, background: 'var(--secondary)' }}
                    onClick={async () => {
                      await fetch('/api/check-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ no_transaksi: t.no_transaksi })
                      });
                      alert('Status ditarik ulang dari server!');
                      fetchTagihan(siswa);
                    }}
                  >
                    Refresh Status
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
