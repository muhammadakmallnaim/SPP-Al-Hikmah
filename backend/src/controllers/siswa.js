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
                    const pwdDisplay = s.password ? (s.is_password_changed ? '******** (Sudah diganti)' : s.password) : 'Belum di-generate';
                    const userDisplay = s.username || '-';

                    document.getElementById('detailTableBody').innerHTML = `
                        <tr><th>NIS / NISN</th><td>${s.nis} / ${s.nisn || '-'}</td></tr>
                        <tr><th>Nama Lengkap</th><td>${s.nama_siswa}</td></tr>
                        <tr><th>Kelas</th><td>${s.nama_kelas || '-'}</td></tr>
                        <tr><th>JK / Tempat Tgl Lahir</th><td>${s.jenis_kelamin === 'L'?'Laki-laki':'Perempuan'} / ${s.tempat_lahir || '-'}, ${s.tanggal_lahir || '-'}</td></tr>
                        <tr><th>Alamat</th><td>${s.alamat || '-'}</td></tr>
                        <tr><th>Orang Tua / HP</th><td>${s.nama_orang_tua || '-'} / ${s.no_hp_orang_tua || '-'}</td></tr>
                        <tr><th>Tahun Masuk / Status</th><td>${s.tahun_masuk} / ${s.status}</td></tr>
                        <tr class="table-info"><th>Username</th><td><strong>${userDisplay}</strong></td></tr>
                        <tr class="table-info"><th>Password</th><td><strong>${pwdDisplay}</strong></td></tr>
                        ${s.password ? `<tr><td colspan="2"><button class="btn btn-sm btn-danger w-100" onclick="window.downloadKartuSiswa(${s.id})"><i class="fas fa-file-pdf"></i> Simpan Kartu PDF (Per Siswa)</button></td></tr>` : ''}
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

    // --- MANAJEMEN AKUN (GENERATE & CETAK) ---
    const modalGenerateAkun = new bootstrap.Modal(document.getElementById('modalGenerateAkun'));
    
    document.getElementById('btnGenerateAkun').addEventListener('click', () => {
        // Populate select kelas
        let selectKelas = document.getElementById('generatePilihKelas');
        let cetakKelas = document.getElementById('cetakPilihKelas');
        selectKelas.innerHTML = '<option value="">Pilih Kelas</option>';
        cetakKelas.innerHTML = '<option value="all" selected>Seluruh Kelas</option>';
        allKelas.forEach(k => {
            selectKelas.innerHTML += `<option value="${k.id}">${k.nama_kelas}</option>`;
            cetakKelas.innerHTML += `<option value="${k.id}">${k.nama_kelas}</option>`;
        });

        // Populate select siswa for Tom Select
        let selectSiswa = document.getElementById('generatePilihSiswa');
        selectSiswa.innerHTML = '<option value="">Cari dan Pilih Siswa...</option>';
        allSiswa.forEach(s => {
            selectSiswa.innerHTML += `<option value="${s.id}">${s.nama_siswa} (${s.nis})</option>`;
        });
        
        // Inisialisasi Tom Select jika belum
        if (!window.tomSelectInstance) {
            window.tomSelectInstance = new TomSelect("#generatePilihSiswa",{
                create: false,
                sortField: { field: "text", direction: "asc" }
            });
        } else {
            window.tomSelectInstance.clear();
            window.tomSelectInstance.clearOptions();
            window.tomSelectInstance.sync();
        }

        // Reset state
        document.getElementById('generateMode').value = 'semua';
        document.getElementById('divPilihKelas').classList.add('d-none');
        document.getElementById('divPilihSiswa').classList.add('d-none');
        document.getElementById('generateForce').checked = false;

        modalGenerateAkun.show();
    });

    document.getElementById('generateMode').addEventListener('change', (e) => {
        if(e.target.value === 'kelas') {
            document.getElementById('divPilihKelas').classList.remove('d-none');
            document.getElementById('divPilihSiswa').classList.add('d-none');
        } else if (e.target.value === 'siswa') {
            document.getElementById('divPilihKelas').classList.add('d-none');
            document.getElementById('divPilihSiswa').classList.remove('d-none');
        } else {
            // Mode semua kelas, hide both
            document.getElementById('divPilihKelas').classList.add('d-none');
            document.getElementById('divPilihSiswa').classList.add('d-none');
        }
    });

    document.getElementById('btnProsesGenerate').addEventListener('click', async () => {
        const mode = document.getElementById('generateMode').value;
        const force = document.getElementById('generateForce').checked;
        let target_id = null;

        if (mode === 'kelas') {
            target_id = document.getElementById('generatePilihKelas').value;
            if(!target_id) return showToast('Pilih kelas terlebih dahulu!', 'warning');
        } else if (mode === 'siswa') {
            target_id = document.getElementById('generatePilihSiswa').value;
            if(!target_id) return showToast('Pilih siswa terlebih dahulu!', 'warning');
        } else if (mode === 'semua') {
            target_id = 'all'; // Special marker for backend
        }

        const btn = document.getElementById('btnProsesGenerate');
        btn.disabled = true;
        btn.textContent = "Proses...";

        try {
            const parsedTarget = target_id === 'all' ? 'all' : parseInt(target_id);
            const res = await window.api.generateAkun({ mode, target_id: parsedTarget, force });
            if (res.success) {
                showToast(res.message, 'success');
                modalGenerateAkun.hide();
                loadData(); // refresh data 
            } else {
                showToast(res.message, 'danger');
            }
        } catch (e) {
            showToast('Terjadi kesalahan saat generate akun', 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = "Mulai Generate Password";
        }
    });

    const generateKartuPDF = async (siswaArray, filename) => {
        if(siswaArray.length === 0) return showToast('Tidak ada data siswa untuk dicetak', 'warning');
        
        showToast('Sedang membuat PDF, mohon tunggu...', 'info');
        
        let htmlContent = `<div style="font-family: Arial, sans-serif; background: #fff;">`;
        
        for (let i = 0; i < siswaArray.length; i += 6) {
            const chunk = siswaArray.slice(i, i + 6);
            htmlContent += `
                <div style="padding: 20px; page-break-after: always;">
                    <h2 style="text-align: center; margin-bottom: 20px;">Kartu Login Siswa</h2>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; max-width: 750px; margin: 0 auto;">
            `;
            
            chunk.forEach(s => {
                const username = s.username || s.nisn || s.nis;
                const pwd = s.password ? (s.is_password_changed ? '******** (Sudah diganti)' : s.password) : 'Belum di-generate';
                htmlContent += `
                    <div style="border: 2px solid #2d6a4f; border-radius: 8px; padding: 15px; background: #f8fdfa; text-align: center; box-sizing: border-box; page-break-inside: avoid; height: 250px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #2d6a4f; border-bottom: 2px dashed #ccc; padding-bottom: 5px;">Portal SPP Al-Hikmah</h3>
                        <div style="font-weight: bold; font-size: 16px; margin: 10px 0;">${s.nama_siswa}</div>
                        <div style="font-size: 13px; color: #555;">NIS: ${s.nis}</div>
                        <div style="text-align: left; font-size: 14px; margin-top: 10px; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            <div><span style="display: inline-block; width: 85px; font-weight: bold;">Username</span>: ${username}</div>
                            <div><span style="display: inline-block; width: 85px; font-weight: bold;">Password</span>: <strong>${pwd}</strong></div>
                        </div>
                        <div style="margin-top: 12px; font-size: 11px; color: #666;">Simpan kartu ini dengan aman.</div>
                    </div>
                `;
            });
            htmlContent += `</div></div>`;
        }
        htmlContent += `</div>`;

        const opt = {
            margin:       0.5,
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        try {
            await html2pdf().set(opt).from(htmlContent).save();
            showToast('PDF berhasil diunduh!', 'success');
        } catch (e) {
            showToast('Gagal membuat PDF', 'danger');
        }
    };

    // Export function ke global window agar bisa di-click dari Detail Siswa HTML
    window.downloadKartuSiswa = (siswa_id) => {
        const target = allSiswa.filter(s => s.id == siswa_id);
        if(target.length > 0) {
            const filename = `Kartu_Login_${target[0].nama_siswa.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            generateKartuPDF(target, filename);
        }
    };

    document.getElementById('btnProsesCetak').addEventListener('click', async () => {
        const kelas_id = document.getElementById('cetakPilihKelas').value;
        if(!kelas_id) return showToast('Pilih kelas yang mau dicetak', 'warning');
        
        const btn = document.getElementById('btnProsesCetak');
        btn.disabled = true;
        btn.textContent = "Proses...";
        
        if (kelas_id === 'all') {
            const target = allSiswa.filter(s => s.status === 'aktif');
            await generateKartuPDF(target, 'Kartu_Login_Seluruh_Siswa_Aktif.pdf');
        } else {
            const target = allSiswa.filter(s => s.kelas_id == kelas_id && s.status === 'aktif');
            const kelasTarget = document.querySelector(`#cetakPilihKelas option[value="${kelas_id}"]`).textContent;
            await generateKartuPDF(target, `Kartu_Login_Kelas_${kelasTarget.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        }
        
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-print me-2"></i> Cetak Kartu Kelas`;
        modalGenerateAkun.hide();
    });

    // --- MANAJEMEN KENAIKAN KELAS ---
    const modalKenaikanKelas = new bootstrap.Modal(document.getElementById('modalKenaikanKelas'));
    
    document.getElementById('btnKenaikanKelas').addEventListener('click', () => {
        let selectAsal = document.getElementById('kkKelasAsal');
        let selectTujuan = document.getElementById('kkKelasTujuan');
        selectAsal.innerHTML = '<option value="">-- Pilih Kelas Asal --</option>';
        selectTujuan.innerHTML = '<option value="">-- Pilih Kelas Tujuan --</option>';
        
        allKelas.forEach(k => {
            selectAsal.innerHTML += `<option value="${k.id}">${k.nama_kelas}</option>`;
            selectTujuan.innerHTML += `<option value="${k.id}">${k.nama_kelas}</option>`;
        });
        
        document.getElementById('kkTableBody').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Pilih Kelas Asal terlebih dahulu</td></tr>';
        document.getElementById('kkCheckAll').checked = false;
        
        modalKenaikanKelas.show();
    });
    
    document.getElementById('kkKelasAsal').addEventListener('change', (e) => {
        const kelasId = e.target.value;
        const tbody = document.getElementById('kkTableBody');
        if (!kelasId) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Pilih Kelas Asal terlebih dahulu</td></tr>';
            return;
        }
        
        const siswaKelas = allSiswa.filter(s => s.kelas_id == kelasId && s.status === 'aktif');
        if (siswaKelas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Tidak ada siswa aktif di kelas ini</td></tr>';
            return;
        }
        
        let html = '';
        siswaKelas.forEach(s => {
            html += `
                <tr>
                    <td><input type="checkbox" class="kk-checkbox" value="${s.id}"></td>
                    <td>${s.nis}</td>
                    <td>${s.nama_siswa}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        document.getElementById('kkCheckAll').checked = false;
    });
    
    document.getElementById('kkCheckAll').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.kk-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });
    
    document.getElementById('btnProsesKenaikan').addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.kk-checkbox:checked');
        const siswa_ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
        const target_kelas_id = document.getElementById('kkKelasTujuan').value;
        
        if (siswa_ids.length === 0) return showToast('Pilih minimal 1 siswa', 'warning');
        if (!target_kelas_id) return showToast('Pilih Kelas Tujuan', 'warning');
        if (document.getElementById('kkKelasAsal').value === target_kelas_id) return showToast('Kelas Tujuan tidak boleh sama dengan Kelas Asal', 'warning');
        
        if (!confirm(`Anda yakin akan menaikkan ${siswa_ids.length} siswa ke Kelas Tujuan?`)) return;
        
        const btn = document.getElementById('btnProsesKenaikan');
        btn.disabled = true;
        btn.textContent = 'Memproses...';
        
        try {
            const res = await window.api.promoteSiswa({ siswa_ids, target_kelas_id: parseInt(target_kelas_id) });
            if (res.success) {
                showToast(res.message, 'success');
                modalKenaikanKelas.hide();
                loadData();
            } else {
                showToast(res.message, 'danger');
            }
        } catch (e) {
            showToast('Terjadi kesalahan saat proses kenaikan kelas', 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Proses Kenaikan Kelas';
        }
    });

    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
