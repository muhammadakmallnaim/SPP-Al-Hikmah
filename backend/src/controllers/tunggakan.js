document.addEventListener('DOMContentLoaded', async () => {
    const filterKelas = document.getElementById('filterKelas');
    const formFilter = document.getElementById('formFilter');
    const filterKeyword = document.getElementById('filterKeyword');
    const tableBody = document.getElementById('tableBody');
    
    // Elements for Surat Modal
    const suratNama = document.getElementById('suratNama');
    const suratNis = document.getElementById('suratNis');
    const suratKelas = document.getElementById('suratKelas');
    const suratRincian = document.getElementById('suratRincian');
    const suratTotal = document.getElementById('suratTotal');
    let modalSurat;
    
    // Ensure bootstrap modal is ready
    if (window.bootstrap) {
        modalSurat = new bootstrap.Modal(document.getElementById('modalSuratTeguran'));
    }

    let currentTunggakanData = [];

    function showToast(message, type = 'success') {
        Swal.fire({
            toast: true,
            position: 'center',
            icon: type,
            title: message,
            showConfirmButton: false,
            timer: 3000
        });
    }

    async function loadOptions() {
        try {
            const resKelas = await window.api.getKelas();
            if (resKelas.success) {
                resKelas.data.forEach(k => {
                    const option = document.createElement('option');
                    option.value = k.id;
                    option.textContent = k.nama_kelas;
                    filterKelas.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error load options:', error);
        }
    }

    async function loadTunggakan() {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin me-2"></i>Menghitung tunggakan...</td></tr>`;
        try {
            const res = await window.api.getDataTunggakan({
                kelas_id: filterKelas.value,
                keyword: filterKeyword.value
            });

            if (res.success) {
                currentTunggakanData = res.data;
                renderTable(res.data);
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${res.message}</td></tr>`;
            }
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Gagal memuat data</td></tr>`;
        }
    }

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Bagus! Tidak ada siswa yang menunggak SPP.</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td class="fw-semibold">${item.nis}</td>
                    <td>${item.nama_siswa}</td>
                    <td><span class="badge bg-secondary">${item.kelas_aktif}</span></td>
                    <td class="text-danger fw-bold">Rp ${item.total_tunggakan.toLocaleString('id-ID')}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary btn-lihat" data-id="${item.siswa_id}">
                            <i class="fas fa-eye me-1"></i> Rincian & Cetak Surat
                        </button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

        // Pasang event listener untuk tombol
        document.querySelectorAll('.btn-lihat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                bukaModalSurat(id);
            });
        });
    }

    function bukaModalSurat(siswaId) {
        const siswa = currentTunggakanData.find(s => s.siswa_id === siswaId);
        if (!siswa) return;

        suratNama.textContent = siswa.nama_siswa;
        suratNis.textContent = siswa.nis;
        suratKelas.textContent = siswa.kelas_aktif;
        suratTotal.textContent = 'Rp ' + siswa.total_tunggakan.toLocaleString('id-ID');

        let rincianHTML = '';
        siswa.rincian.forEach(r => {
            rincianHTML += `
                <div class="rincian-box">
                    <h6 class="fw-bold mb-2 text-dark">TA ${r.tahun_ajaran} - Semester ${r.semester}</h6>
                    <table class="table table-sm table-bordered mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Bulan Menunggak</th>
                                <th class="text-end">Total Nominal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${r.bulan.join(', ')}</td>
                                <td class="text-end fw-bold text-danger">Rp ${r.total.toLocaleString('id-ID')}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        });
        suratRincian.innerHTML = rincianHTML;

        if (modalSurat) modalSurat.show();
    }

    formFilter.addEventListener('submit', (e) => {
        e.preventDefault();
        loadTunggakan();
    });

    document.getElementById('btnCetakSurat').addEventListener('click', async () => {
        const nis = suratNis.textContent;
        const result = await window.api.exportPdfTunggakan(`Surat_Teguran_${nis}.pdf`);
        if (result.success) {
            showToast('PDF berhasil diekspor!', 'success');
        } else if (result.message !== 'Penyimpanan dibatalkan') {
            showToast('Gagal mengekspor PDF', 'error');
        }
    });

    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    await loadOptions();
    loadTunggakan();
});
