document.addEventListener('DOMContentLoaded', async () => {
    if (!sessionStorage.getItem('user')) {
        window.location.href = 'login.html';
        return;
    }

    const tableBody = document.getElementById('tableBodyLaporan');
    const labelTotal = document.getElementById('labelTotal');
    const filterTA = document.getElementById('filterTA');
    const filterKelas = document.getElementById('filterKelas');
    const filterBulan = document.getElementById('filterBulan');
    const formFilter = document.getElementById('formFilter');
    const subtitle = document.getElementById('printSubtitle');
    let currentLaporanData = [];

    // Load Pilihan Tahun Ajaran
    async function loadOptions() {
        try {
            const resTA = await window.api.getTahunAjaran();
            if (resTA.success) {
                resTA.data.forEach(ta => {
                    const option = document.createElement('option');
                    option.value = ta.id;
                    option.textContent = ta.nama_tahun_ajaran + ' - ' + ta.semester;
                    filterTA.appendChild(option);
                });
            }

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

    async function loadLaporan() {
        const payload = {
            tahun_ajaran_id: filterTA.value || null,
            kelas_id: filterKelas.value || null,
            bulan: filterBulan.value || null
        };

        try {
            const res = await window.api.getLaporan(payload);
            if (res.success) {
                currentLaporanData = res.data;
                renderTable(res.data);
                labelTotal.textContent = 'Rp ' + res.total.toLocaleString('id-ID');

                // Update subtitle untuk print
                let t = 'Semua Data';
                if (filterTA.value) t = 'Tahun Ajaran Terpilih';
                if (filterBulan.value) t += ` | Bulan: ${filterBulan.value}`;
                subtitle.textContent = t;
            } else {
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${res.message}</td></tr>`;
            }
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Gagal memuat laporan</td></tr>`;
        }
    }

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Belum ada transaksi</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            // Format Tanggal
            const tgl = new Date(item.tanggal_pembayaran);
            const tglStr = `${tgl.getDate()}/${tgl.getMonth()+1}/${tgl.getFullYear()} ${tgl.getHours()}:${tgl.getMinutes()}`;

            html += `
                <tr>
                    <td class="px-3 py-2">${item.no_transaksi}</td>
                    <td class="px-3 py-2">${tglStr}</td>
                    <td class="px-3 py-2">${item.nis}</td>
                    <td class="px-3 py-2">${item.nama_siswa}</td>
                    <td class="px-3 py-2">${item.nama_kelas}</td>
                    <td class="px-3 py-2">${item.bulan_dibayar}</td>
                    <td class="px-3 py-2 text-end">Rp ${item.nominal_dibayar.toLocaleString('id-ID')}</td>
                    <td class="px-3 py-2">${item.kasir}</td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
    }

    formFilter.addEventListener('submit', (e) => {
        e.preventDefault();
        loadLaporan();
    });

    document.getElementById('btnExportExcel').addEventListener('click', () => {
        if (currentLaporanData.length === 0) return showToast('Tidak ada data untuk diekspor', 'warning');
        
        const exportData = currentLaporanData.map((item, index) => ({
            'No': index + 1,
            'No Transaksi': item.no_transaksi,
            'Tanggal': new Date(item.tanggal_pembayaran).toLocaleString('id-ID'),
            'NIS': item.nis,
            'Nama Siswa': item.nama_siswa,
            'Kelas': item.nama_kelas,
            'Bulan Tagihan': item.bulan_dibayar,
            'Nominal (Rp)': item.nominal_dibayar,
            'Petugas': item.kasir
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan_SPP");
        XLSX.writeFile(wb, "Laporan_SPP_AlHikmah.xlsx");
        window.api.tambahLog({modul: 'Laporan', tindakan: 'Export Excel', status: 'Sukses', detail: 'Berhasil mengexport laporan ke Excel'});
        
    });

    document.getElementById('btnExportPDF').addEventListener('click', () => {
        if (currentLaporanData.length === 0) return showToast('Tidak ada data untuk diekspor', 'warning');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        
        // Coba masukkan Logo
        try {
            const logoEl = document.querySelector('.sidebar img');
            if(logoEl) {
                const canvas = document.createElement('canvas');
                canvas.width = logoEl.naturalWidth || 50;
                canvas.height = logoEl.naturalHeight || 50;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoEl, 0, 0, canvas.width, canvas.height);
                const dataURL = canvas.toDataURL('image/png');
                doc.addImage(dataURL, 'PNG', 14, 10, 15, 15);
            }
        } catch(e) {}

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('YAYASAN PENDIDIKAN AL-HIKMAH', 32, 16);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text('Laporan Penerimaan SPP', 32, 23);
        
        const tableColumn = ["No", "No Transaksi", "Tanggal", "NIS", "Nama", "Kelas", "Bulan", "Nominal (Rp)", "Petugas"];
        const tableRows = [];

        let total = 0;
        currentLaporanData.forEach((item, index) => {
            const dataRow = [
                index + 1,
                item.no_transaksi,
                new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID'),
                item.nis,
                item.nama_siswa,
                item.nama_kelas,
                item.bulan_dibayar,
                item.nominal_dibayar.toLocaleString('id-ID'),
                item.kasir
            ];
            tableRows.push(dataRow);
            total += item.nominal_dibayar;
        });

        tableRows.push(["", "", "", "", "", "", "TOTAL", total.toLocaleString('id-ID'), ""]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 32,
            theme: 'striped',
            headStyles: { fillColor: [43, 58, 74] }
        });

        doc.save('Laporan_SPP_AlHikmah.pdf');
        window.api.tambahLog({modul: 'Laporan', tindakan: 'Export PDF', status: 'Sukses', detail: 'Berhasil mengexport laporan ke PDF'});
        
    });

    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    await loadOptions();
    loadLaporan();
});
