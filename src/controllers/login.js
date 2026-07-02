document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('loginError');
    const btnLogin = document.getElementById('btnLogin');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showError('Username dan password wajib diisi.');
            return;
        }

        // Disable tombol saat memproses
        btnLogin.disabled = true;
        btnLogin.textContent = 'Memproses...';
        errorDiv.style.display = 'none';

        try {
            // Panggil IPC handler untuk login melalui context bridge
            const response = await window.api.login({ username, password });
            
            if (response.success) {
                // Simpan data user di sessionStorage untuk digunakan di UI
                sessionStorage.setItem('user', JSON.stringify(response.data));
                
                // Pindah ke halaman dashboard
                window.location.href = 'dashboard.html';
            } else {
                showError(response.message || 'Login gagal.');
            }
        } catch (err) {
            console.error('Error saat login:', err);
            showError('Terjadi kesalahan saat menghubungi server.');
        } finally {
            // Kembalikan tombol ke keadaan semula jika gagal
            btnLogin.disabled = false;
            btnLogin.textContent = 'Masuk';
        }
    });

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
    }
});
