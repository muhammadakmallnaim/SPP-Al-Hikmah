document.addEventListener('DOMContentLoaded', async () => {
    if (!sessionStorage.getItem('user')) {
        window.location.href = 'login.html';
        return;
    }

    const tableBody = document.getElementById('tableBodyPengaturan');
    const inputSearch = document.getElementById('inputSearch');
    const modalPengaturan = new bootstrap.Modal(document.getElementById('modalPengaturan'));
    
    let allData = [];

    // Load Dropdowns
    async function loadDropdowns() {
        const resTA = await window.api.getTahunAjaran();
        if(resTA.success) {
            const selectTA = document.getElementById('inputTA');
            selectTA.innerHTML = '<option value="">-- Pilih Tahun Ajaran --</option>';
            resTA.data.forEach(t => {
                selectTA.innerHTML += `<option value="${t.id}">${t.nama_tahun_ajaran} (${t.semester})</option>`;
            });
        }
        
        const resKelas = await window.api.getKelas();
        if(resKelas.success) {
            const selectKelas = document.getElementById('inputKelas');
            selectKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>';
            resKelas.data.forEach(k => {
                selectKelas.innerHTML += `<option value="${k.id}">${k.nama_kelas}</option>`;
            });
        }
    }

    async function loadData() {
        try {
            const response = await window.api.getPengaturanSPP();
            if (response.success) {
                allData = response.data;
                renderTable(allData);
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${response.message}</td></tr>`;
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Gagal memuat data</td></tr>`;
        }
    }

    inputSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allData.filter(d => 
            d.nama_tahun_ajaran.toLowerCase().includes(term) || 
            d.nama_kelas.toLowerCase().includes(term)
        );
        renderTable(filtered);
    });

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada pengaturan SPP</td></tr>`;
            return;
        }

        let html = '';
        data.forEach((item) => {
            html += `
                <tr>
                    <td class="px-4 py-3">${item.nama_tahun_ajaran}</td>
                    <td class="py-3">${item.nama_kelas}</td>
                    <td class="py-3 fw-bold">Rp ${item.nominal_spp.toLocaleString('id-ID')}</td>
                    <td class="py-3">Tgl ${item.jatuh_tempo_tanggal}</td>
                    <td class="px-4 py-3 text-end">
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
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const item = allData.find(x => x.id === id);
                if (item) {
                    document.getElementById('modalPengaturanTitle').textContent = 'Edit Pengaturan SPP';
                    document.getElementById('inputId').value = item.id;
                    document.getElementById('inputTA').value = item.tahun_ajaran_id;
                    document.getElementById('inputKelas').value = item.kelas_id;
                    document.getElementById('inputNominal').value = item.nominal_spp;
                    document.getElementById('inputJatuhTempo').value = item.jatuh_tempo_tanggal;
                    modalPengaturan.show();
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if (confirm('Hapus pengaturan ini?')) {
                    const res = await window.api.deletePengaturanSPP(id);
                    if (res.success) {
                        loadData();
                        showToast(res.message, 'success');
                    } else {
                        showToast(res.message, 'danger');
                    }
                }
            });
        });
    }

    document.getElementById('btnTambahPengaturan').addEventListener('click', () => {
        document.getElementById('modalPengaturanTitle').textContent = 'Tambah Pengaturan SPP';
        document.getElementById('formPengaturan').reset();
        document.getElementById('inputId').value = '';
        modalPengaturan.show();
    });

    document.getElementById('btnSimpanPengaturan').addEventListener('click', async () => {
        const id = document.getElementById('inputId').value;
        const payload = {
            tahun_ajaran_id: document.getElementById('inputTA').value,
            kelas_id: document.getElementById('inputKelas').value,
            nominal_spp: document.getElementById('inputNominal').value,
            jatuh_tempo_tanggal: document.getElementById('inputJatuhTempo').value
        };

        if (!payload.tahun_ajaran_id || !payload.kelas_id || !payload.nominal_spp || !payload.jatuh_tempo_tanggal) {
            return showToast('Semua field wajib diisi', 'warning');
        }

        const btn = document.getElementById('btnSimpanPengaturan');
        btn.disabled = true;

        let res;
        if (id) {
            payload.id = parseInt(id);
            res = await window.api.updatePengaturanSPP(payload);
        } else {
            res = await window.api.addPengaturanSPP(payload);
        }

        btn.disabled = false;
        if (res.success) {
            modalPengaturan.hide();
            loadData();
            showToast(res.message, 'success');
        } else {
            showToast(res.message, 'danger');
        }
    });

    loadDropdowns();
    loadData();

    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
