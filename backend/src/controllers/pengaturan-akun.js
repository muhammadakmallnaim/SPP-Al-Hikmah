document.addEventListener('DOMContentLoaded', () => {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userJson);
    
    document.getElementById('inputNama').value = user.nama_lengkap;
    document.getElementById('inputRole').value = user.role.toUpperCase();
    document.getElementById('inputUsername').value = user.username;

    // Toggle Password Visibility
    document.getElementById('togglePassword').addEventListener('click', function () {
        const password = document.getElementById('inputPassword');
        const icon = this.querySelector('i');
        if (password.type === 'password') {
            password.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            password.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });

    const formAkun = document.getElementById('formAkun');
    const alertError = document.getElementById('alertError');
    const alertSuccess = document.getElementById('alertSuccess');

    formAkun.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertError.classList.add('d-none');
        alertSuccess.classList.add('d-none');
        
        const username = document.getElementById('inputUsername').value.trim();
        const nama_lengkap = document.getElementById('inputNama').value.trim();
        const password = document.getElementById('inputPassword').value;
        const btn = document.getElementById('btnSimpan');
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Menyimpan...';

        try {
            const payload = {
                id: user.id,
                username: username,
                nama_lengkap: nama_lengkap,
                password: password || null
            };

            const response = await window.api.updateAkun(payload);
            if (response.success) {
                alertSuccess.textContent = response.message;
                alertSuccess.classList.remove('d-none');
                
                // Update session
                user.username = username;
                user.nama_lengkap = nama_lengkap;
                sessionStorage.setItem('user', JSON.stringify(user));
                document.getElementById('inputPassword').value = '';
                
                // Refresh dashboard or other header name immediately
                try {
                    const headerName = document.getElementById('userNameDisplay');
                    if(headerName) headerName.textContent = nama_lengkap;
                } catch(e) {}
                
                // Real-time update the logs table!
                loadLogs();
            } else {
                alertError.textContent = response.message;
                alertError.classList.remove('d-none');
            }
        } catch (error) {
            console.error(error);
            alertError.textContent = 'Terjadi kesalahan sistem.';
            alertError.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan Perubahan';
        }
    });

    // --- Log Aktivitas Logic ---
    async function loadLogs() {
        try {
            const res = await window.api.getLogAktivitas();
            if (res.success) {
                const logs = res.data.slice(0, 100); // Ambil 100 terbaru
                let html = '';
                if (logs.length === 0) {
                    html = '<tr><td colspan="3" class="text-center text-muted">Belum ada log aktivitas</td></tr>';
                } else {
                    logs.forEach(l => {
                        let statusColor = l.status === 'Sukses' ? 'text-success' : 'text-danger';
                        html += `
                            <tr>
                                <td style="font-size: 0.85rem;" class="text-nowrap">${l.waktu}</td>
                                <td style="font-size: 0.85rem;"><strong>${l.modul}</strong><br><span class="${statusColor}">${l.status}</span></td>
                                <td style="font-size: 0.85rem;" class="text-truncate" style="max-width: 150px;" title="${l.detail}">${l.detail}</td>
                            </tr>
                        `;
                    });
                }
                document.getElementById('tableLogBody').innerHTML = html;
            }
        } catch (e) {
            console.error(e);
        }
    }

    document.getElementById('btnOpenLog').addEventListener('click', async () => {
        const res = await window.api.openLogAktivitas();
        if (!res.success) showToast(res.message, 'danger');
    });

    document.getElementById('btnHapusLog').addEventListener('click', async () => {
        if (confirm('Yakin ingin menghapus semua history log aktivitas? Tindakan ini tidak bisa dibatalkan dan file Excel log akan dihapus.')) {
            const res = await window.api.hapusLogAktivitas();
            if (res.success) {
                showToast('Log berhasil dihapus', 'success');
                document.getElementById('tableLogBody').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Belum ada log aktivitas</td></tr>';
            } else {
                showToast(res.message, 'danger');
            }
        }
    });

    loadLogs();

    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
