document.addEventListener('DOMContentLoaded', async () => {
    if (!sessionStorage.getItem('user')) {
        window.location.href = 'login.html';
        return;
    }

    const tableBody = document.getElementById('tableBodyTA');
    const modalTA = new bootstrap.Modal(document.getElementById('modalTA'));
    
    let allData = [];

    async function loadData() {
        try {
            const response = await window.api.getTahunAjaran();
            if (response.success) {
                allData = response.data;
                renderTable(allData);
            } else {
                tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${response.message}</td></tr>`;
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat data</td></tr>`;
        }
    }

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Belum ada data</td></tr>`;
            return;
        }

        let html = '';
        data.forEach((item, index) => {
            let statusBadge = item.status_aktif 
                ? '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Aktif</span>' 
                : `<button class="btn btn-sm btn-outline-success btn-set-aktif" data-id="${item.id}">Jadikan Aktif</button>`;
            
            html += `
                <tr>
                    <td class="px-4 py-3">${index + 1}</td>
                    <td class="py-3 fw-bold">${item.nama_tahun_ajaran}</td>
                    <td class="py-3">${item.semester}</td>
                    <td class="py-3 text-center">${statusBadge}</td>
                    <td class="px-4 py-3 text-end">
                        <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${item.id}" ${item.status_aktif ? 'disabled' : ''}><i class="fas fa-trash"></i> Hapus</button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        attachEvents();
    }

    function attachEvents() {
        document.querySelectorAll('.btn-set-aktif').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                if(confirm('Aktifkan tahun ajaran ini?')) {
                    await window.api.setAktifTahunAjaran(id); loadData(); showToast('Tahun Ajaran Aktif', 'success');
                }
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const item = allData.find(x => x.id === id);
                if(item) {
                    document.getElementById('modalTATitle').textContent = 'Edit Tahun Ajaran';
                    document.getElementById('inputIdTA').value = item.id;
                    document.getElementById('inputNamaTA').value = item.nama_tahun_ajaran;
                    document.getElementById('inputSemester').value = item.semester;
                    document.getElementById('inputStatusAktif').checked = item.status_aktif === 1;
                    modalTA.show();
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if(confirm('Hapus tahun ajaran ini?')) {
                    const res = await window.api.deleteTahunAjaran(id);
                    if(res.success) { loadData(); showToast('Berhasil dihapus', 'success'); }
                    else showToast(res.message, 'danger');
                }
            });
        });
    }

    document.getElementById('btnTambahTA').addEventListener('click', () => {
        document.getElementById('modalTATitle').textContent = 'Tambah Tahun Ajaran';
        document.getElementById('formTA').reset();
        document.getElementById('inputIdTA').value = '';
        modalTA.show();
    });

    document.getElementById('btnSimpanTA').addEventListener('click', async () => {
        const id = document.getElementById('inputIdTA').value;
        const nama = document.getElementById('inputNamaTA').value.trim();
        const semester = document.getElementById('inputSemester').value;
        const aktif = document.getElementById('inputStatusAktif').checked;

        if(!nama) return showToast('Nama Tahun Ajaran wajib diisi', 'danger');

        const payload = { nama_tahun_ajaran: nama, semester, status_aktif: aktif };
        let res;

        if (id) {
            payload.id = parseInt(id);
            res = await window.api.updateTahunAjaran(payload);
        } else {
            res = await window.api.addTahunAjaran(payload);
        }

        if (res.success) { modalTA.hide(); loadData(); showToast('Tahun Ajaran berhasil disimpan', 'success'); } else {
            showToast(res.message, 'danger');
        }
    });

    loadData();

    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
