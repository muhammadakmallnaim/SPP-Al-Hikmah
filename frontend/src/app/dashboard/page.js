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

  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [selectedTaId, setSelectedTaId] = useState(null);

  // Status Pembayaran & Notifikasi UI
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  useEffect(() => {
    const checkSession = async () => {
      const session = localStorage.getItem('siswa_session');
      if (!session) {
        router.push('/');
        return;
      }
      const dataSiswa = JSON.parse(session);

      const { data: dbSiswa, error } = await supabase
        .from('siswa')
        .select('password, is_password_changed')
        .eq('id', dataSiswa.id)
        .single();

      if (error || !dbSiswa || dbSiswa.password !== dataSiswa.password) {
        localStorage.removeItem('siswa_session');
        router.push('/');
        return;
      }

      dataSiswa.is_password_changed = dbSiswa.is_password_changed;
      setSiswa(dataSiswa);
      
      // Ambil riwayat kelas siswa untuk dropdown
      const { data: riwayat } = await supabase
        .from('riwayat_kelas')
        .select(`
          tahun_ajaran_id,
          kelas_id,
          tahun_ajaran ( id, nama_tahun_ajaran, status_aktif )
        `)
        .eq('siswa_id', dataSiswa.id)
        .order('tahun_ajaran_id', { ascending: false });
        
      if (riwayat && riwayat.length > 0) {
        setTahunAjaranList(riwayat);
        // Default ke tahun ajaran aktif, jika tidak ada (sudah lulus) ke tahun terakhir
        const activeTa = riwayat.find(r => r.tahun_ajaran.status_aktif) || riwayat[0];
        setSelectedTaId(activeTa.tahun_ajaran_id);
      } else {
        setLoading(false);
      }

      if (!dbSiswa.is_password_changed) {
        setShowPasswordModal(true);
      }
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    if (siswa && selectedTaId && tahunAjaranList.length > 0) {
      fetchTagihan(siswa, selectedTaId, tahunAjaranList);
    }
  }, [selectedTaId, siswa, tahunAjaranList]);

  const fetchTagihan = async (dataSiswa, taId, currentTaList) => {
    setLoading(true);
    try {
      // Dapatkan data riwayat kelas untuk tahun ajaran yang dipilih
      const riwayat = currentTaList.find(r => r.tahun_ajaran_id === taId);
      if (!riwayat) {
        setLoading(false);
        return;
      }

      // 2. Ambil nominal SPP berdasarkan kelas siswa di tahun tersebut
      const { data: sppData } = await supabase
        .from('pengaturan_spp')
        .select('nominal_spp')
        .eq('tahun_ajaran_id', taId)
        .eq('kelas_id', riwayat.kelas_id)
        .single();
      
      const nominal = sppData ? sppData.nominal_spp : 150000;

      // 3. Ambil riwayat pembayaran
      const { data: pembayaran } = await supabase
        .from('pembayaran_spp')
        .select('*, users(nama_lengkap)')
        .eq('siswa_id', dataSiswa.id)
        .eq('tahun_ajaran_id', taId);

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
          tahun_ajaran_id: taId,
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

  // Auto-polling untuk transaksi Pending
  useEffect(() => {
    const pendingTransactions = tagihan.filter(t => t.status_pembayaran === 'Pending' && t.no_transaksi);
    let intervalId;

    if (pendingTransactions.length > 0 && siswa && selectedTaId && tahunAjaranList.length > 0) {
      intervalId = setInterval(async () => {
        for (const t of pendingTransactions) {
          try {
            await fetch('/api/check-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ no_transaksi: t.no_transaksi })
            });
          } catch (e) {}
        }
        // Selalu fetch ulang untuk memperbarui UI jika DB berubah
        fetchTagihan(siswa, selectedTaId, tahunAjaranList);
      }, 7000); // Polling setiap 7 detik
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [tagihan, siswa, selectedTaId, tahunAjaranList]);

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
    setProcessingId(t.id);
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
            showToast('Pembayaran Berhasil! Tagihan Lunas.', 'success');
            fetchTagihan(siswa, selectedTaId, tahunAjaranList);
          },
          onPending: async function(result){
            if (t.status_pembayaran === 'Belum Dibayar') {
              await buatPembayaranPending({...t, no_transaksi: result.order_id});
            }
            showToast('Menunggu pembayaran Anda. Silakan selesaikan transaksi.', 'info');
            fetchTagihan(siswa, selectedTaId, tahunAjaranList);
          },
          onError: function(result){
            showToast('Pembayaran gagal atau dibatalkan oleh sistem.', 'error');
            fetchTagihan(siswa, selectedTaId, tahunAjaranList);
          },
          onClose: function(){
            showToast('Pembayaran belum diselesaikan (Ditutup).', 'info');
            fetchTagihan(siswa, selectedTaId, tahunAjaranList);
          }
        })
      }
    } catch (e) {
      showToast('Terjadi kesalahan saat memanggil sistem pembayaran.', 'error');
    } finally {
      setProcessingId(null);
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
    const caraBayar = isOnline ? 'Online' : 'Langsung';

    const kwitansiHTML = `
      <html><head><title>Kwitansi ${t.bulan_dibayar}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
        .kwitansi-container { border: 3px solid #1e3a2f; padding: 3px; }
        .kwitansi-inner { border: 1px solid #1e3a2f; padding: 30px; }
        .header { display: flex; align-items: center; border-bottom: 2px solid #1e3a2f; padding-bottom: 15px; margin-bottom: 20px;}
        .header img { width: 70px; height: 70px; margin-right: 20px; object-fit: contain; }
        .header-text { text-align: center; flex: 1; }
        .header-text h2 { margin: 0; font-size: 22px; letter-spacing: 1px; color: #000; }
        .header-text h4 { margin: 5px 0 0 0; font-size: 16px; font-weight: normal; color: #000; }
        .row { margin: 8px 0; font-size: 14px; display: flex;}
        .row .col-label { width: 140px; }
        .row .col-colon { width: 20px; }
        .row .col-value { flex: 1; }
        .total-box { background: #f0f0f0; padding: 10px 15px; display: inline-block; font-weight: bold; font-size: 16px; margin-top: 15px; min-width: 200px;}
        .footer { display: flex; justify-content: space-between; margin-top: -30px; align-items: flex-end;}
        .footer-left { flex: 1; }
        .footer-right { text-align: center; width: 250px; font-size: 14px; }
        .footer-note { text-align: center; font-style: italic; font-size: 12px; margin-top: 40px; }
      </style>
      </head><body>
        <div class="kwitansi-container">
          <div class="kwitansi-inner">
            <div class="header">
              <img src="/logo.jpeg" alt="Logo" />
              <div class="header-text">
                <h2>KUITANSI PEMBAYARAN SPP</h2>
                <h4>YAYASAN PENDIDIKAN AL-HIKMAH</h4>
              </div>
            </div>

            <div class="row" style="margin-bottom: 20px; font-weight: bold;">
              <div class="col-label">No Transaksi</div>
              <div class="col-colon">:</div>
              <div class="col-value">${t.no_transaksi || '-'}</div>
            </div>
            
            <div class="row">
              <div class="col-label">Telah Terima Dari</div>
              <div class="col-colon">:</div>
              <div class="col-value">${siswa?.nama_siswa} (${siswa?.nis})</div>
            </div>
            
            <div class="row">
              <div class="col-label">Kelas</div>
              <div class="col-colon">:</div>
              <div class="col-value">${siswa?.kelas_id || '-'}</div>
            </div>
            
            <div class="row">
              <div class="col-label">Untuk Pembayaran</div>
              <div class="col-colon">:</div>
              <div class="col-value">SPP Bulan ${t.bulan_dibayar}</div>
            </div>
            
            <div class="row">
              <div class="col-label">Cara Bayar</div>
              <div class="col-colon">:</div>
              <div class="col-value">${caraBayar}</div>
            </div>

            <div class="footer">
              <div class="footer-left">
                 <div class="total-box">TOTAL : Rp ${t.nominal_dibayar.toLocaleString('id-ID')}</div>
              </div>
              <div class="footer-right">
                <p>Tanjung Pura, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                <p style="margin-bottom: 50px;">Petugas / Kasir</p>
                <p style="font-weight: bold;">( ${petugas} )</p>
              </div>
            </div>
            
            <div class="footer-note">Terima kasih. Simpan kuitansi ini sebagai bukti pembayaran yang sah.</div>
          </div>
        </div>
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
        <div className="glass-panel dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '1.5rem 2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)', flexShrink: 0 }}>
              <img src="/logo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '5px' }}>Hai, {siswa.nama_siswa}!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>NIS: {siswa.nis} | Kelas: {siswa.kelas_id || '-'}</p>
            </div>
          </div>
          <div className="dashboard-header-actions" style={{display: 'flex', gap: '10px'}}>
             <button onClick={() => setShowPasswordModal(true)} className="btn-secondary" style={{ padding: '10px 20px', width: 'auto' }}>Ganti Password</button>
             <button onClick={logout} className="btn-primary" style={{ background: '#e74c3c', padding: '10px 20px', width: 'auto' }}>Logout</button>
          </div>
        </div>

        {/* List Tagihan */}
        <div className="tagihan-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--text-main)', margin: 0 }}>Tagihan SPP</h3>
          {tahunAjaranList.length > 0 && (
            <select 
              className="input-field" 
              style={{ width: 'auto', padding: '8px 15px', cursor: 'pointer' }}
              value={selectedTaId || ''}
              onChange={(e) => setSelectedTaId(Number(e.target.value))}
            >
              {tahunAjaranList.map(ta => (
                <option key={ta.tahun_ajaran_id} value={ta.tahun_ajaran_id}>
                  Tahun Ajaran {ta.tahun_ajaran?.nama_tahun_ajaran} {ta.tahun_ajaran?.status_aktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        
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
                        style={{ flex: 1, opacity: (t.status_pembayaran === 'Pending' || processingId === t.id) ? 0.5 : 1 }}
                        onClick={() => handleBayar(t)}
                        disabled={t.status_pembayaran === 'Pending' || processingId === t.id}
                      >
                        {processingId === t.id ? 'Memproses...' : t.status_pembayaran === 'Pending' ? 'Menunggu' : 'Bayar Sekarang'}
                      </button>

                      {t.status_pembayaran === 'Pending' && (
                        <button 
                          className="btn-primary" 
                          style={{ flex: 1, background: 'var(--text-muted)' }}
                          onClick={async () => {
                            setProcessingId('check-'+t.id);
                            await fetch('/api/check-status', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ no_transaksi: t.no_transaksi })
                            });
                            showToast('Status ditarik ulang dari server!');
                            setProcessingId(null);
                            fetchTagihan(siswa, selectedTaId, tahunAjaranList);
                          }}
                          disabled={processingId === 'check-'+t.id}
                        >
                          {processingId === 'check-'+t.id ? 'Mengecek...' : 'Cek Status'}
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
                <button type="button" className="btn-secondary" style={{ background: '#e2e8f0', color: '#333' }} onClick={() => setShowPasswordModal(false)}>
                  {siswa?.is_password_changed ? 'Batal' : 'Nanti Saja'}
                </button>
                <button type="submit" className="btn-primary">Simpan Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '400px',
        }}>
          <div style={{
            background: 'var(--surface)',
            color: 'var(--text-main)',
            padding: '24px 28px',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            borderTop: `6px solid ${toast.type === 'success' ? '#2ecc71' : toast.type === 'error' ? '#e74c3c' : '#3498db'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            textAlign: 'center',
            width: '100%'
          }} className="animate-fade-in">
            
            {/* Icon Circle */}
            <div style={{
              background: toast.type === 'success' ? 'rgba(46, 204, 113, 0.15)' : toast.type === 'error' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(52, 152, 219, 0.15)',
              color: toast.type === 'success' ? '#2ecc71' : toast.type === 'error' ? '#e74c3c' : '#3498db',
              width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {toast.type === 'success' && (
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              )}
              {toast.type === 'error' && (
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
              {toast.type === 'info' && (
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              )}
            </div>

            {/* Message Content */}
            <div>
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px', marginBottom: '5px' }}>
                {toast.type === 'success' ? 'Sukses!' : toast.type === 'error' ? 'Gagal' : 'Informasi'}
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 400, lineHeight: 1.5 }}>
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
