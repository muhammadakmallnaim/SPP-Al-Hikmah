document.addEventListener('DOMContentLoaded', async () => {
    // Validasi session
    if (!sessionStorage.getItem('user')) {
        window.location.href = 'login.html';
        return;
    }

    const tableBody = document.getElementById('tableBodyKelas');
    const modalTambah = new bootstrap.Modal(document.getElementById('modalTambahKelas'));
    const modalEdit = new bootstrap.Modal(document.getElementById('modalEditKelas'));
    const inputSearch = document.getElementById('inputSearch');
    
    let allData = [];

    // Load Data Kelas
    async function loadData() {
        try {
            const response = await window.api.getKelas();
            if (response.success) {
                allData = response.data;
                renderTable(allData);
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${response.message}</td></tr>`;
            }
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Gagal mengambil data dari server</td></tr>`;
        }
    }

    inputSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allData.filter(item => item.nama_kelas.toLowerCase().includes(term));
        renderTable(filtered);
    });

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada data kelas</td></tr>`;
            return;
        }

        let html = '';
        data.forEach((item, index) => {
            html += `
                <tr>
                    <td class="px-4 py-3">${index + 1}</td>
                    <td class="py-3">${item.tingkat}</td>
                    <td class="py-3 fw-bold">${item.nama_kelas}</td>
                    <td class="py-3">${item.wali_kelas}</td>
                    <td class="px-4 py-3 text-end">
                        <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${item.id}"><i class="fas fa-trash"></i> Hapus</button>
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
                if(item) {
                    document.getElementById('editIdKelas').value = item.id;
                    document.getElementById('editTingkat').value = item.tingkat;
                    document.getElementById('editNamaKelas').value = item.nama_kelas;
                    document.getElementById('editWaliKelas').value = item.wali_kelas;
                    document.getElementById('errorMsgEditKelas').classList.add('d-none');
                    modalEdit.show();
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if(confirm('Apakah Anda yakin ingin menghapus kelas ini?')) {
                    try {
                        const res = await window.api.deleteKelas(id);
                        if(res.success) { loadData(); showToast('Kelas berhasil dihapus', 'success'); } else {
                            showToast(res.message, 'danger');
                        }
                    } catch (error) {
                        showToast('Gagal menghapus kelas', 'danger');
                    }
                }
            });
        });
    }

    // Modal Tambah
    document.getElementById('btnTambahKelas').addEventListener('click', () => {
        document.getElementById('formTambahKelas').reset();
        document.getElementById('errorMsgKelas').classList.add('d-none');
        modalTambah.show();
    });

    // Simpan Data
    document.getElementById('btnSimpanKelas').addEventListener('click', async () => {
        const tingkat = document.getElementById('inputTingkat').value;
        const nama_kelas = document.getElementById('inputNamaKelas').value.trim();
        const wali_kelas = document.getElementById('inputWaliKelas').value.trim();

        if (!tingkat || !nama_kelas || !wali_kelas) {
            const err = document.getElementById('errorMsgKelas');
            err.textContent = "Semua field harus diisi.";
            err.classList.remove('d-none');
            return;
        }

        const btn = document.getElementById('btnSimpanKelas');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
            const response = await window.api.addKelas({ tingkat, nama_kelas, wali_kelas });
            if (response.success) {
                modalTambah.hide(); loadData(); showToast('Kelas berhasil disimpan', 'success');
            } else {
                const err = document.getElementById('errorMsgKelas');
                err.textContent = response.message;
                err.classList.remove('d-none');
            }
        } catch (error) {
            console.error(error);
            const err = document.getElementById('errorMsgKelas');
            err.textContent = "Terjadi kesalahan sistem.";
            err.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan';
        }
    });

    // Update Data
    document.getElementById('btnUpdateKelas').addEventListener('click', async () => {
        const id = document.getElementById('editIdKelas').value;
        const tingkat = document.getElementById('editTingkat').value;
        const nama_kelas = document.getElementById('editNamaKelas').value.trim();
        const wali_kelas = document.getElementById('editWaliKelas').value.trim();

        if (!tingkat || !nama_kelas || !wali_kelas) {
            const err = document.getElementById('errorMsgEditKelas');
            err.textContent = "Semua field harus diisi.";
            err.classList.remove('d-none');
            return;
        }

        const btn = document.getElementById('btnUpdateKelas');
        btn.disabled = true;
        btn.textContent = 'Memperbarui...';

        try {
            const response = await window.api.updateKelas({ id, tingkat, nama_kelas, wali_kelas });
            if (response.success) {
                modalEdit.hide(); loadData(); showToast('Kelas berhasil diupdate', 'success');
            } else {
                const err = document.getElementById('errorMsgEditKelas');
                err.textContent = response.message;
                err.classList.remove('d-none');
            }
        } catch (error) {
            console.error(error);
            const err = document.getElementById('errorMsgEditKelas');
            err.textContent = "Terjadi kesalahan sistem.";
            err.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Update';
        }
    });

    // Initial Load
    loadData();
});
