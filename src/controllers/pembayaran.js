document.addEventListener('DOMContentLoaded', () => {
    // Session validation
    const userJson = sessionStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userJson);

    const filterKelas = document.getElementById('filterKelas');
    const inputKeyword = document.getElementById('inputKeyword');
    const formCari = document.getElementById('formCariSiswa');
    const tableBodySiswa = document.getElementById('tableBodySiswa');
    const areaListSiswa = document.getElementById('areaListSiswa');
    const errorCari = document.getElementById('errorCari');
    const areaPembayaran = document.getElementById('areaPembayaran');
    const containerTagihan = document.getElementById('containerTagihan');
    
    let currentSiswa = null;
    let currentTAId = null;
    let currentNominal = 0;
    let selectedBulan = '';

    const modalBayar = new bootstrap.Modal(document.getElementById('modalBayar'));

    // Load Kelas
    async function loadKelas() {
        const res = await window.api.getKelas();
        if (res.success) {
            res.data.forEach(k => {
                const option = document.createElement('option');
                option.value = k.id;
                option.textContent = k.nama_kelas;
                filterKelas.appendChild(option);
            });
        }
    }

    formCari.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            kelas_id: filterKelas.value || null,
            keyword: inputKeyword.value.trim()
        };

        errorCari.classList.add('d-none');
        areaPembayaran.classList.add('d-none');
        tableBodySiswa.innerHTML = `<tr><td colspan="4" class="text-center py-4">Memuat data...</td></tr>`;

        try {
            const response = await window.api.getSiswaPembayaran(payload);
            if (response.success) {
                if(response.data.length === 0) {
                    tableBodySiswa.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Data tidak ditemukan</td></tr>`;
                    return;
                }
                
                let html = '';
                response.data.forEach(s => {
                    html += `
                        <tr>
                            <td class="px-3 py-2 align-middle">${s.nis}</td>
                            <td class="px-3 py-2 align-middle fw-bold">${s.nama_siswa}</td>
                            <td class="px-3 py-2 align-middle">${s.nama_kelas}</td>
                            <td class="px-3 py-2 text-center align-middle">
                                <button class="btn btn-sm btn-outline-primary btn-tagihan" data-nis="${s.nis}">Cek Tagihan</button>
                            </td>
                        </tr>
                    `;
                });
                tableBodySiswa.innerHTML = html;

                document.querySelectorAll('.btn-tagihan').forEach(btn => {
                    btn.addEventListener('click', (ev) => {
                        const nis = ev.target.getAttribute('data-nis');
                        loadTagihanSiswa(nis);
                    });
                });
            } else {
                tableBodySiswa.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">${response.message}</td></tr>`;
            }
        } catch (error) {
            console.error(error);
            tableBodySiswa.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">Gagal memuat data</td></tr>`;
        }
    });

    async function loadTagihanSiswa(nis) {
        errorCari.classList.add('d-none');
        try {
            const response = await window.api.cariTagihanSiswa(nis);
            if (response.success) {
                renderDataPembayaran(response.data);
                // Scroll ke area pembayaran
                areaPembayaran.scrollIntoView({ behavior: 'smooth' });
            } else {
                errorCari.textContent = response.message;
                errorCari.classList.remove('d-none');
                areaPembayaran.classList.add('d-none');
            }
        } catch (error) {
            console.error(error);
            errorCari.textContent = 'Terjadi kesalahan saat mencari tagihan.';
            errorCari.classList.remove('d-none');
        }
    }

    function renderDataPembayaran(data) {
        currentSiswa = data.siswa;
        currentTAId = data.tahun_ajaran_id;
        currentNominal = data.nominal_spp;

        // Render info kartu
        document.getElementById('infoNamaSiswa').textContent = currentSiswa.nama_siswa;
        document.getElementById('infoNis').textContent = currentSiswa.nis;
        document.getElementById('infoKelas').textContent = currentSiswa.nama_kelas;
        document.getElementById('infoTA').textContent = data.tahun_ajaran;
        document.getElementById('infoNominal').textContent = currentNominal.toLocaleString('id-ID');

        // Render grid tagihan bulan
        containerTagihan.innerHTML = '';
        data.tagihan.forEach(item => {
            const isLunas = item.status === 'Lunas';
            const cardClass = isLunas ? 'lunas' : 'belum';
            const icon = isLunas ? '<i class="fas fa-check-circle text-success fs-3 mb-2"></i>' : '<i class="fas fa-file-invoice-dollar text-primary fs-3 mb-2"></i>';
            const badge = isLunas ? '<span class="status-badge bg-success text-white mb-2 d-inline-block">Lunas</span>' : '<span class="status-badge bg-warning text-dark mb-2 d-inline-block">Belum Dibayar</span>';
            const extraBtn = isLunas ? `<button class="btn btn-sm btn-outline-success w-100 mt-2 btn-cetak" data-trx="${item.no_transaksi}" data-bln="${item.bulan}"><i class="fas fa-download"></i> Kuitansi</button>` : '';
            
            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-4 col-6';
            
            col.innerHTML = `
                <div class="card p-3 text-center month-card ${cardClass}" data-bulan="${item.bulan}">
                    ${icon}
                    <h6 class="fw-bold mb-1">${item.bulan}</h6>
                    ${badge}
                    ${extraBtn}
                </div>
            `;

            if (!isLunas) {
                col.querySelector('.month-card').addEventListener('click', (ev) => {
                    if(!ev.target.closest('.btn-cetak')) {
                        bukaModalBayar(item.bulan);
                    }
                });
            } else {
                col.querySelector('.btn-cetak').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const noTrx = ev.target.closest('.btn-cetak').getAttribute('data-trx');
                    const bln = ev.target.closest('.btn-cetak').getAttribute('data-bln');
                    cetakStruk(noTrx, bln, currentNominal);
                });
            }

            containerTagihan.appendChild(col);
        });

        areaPembayaran.classList.remove('d-none');
    }

    function bukaModalBayar(bulan) {
        selectedBulan = bulan;
        document.getElementById('modalNamaSiswa').textContent = currentSiswa.nama_siswa;
        document.getElementById('modalBulan').textContent = bulan;
        document.getElementById('modalNominal').textContent = 'Rp ' + currentNominal.toLocaleString('id-ID');
        document.getElementById('modalError').classList.add('d-none');
        
        modalBayar.show();
    }

    document.getElementById('btnProsesBayar').addEventListener('click', async () => {
        const btn = document.getElementById('btnProsesBayar');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Memproses...';
        document.getElementById('modalError').classList.add('d-none');

        const payload = {
            siswa_id: currentSiswa.siswa_id,
            tahun_ajaran_id: currentTAId,
            bulan_dibayar: selectedBulan,
            nominal_dibayar: currentNominal,
            kasir_id: user.id // diambil dari session
        };

        try {
            const response = await window.api.prosesPembayaran(payload);
            if (response.success) {
                modalBayar.hide();
                // Refresh data tagihan otomatis
                loadTagihanSiswa(currentSiswa.nis);
                
                showToast(`Pembayaran berhasil! No Transaksi: ${response.no_transaksi}`, 'success');
                
                // Cetak Struk (Kuitansi) otomatis dengan PDF
                cetakStruk(response.no_transaksi, selectedBulan, currentNominal);

            } else {
                document.getElementById('modalError').textContent = response.message;
                document.getElementById('modalError').classList.remove('d-none');
            }
        } catch (error) {
            console.error(error);
            document.getElementById('modalError').textContent = 'Terjadi kesalahan jaringan atau server.';
            document.getElementById('modalError').classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Proses Pembayaran';
        }
    });

    function cetakStruk(noTransaksi, bulan, nominal) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [210, 100] // Kuitansi panjang (separuh A4 horizontal)
        });

        // Background / Border
        doc.setDrawColor(43, 58, 74);
        doc.setLineWidth(1);
        doc.rect(5, 5, 200, 90);

        // Logo
        try {
            const logoEl = document.querySelector('.sidebar img');
            if(logoEl) {
                // Get image data via canvas
                const canvas = document.createElement('canvas');
                canvas.width = logoEl.naturalWidth || 50;
                canvas.height = logoEl.naturalHeight || 50;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoEl, 0, 0, canvas.width, canvas.height);
                const dataURL = canvas.toDataURL('image/png');
                doc.addImage(dataURL, 'PNG', 12, 10, 15, 15);
            }
        } catch(e) { console.warn('Gagal memuat logo untuk kuitansi'); }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('KUITANSI PEMBAYARAN SPP', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text('YAYASAN PENDIDIKAN AL-HIKMAH', 105, 22, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(10, 27, 200, 27);

        // Kolom Kiri
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`No Transaksi`, 12, 38);
        doc.text(`: ${noTransaksi}`, 45, 38);
        
        doc.setFont("helvetica", "normal");
        doc.text(`Telah Terima Dari`, 12, 48);
        doc.text(`: ${currentSiswa.nama_siswa} (${currentSiswa.nis})`, 45, 48);
        
        doc.text(`Kelas`, 12, 56);
        doc.text(`: ${currentSiswa.nama_kelas}`, 45, 56);
        
        doc.text(`Untuk Pembayaran`, 12, 64);
        doc.text(`: SPP Bulan ${bulan}`, 45, 64);

        // Total
        doc.setFillColor(240, 240, 240);
        doc.rect(12, 72, 80, 15, 'F');
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL : Rp ${nominal.toLocaleString('id-ID')}`, 15, 82);

        // Kolom Kanan (Tanda Tangan)
        const tglStr = new Date().toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'});
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Jakarta, ${tglStr}`, 150, 48);
        doc.text(`Petugas / Kasir`, 150, 54);
        
        doc.setFont("helvetica", "bold");
        doc.text(`( ${user.nama_lengkap} )`, 150, 80);

        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(`Terima kasih. Simpan kuitansi ini sebagai bukti pembayaran yang sah.`, 105, 92, { align: 'center' });

        doc.save(`Kuitansi_${noTransaksi}.pdf`);
    }

    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    loadKelas();
    // Auto load data pertama
    formCari.dispatchEvent(new Event('submit'));
});
