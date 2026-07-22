document.addEventListener('DOMContentLoaded', () => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) {
        if (!window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    const user = JSON.parse(userStr);
    
    // Authorization logic
    if (user.role === 'kepala_sekolah') {
        const restrictedMenus = [
            'dashboard.html',
            'data-siswa.html',
            'data-kelas.html',
            'tahun-ajaran.html',
            'pengaturan-spp.html',
            'pembayaran.html',
            'data-user.html'
        ];
        
        // Cek jika mengakses halaman terlarang
        const currentPath = window.location.pathname;
        const isRestrictedPage = restrictedMenus.some(menu => currentPath.endsWith(menu));
        
        if (isRestrictedPage) {
            window.location.href = 'laporan.html';
        }

        // Sembunyikan dari sidebar
        const sidebarLinks = document.querySelectorAll('.sidebar a');
        sidebarLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && restrictedMenus.includes(href)) {
                link.style.display = 'none';
            }
        });
    }

});
