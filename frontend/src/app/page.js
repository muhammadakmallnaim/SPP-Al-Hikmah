'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [nis, setNis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Cari siswa berdasarkan NIS di tabel siswa Supabase
      const { data, error } = await supabase
        .from('siswa')
        .select('*')
        .eq('nis', nis)
        .single();

      if (error || !data) {
        throw new Error('NIS tidak ditemukan. Pastikan NIS yang Anda masukkan benar.');
      }

      // Jika sukses, simpan data siswa di localStorage sederhana (untuk demo/MVP)
      localStorage.setItem('siswa_spp', JSON.stringify(data));
      router.push('/dashboard');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '10px', color: 'var(--text-main)' }}>SPP Al-Hikmah</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Masuk ke portal siswa untuk cek tagihan</p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'left' }}>
            <label className="label" htmlFor="nis">Nomor Induk Siswa (NIS)</label>
            <input 
              type="text" 
              id="nis"
              className="input-field" 
              placeholder="Masukkan NIS Anda..." 
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !nis}>
            {loading ? 'Memeriksa...' : 'Masuk Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
