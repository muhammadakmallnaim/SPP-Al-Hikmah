document.addEventListener('DOMContentLoaded', async () => {
    if (!sessionStorage.getItem('user')) {
        window.location.href = 'login.html';
        return;
    }

    const tableBody = document.getElementById('tableBodySiswa');
    const inputSearch = document.getElementById('inputSearch');
    
    const modalSiswa = new bootstrap.Modal(document.getElementById('modalSiswa'));
    const modalDetail = new bootstrap.Modal(document.getElementById('modalDetail'));
    const modalImport = new bootstrap.Modal(document.getElementById('modalImport'));
    
    let allSiswa = [];
    let allKelas = [];

    async function fetchKelas() {
        const res = await window.api.getKelas();
        if (res.success) {
            allKelas = res.data;
            const selectKelas = document.getElementById('inputKelas');
            selectKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>';
            allKelas.forEach(k => {
                selectKelas.innerHTML += `<option value="${k.id}">${k.nama_kelas}</option>`;
            });
        }
    }

    async function loadData() {
        try {
            const response = await window.api.getSiswa();
            if (response.success) {
                allSiswa = response.data;
                renderTable(allSiswa);
            } else {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${response.message}</td></tr>`;
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Gagal memuat data</td></tr>`;
        }
    }

    inputSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allSiswa.filter(s => 
            (s.nama_siswa && s.nama_siswa.toLowerCase().includes(term)) ||
            (s.nis && s.nis.toLowerCase().includes(term)) ||
            (s.nama_kelas && s.nama_kelas.toLowerCase().includes(term))
        );
        renderTable(filtered);
    });

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Belum ada data siswa</td></tr>`;
            return;
        }

        let html = '';
        data.forEach((item) => {
            let statusBadge = item.status === 'aktif' ? '<span class="badge bg-success">Aktif</span>' : `<span class="badge bg-secondary">${item.status}</span>`;
            html += `
                <tr>
                    <td class="px-4 py-3">${item.nis}</td>
                    <td class="py-3 fw-bold">${item.nama_siswa}</td>
                    <td class="py-3">${item.nama_kelas || '-'}</td>
                    <td class="py-3">${item.tahun_masuk}</td>
                    <td class="py-3">${statusBadge}</td>
                    <td class="px-4 py-3 text-end text-nowrap">
                        <button class="btn btn-sm btn-outline-info btn-detail" data-id="${item.id}"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        attachEvents();
    }

    function attachEvents() {
        document.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const s = allSiswa.find(x => x.id === id);
                if (s) {
                    document.getElementById('detailTableBody').innerHTML = `
                        <tr><th>NIS / NISN</th><td>${s.nis} / ${s.nisn || '-'}</td></tr>
                        <tr><th>Nama Lengkap</th><td>${s.nama_siswa}</td></tr>
                        <tr><th>Kelas</th><td>${s.nama_kelas || '-'}</td></tr>
                        <tr><th>JK / Tempat Tgl Lahir</th><td>${s.jenis_kelamin === 'L'?'Laki-laki':'Perempuan'} / ${s.tempat_lahir || '-'}, ${s.tanggal_lahir || '-'}</td></tr>
                        <tr><th>Alamat</th><td>${s.alamat || '-'}</td></tr>
                        <tr><th>Orang Tua / HP</th><td>${s.nama_orang_tua || '-'} / ${s.no_hp_orang_tua || '-'}</td></tr>
                        <tr><th>Tahun Masuk / Status</th><td>${s.tahun_masuk} / ${s.status}</td></tr>
                    `;
                    modalDetail.show();
                }
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const s = allSiswa.find(x => x.id === id);
                if (s) {
                    document.getElementById('modalSiswaTitle').textContent = 'Edit Siswa';
                    document.getElementById('inputId').value = s.id;
                    document.getElementById('inputNis').value = s.nis;
                    document.getElementById('inputNisn').value = s.nisn;
                    document.getElementById('inputNama').value = s.nama_siswa;
                    document.getElementById('inputJk').value = s.jenis_kelamin;
                    document.getElementById('inputKelas').value = s.kelas_id || '';
                    document.getElementById('inputTempatLahir').value = s.tempat_lahir;
                    document.getElementById('inputTanggalLahir').value = s.tanggal_lahir;
                    document.getElementById('inputAlamat').value = s.alamat;
                    document.getElementById('inputOrtu').value = s.nama_orang_tua;
                    document.getElementById('inputHp').value = s.no_hp_orang_tua;
                    document.getElementById('inputTahunMasuk').value = s.tahun_masuk;
                    document.getElementById('inputStatus').value = s.status;
                    modalSiswa.show();
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if (confirm('Hapus data siswa ini? Semua data terkait mungkin ikut terhapus atau dibatasi.')) {
                    const res = await window.api.deleteSiswa(id);
                    if (res.success) { loadData(); showToast('Berhasil dihapus', 'success'); }
                    else showToast(res.message, 'danger');
                }
            });
        });
    }

    document.getElementById('btnTambahSiswa').addEventListener('click', () => {
        document.getElementById('modalSiswaTitle').textContent = 'Tambah Siswa';
        document.getElementById('formSiswa').reset();
        document.getElementById('inputId').value = '';
        document.getElementById('inputTahunMasuk').value = new Date().getFullYear();
        modalSiswa.show();
    });

    document.getElementById('btnSimpanSiswa').addEventListener('click', async () => {
        const id = document.getElementById('inputId').value;
        const payload = {
            nis: document.getElementById('inputNis').value.trim(),
            nisn: document.getElementById('inputNisn').value.trim(),
            nama_siswa: document.getElementById('inputNama').value.trim(),
            jenis_kelamin: document.getElementById('inputJk').value,
            kelas_id: document.getElementById('inputKelas').value || null,
            tempat_lahir: document.getElementById('inputTempatLahir').value,
            tanggal_lahir: document.getElementById('inputTanggalLahir').value,
            alamat: document.getElementById('inputAlamat').value,
            nama_orang_tua: document.getElementById('inputOrtu').value,
            no_hp_orang_tua: document.getElementById('inputHp').value,
            tahun_masuk: document.getElementById('inputTahunMasuk').value,
            status: document.getElementById('inputStatus').value,
        };

        if (!payload.nis || !payload.nama_siswa || !payload.tahun_masuk) return showToast('NIS, Nama dan Tahun Masuk wajib diisi', 'danger');

        const btn = document.getElementById('btnSimpanSiswa');
        btn.disabled = true;

        let res;
        if (id) {
            payload.id = parseInt(id);
            res = await window.api.updateSiswa(payload);
        } else {
            res = await window.api.addSiswa(payload);
        }

        btn.disabled = false;
        if (res.success) { modalSiswa.hide(); loadData(); showToast('Data siswa berhasil disimpan', 'success'); } else {
            showToast(res.message, 'danger');
        }
    });

    // Handle Import
    document.getElementById('btnImportModal').addEventListener('click', () => {
        document.getElementById('inputFileExcel').value = '';
        document.getElementById('importResult').className = 'd-none alert mt-2';
        modalImport.show();
    });

    document.getElementById('btnProsesImport').addEventListener('click', async () => {
        const fileInput = document.getElementById('inputFileExcel');
        if (!fileInput.files.length) return showToast('Pilih file Excel terlebih dahulu', 'danger');

        const file = fileInput.files[0];
        const btn = document.getElementById('btnProsesImport');
        btn.disabled = true;
        btn.textContent = 'Memproses...';

        try {
            // Karena menggunakan Electron contextIsolation, file.path dihilangkan.
            // Solusinya kita convert file ke Uint8Array lalu kirim ke backend.
            const buffer = await file.arrayBuffer();
            const fileData = new Uint8Array(buffer);
            const res = await window.api.importSiswa(fileData);
            
            const resBox = document.getElementById('importResult');
            resBox.textContent = res.message;
            resBox.className = `alert mt-2 ${res.success ? 'alert-success' : 'alert-danger'}`;
            
            if(res.success) { loadData(); showToast(res.message, 'success'); }
        } catch (err) {
            showToast('Gagal mengimpor data', 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Proses Import';
        }
    });

    fetchKelas();
    loadData();

    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
