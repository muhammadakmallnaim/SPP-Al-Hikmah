document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const userJson = sessionStorage.getItem('user');
    if(!userJson) {
        window.location.href = 'login.html';
        return;
    }

    const userData = JSON.parse(userJson);
    
    // Display user name and role
    document.getElementById('userNameDisplay').textContent = userData.nama_lengkap;
    document.getElementById('userRoleDisplay').textContent = userData.role.toUpperCase();

    // Fetch Dashboard Stats from Backend
    try {
        const res = await window.api.getDashboardStats();
        if (res.success) {
            const data = res.data;
            
            // Stats Cards
            document.getElementById('statSiswa').textContent = data.totalSiswa;
            document.getElementById('statKelas').textContent = data.totalKelas;
            document.getElementById('statTA').textContent = data.tahunAjaran;
            document.getElementById('statPenerimaan').textContent = 'Rp ' + data.penerimaanBulanIni.toLocaleString('id-ID');
            
            // Recent Transactions List
            const listTransaksi = document.getElementById('listTransaksi');
            if (data.transaksi.length > 0) {
                listTransaksi.innerHTML = '';
                data.transaksi.forEach(t => {
                    const tgl = new Date(t.tanggal_pembayaran).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
                    listTransaksi.innerHTML += `
                        <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                            <div>
                                <h6 class="mb-0 fw-bold">${t.nama_siswa}</h6>
                                <small class="text-muted">${t.no_transaksi} &bull; ${tgl}</small>
                            </div>
                            <span class="badge bg-success rounded-pill">Rp ${t.nominal_dibayar.toLocaleString('id-ID')}</span>
                        </li>
                    `;
                });
            } else {
                listTransaksi.innerHTML = '<li class="list-group-item text-center text-muted">Belum ada transaksi terbaru</li>';
            }

            // Chart.js Setup
            if (data.grafik.length > 0) {
                const labels = data.grafik.map(g => {
                    // Extract month string from YYYY-MM
                    const date = new Date(g.bulan + '-01');
                    return date.toLocaleDateString('id-ID', {month:'short', year:'numeric'});
                });
                const chartData = data.grafik.map(g => g.total);

                const ctx = document.getElementById('chartPenerimaan').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Penerimaan (Rp)',
                            data: chartData,
                            backgroundColor: '#3498db',
                            borderRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: { y: { beginAtZero: true } },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        }
    } catch (err) {
        console.error(err);
    }

    // Handle Logout
    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        if(confirm('Apakah Anda yakin ingin logout?')) {
            window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    });
});
