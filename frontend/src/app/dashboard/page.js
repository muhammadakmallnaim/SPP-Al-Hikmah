'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [siswa, setSiswa] = useState(null);
  const [tagihan, setTagihan] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Ganti Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const session = localStorage.getItem('siswa_session');
      if (!session) {
        router.push('/');
        return;
      }
      const dataSiswa = JSON.parse(session);

      // Validasi session dengan server (cek apakah password masih sama)
      const { data: dbSiswa, error } = await supabase
        .from('siswa')
        .select('password, is_password_changed')
        .eq('id', dataSiswa.id)
        .single();

      // Jika password tidak cocok (mungkin direset admin / diganti di tempat lain)
      if (error || !dbSiswa || dbSiswa.password !== dataSiswa.password) {
        localStorage.removeItem('siswa_session');
        router.push('/');
        return;
      }

      dataSiswa.is_password_changed = dbSiswa.is_password_changed;
      setSiswa(dataSiswa);
      fetchTagihan(dataSiswa);

      // Buka pop-up ganti password otomatis jika belum pernah ganti
      if (!dbSiswa.is_password_changed) {
        setShowPasswordModal(true);
      }
    };

    checkSession();
  }, [router]);

  const fetchTagihan = async (dataSiswa) => {
    try {
      // 1. Ambil tahun ajaran aktif
      const { data: taData } = await supabase
        .from('tahun_ajaran')
        .select('*')
        .eq('status_aktif', true)
        .single();

      if (!taData) {
        setLoading(false);
        return;
      }

      // 2. Ambil nominal SPP
      const { data: sppData } = await supabase
        .from('pengaturan_spp')
        .select('nominal')
        .eq('tahun_ajaran_id', taData.id)
        .eq('tingkat_kelas', dataSiswa.kelas_id)
        .single();
      
      const nominal = sppData ? sppData.nominal : 150000;

      // 3. Ambil riwayat pembayaran
      const { data: pembayaran } = await supabase
        .from('pembayaran_spp')
        .select('*, users(nama_lengkap)')
        .eq('siswa_id', dataSiswa.id)
        .eq('tahun_ajaran_id', taData.id);

      const bulanList = [
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
      ];

      const tagihanTerbentuk = bulanList.map((bulan, index) => {
        const bayar = pembayaran?.find(p => p.bulan_dibayar === bulan);
        return {
          id: index,
          bulan_dibayar: bulan,
          nominal_dibayar: nominal,
          tahun_ajaran_id: taData.id,
          status_pembayaran: bayar ? bayar.status_pembayaran : 'Belum Dibayar',
          no_transaksi: bayar ? bayar.no_transaksi : null,
          kasir_nama: bayar?.users?.nama_lengkap || 'Administrator',
          isPaid: bayar?.status_pembayaran === 'Lunas'
        };
      });

      setTagihan(tagihanTerbentuk);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const buatPembayaranPending = async (t) => {
    const no_trans = 'TRX-' + new Date().getTime();
    const { error } = await supabase.from('pembayaran_spp').insert({
      no_transaksi: no_trans,
      siswa_id: siswa.id,
      tahun_ajaran_id: t.tahun_ajaran_id,
      bulan_dibayar: t.bulan_dibayar,
      nominal_dibayar: t.nominal_dibayar,
      status_pembayaran: 'Pending',
      kasir_id: 1
    });
    if(!error) return no_trans;
    return null;
  };

  const handleBayar = async (t) => {
    try {
      const resp = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          no_transaksi: t.no_transaksi || ('TRX-' + new Date().getTime()),
          nominal: t.nominal_dibayar,
          pembayaran_id: String(t.id),
          bulan: t.bulan_dibayar,
          siswa_nama: siswa.nama_siswa,
          siswa_nis: siswa.nis
        })
      });
      const data = await resp.json();
      
      if (data.token) {
        window.snap.pay(data.token, {
          onSuccess: async function(result){
            if (t.status_pembayaran === 'Belum Dibayar') {
              await supabase.from('pembayaran_spp').insert({
                no_transaksi: result.order_id,
                siswa_id: siswa.id,
                tahun_ajaran_id: t.tahun_ajaran_id,
                bulan_dibayar: t.bulan_dibayar,
                nominal_dibayar: t.nominal_dibayar,
                status_pembayaran: 'Lunas',
                kasir_id: 1 
              });
            } else {
              await supabase.from('pembayaran_spp').update({status_pembayaran: 'Lunas'}).eq('no_transaksi', t.no_transaksi);
            }
            fetchTagihan(siswa);
          },
          onPending: async function(result){
            if (t.status_pembayaran === 'Belum Dibayar') {
              await buatPembayaranPending({...t, no_transaksi: result.order_id});
            }
            fetchTagihan(siswa);
          },
          onError: function(result){
            alert("pembayaran gagal!");
          },
          onClose: function(){
            fetchTagihan(siswa);
          }
        })
      }
    } catch (e) {
      alert('Terjadi kesalahan saat memanggil Midtrans');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if(newPassword.length < 6) return setPwdMsg('Password minimal 6 karakter');
    
    const { error } = await supabase
      .from('siswa')
      .update({ password: newPassword, is_password_changed: true })
      .eq('id', siswa.id);
      
    if(error) {
      setPwdMsg('Gagal merubah password');
    } else {
      setPwdMsg('Password berhasil diubah!');
      // Update session
      const updatedSiswa = {...siswa, is_password_changed: true, password: newPassword};
      localStorage.setItem('siswa_session', JSON.stringify(updatedSiswa));
      setSiswa(updatedSiswa);
      setTimeout(() => setShowPasswordModal(false), 1500);
    }
  };

  const cetakKwitansi = (t) => {
    const isOnline = t.no_transaksi?.startsWith('TRX');
    const petugas = isOnline ? 'Sistem' : t.kasir_nama;
    const caraBayar = isOnline ? 'Online (Midtrans)' : 'Langsung';

    const kwitansiHTML = `
      <html><head><title>Kwitansi ${t.bulan_dibayar}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; border-bottom: 2px solid #2d6a4f; padding-bottom: 10px; margin-bottom: 20px; color: #2d6a4f;}
        .row { margin: 10px 0; }
        .row strong { display: inline-block; width: 150px; }
      </style>
      </head><body>
        <div class="header">
          <h2>YAYASAN PENDIDIKAN AL-HIKMAH</h2>
          <h4>Kwitansi Pembayaran SPP</h4>
        </div>
        <div class="row"><strong>No. Transaksi:</strong> ${t.no_transaksi || '-'}</div>
        <div class="row"><strong>Terima Dari:</strong> ${siswa?.nama_siswa} (${siswa?.nis})</div>
        <div class="row"><strong>Pembayaran:</strong> SPP Bulan ${t.bulan_dibayar}</div>
        <div class="row"><strong>Cara Bayar:</strong> ${caraBayar}</div>
        <div class="row"><strong>Jumlah:</strong> Rp ${t.nominal_dibayar.toLocaleString('id-ID')}</div>
        <div class="row"><strong>Status:</strong> LUNAS</div>
        <br><br>
        <p style="text-align: right">Petugas / Kasir<br><br><br>( ${petugas} )</p>
        <script>window.print();</script>
      </body></html>
    `;
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(kwitansiHTML);
    win.document.close();
  };

  const logout = () => {
    localStorage.removeItem('siswa_session');
    router.push('/');
  };

  if (!siswa) return null;

  return (
    <>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }} className="animate-fade-in">
        
        {/* Header */}
        <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '1.5rem 2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)' }}>
              <img src="/logo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '5px' }}>Hai, {siswa.nama_siswa}!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>NIS: {siswa.nis} | Kelas: {siswa.kelas_id || '-'}</p>
            </div>
          </div>
          <div style={{display: 'flex', gap: '10px'}}>
             <button onClick={() => setShowPasswordModal(true)} className="btn-secondary" style={{ padding: '10px 20px', width: 'auto' }}>Ganti Password</button>
             <button onClick={logout} className="btn-primary" style={{ background: '#e74c3c', padding: '10px 20px', width: 'auto' }}>Logout</button>
          </div>
        </div>

        {/* List Tagihan */}
        <h3 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>Tagihan SPP Tahun Ini</h3>
        
        {loading ? (
          <p>Memuat tagihan...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {tagihan.map(t => (
              <div key={t.id} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{t.bulan_dibayar}</h4>
                  <span className={`status-badge ${t.status_pembayaran === 'Lunas' ? 'status-lunas' : t.status_pembayaran === 'Pending' ? 'status-pending' : 'status-belum'}`}>
                    {t.status_pembayaran}
                  </span>
                </div>
                
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '20px' }}>
                  Rp {t.nominal_dibayar.toLocaleString('id-ID')}
                </p>

                <div style={{ marginTop: 'auto' }}>
                  {t.status_pembayaran === 'Lunas' ? (
                    <button 
                      className="btn-secondary"
                      onClick={() => cetakKwitansi(t)}
                    >
                      Cetak Kwitansi
                    </button>
                  ) : (
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
                          style={{ flex: 1, background: 'var(--text-muted)' }}
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
                          Cek Status
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ganti Password */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ marginBottom: '15px', color: 'var(--primary)' }}>Ganti Password</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {!siswa?.is_password_changed 
                ? 'Ini adalah pertama kali Anda login. Silakan ganti password default Anda demi keamanan.'
                : 'Silakan masukkan password baru Anda.'}
            </p>
            
            <form onSubmit={handleChangePassword}>
              <input
                type="password"
                className="input-field"
                placeholder="Password Baru (min. 6 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ marginBottom: '15px' }}
              />
              {pwdMsg && <p style={{ fontSize: '0.85rem', color: pwdMsg.includes('berhasil') ? 'green' : 'red', marginBottom: '15px' }}>{pwdMsg}</p>}
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {siswa?.is_password_changed && (
                  <button type="button" className="btn-secondary" style={{ background: '#e2e8f0', color: '#333' }} onClick={() => setShowPasswordModal(false)}>
                    Batal
                  </button>
                )}
                <button type="submit" className="btn-primary">Simpan Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
