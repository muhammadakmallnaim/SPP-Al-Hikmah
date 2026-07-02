const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'views');

const extraCSS = `
        /* Sidebar Enhancements */
        .sidebar a { color: rgba(255,255,255,0.85) !important; font-weight: 500; }
        .sidebar a i { color: rgba(255,255,255,0.85) !important; }
        .sidebar a:hover, .sidebar a.active { color: #fff !important; font-weight: 600; }
        .sidebar a:hover i, .sidebar a.active i { color: #fff !important; }
        .sidebar .border-secondary { border-color: rgba(255,255,255,0.3) !important; }
`;

fs.readdirSync(dir).forEach(f => {
    if (f.endsWith('.html')) {
        let p = path.join(dir, f);
        let c = fs.readFileSync(p, 'utf8');
        
        if (!c.includes('/* Sidebar Enhancements */')) {
            c = c.replace('</style>', extraCSS + '    </style>');
        }
        fs.writeFileSync(p, c);
    }
});
console.log('Colors enhanced successfully!');
