const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'views');

const customCSS = `
        /* Override Theme */
        :root {
            --bs-primary: #f4a261;
        }
        .btn-primary { background-color: #f4a261 !important; border-color: #f4a261 !important; color: #fff !important; }
        .btn-primary:hover { background-color: #e76f51 !important; border-color: #e76f51 !important; }
        .btn-outline-primary { color: #f4a261 !important; border-color: #f4a261 !important; }
        .btn-outline-primary:hover { background-color: #f4a261 !important; color: #fff !important; }
        .text-primary { color: #f4a261 !important; }
        .bg-primary { background-color: #f4a261 !important; }`;

fs.readdirSync(dir).forEach(f => {
    if (f.endsWith('.html')) {
        let p = path.join(dir, f);
        let c = fs.readFileSync(p, 'utf8');
        // Replace colors
        c = c.replace(/#2b3a4a/g, '#40916c'); // Sidebar & Header -> Soft Green
        c = c.replace(/#1a252f/g, '#2d6a4f'); // Hover -> Darker Green
        c = c.replace(/#3498db/g, '#f4a261'); // Active Border -> Soft Orange
        
        // Add custom CSS
        if (!c.includes('--bs-primary: #f4a261')) {
            c = c.replace('</style>', customCSS + '\n    </style>');
        }
        fs.writeFileSync(p, c);
    }
});
console.log('Colors replaced successfully!');
