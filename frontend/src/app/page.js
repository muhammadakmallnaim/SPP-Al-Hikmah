'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Cari siswa berdasarkan username dan password
      const { data, error: dbError } = await supabase
        .from('siswa')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (dbError || !data) {
        throw new Error('Username atau Password salah!');
      }

      if (data.status !== 'aktif') {
        throw new Error('Akun siswa sudah tidak aktif.');
      }

      // Simpan session ke localStorage (karena MVP kita pakai localStorage saja)
      localStorage.setItem('siswa_session', JSON.stringify(data));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        
        {/* Placeholder Logo / Bisa diganti img */}
        <div style={{
          width: '70px', height: '70px', borderRadius: '50%', margin: '0 auto 20px', 
          overflow: 'hidden', border: '2px solid var(--primary)'
        }}>
          <img src="/logo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <h1 style={{ marginBottom: '5px', fontSize: '1.8rem', color: 'var(--primary)' }}>SPP Al-Hikmah</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Masuk ke portal siswa</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Username (NISN/NIS)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '40px' }}
            />
            <span 
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                cursor: 'pointer', color: 'var(--text-muted)'
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>
          
          {error && (
            <div style={{ color: '#e74c3c', fontSize: '0.9rem', background: '#fdf0ed', padding: '10px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Memeriksa...' : 'Masuk Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
