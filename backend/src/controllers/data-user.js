document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableUserBody');
    const modalUser = new bootstrap.Modal(document.getElementById('modalUser'));
    const formUser = document.getElementById('formUser');
    const alertError = document.getElementById('alertError');
    const modalTitle = document.getElementById('modalUserTitle');
    
    const userIdInput = document.getElementById('userId');
    const namaInput = document.getElementById('inputNama');
    const usernameInput = document.getElementById('inputUsername');
    const roleInput = document.getElementById('inputRole');
    const passwordInput = document.getElementById('inputPassword');
    const passwordHelp = document.getElementById('passwordHelp');

    let isEditMode = false;

    // Load data
    async function loadData() {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin me-2"></i>Memuat data...</td></tr>`;
        try {
            const result = await window.api.getAllUsers();
            if (result.success) {
                if (result.data.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada data user.</td></tr>`;
                    return;
                }

                tableBody.innerHTML = '';
                result.data.forEach((user, index) => {
                    const row = document.createElement('tr');
                    
                    let roleBadge = '';
                    if (user.role === 'admin') roleBadge = '<span class="badge bg-danger">Admin</span>';
                    else if (user.role === 'bendahara') roleBadge = '<span class="badge bg-warning text-dark">Bendahara</span>';
                    else roleBadge = '<span class="badge bg-success">Kepala Sekolah</span>';

                    row.innerHTML = `
                        <td class="px-4 py-3 align-middle">${index + 1}</td>
                        <td class="py-3 align-middle fw-semibold">${user.nama_lengkap}</td>
                        <td class="py-3 align-middle">${user.username}</td>
                        <td class="py-3 align-middle">${roleBadge}</td>
                        <td class="px-4 py-3 align-middle text-center">
                            <button class="btn btn-sm btn-outline-primary me-2 btn-edit" data-id="${user.id}" data-nama="${user.nama_lengkap}" data-username="${user.username}" data-role="${user.role}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${user.id}">
                                <i class="fas fa-trash"></i> Hapus
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });

                // Attach events
                document.querySelectorAll('.btn-edit').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const target = e.currentTarget;
                        isEditMode = true;
                        modalTitle.textContent = 'Edit User';
                        userIdInput.value = target.dataset.id;
                        namaInput.value = target.dataset.nama;
                        usernameInput.value = target.dataset.username;
                        roleInput.value = target.dataset.role;
                        passwordInput.value = '';
                        passwordInput.required = false;
                        passwordHelp.textContent = 'Kosongkan jika tidak ingin mengubah password.';
                        alertError.classList.add('d-none');
                        modalUser.show();
                    });
                });

                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.dataset.id;
                        const currentUser = JSON.parse(sessionStorage.getItem('user'));
                        if (currentUser.id == id) {
                            Swal.fire('Akses Ditolak', 'Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan.', 'error');
                            return;
                        }

                        const result = await Swal.fire({
                            title: 'Hapus User?',
                            text: 'Apakah Anda yakin ingin menghapus user ini?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            cancelButtonColor: '#3085d6',
                            confirmButtonText: 'Ya, Hapus!'
                        });

                        if (result.isConfirmed) {
                            const res = await window.api.deleteUser(id);
                            if (res.success) {
                                Swal.fire('Terhapus!', res.message, 'success');
                                loadData();
                            } else {
                                Swal.fire('Gagal!', res.message, 'error');
                            }
                        }
                    });
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${result.message}</td></tr>`;
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Terjadi kesalahan sistem.</td></tr>`;
        }
    }

    // Modal Tambah
    document.getElementById('btnTambahUser').addEventListener('click', () => {
        isEditMode = false;
        formUser.reset();
        userIdInput.value = '';
        modalTitle.textContent = 'Tambah User Baru';
        passwordInput.required = true;
        passwordHelp.textContent = 'Wajib diisi untuk user baru.';
        alertError.classList.add('d-none');
        modalUser.show();
    });

    // Form Submit
    formUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            nama_lengkap: namaInput.value,
            username: usernameInput.value,
            role: roleInput.value,
            password: passwordInput.value
        };

        if (isEditMode) {
            data.id = userIdInput.value;
        }

        try {
            const res = isEditMode ? await window.api.updateUser(data) : await window.api.addUser(data);
            
            if (res.success) {
                modalUser.hide();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: res.message,
                    timer: 1500,
                    showConfirmButton: false
                });
                loadData();
            } else {
                alertError.textContent = res.message;
                alertError.classList.remove('d-none');
            }
        } catch (error) {
            alertError.textContent = 'Terjadi kesalahan sistem.';
            alertError.classList.remove('d-none');
        }
    });

    // Logout setup
    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    loadData();
});
