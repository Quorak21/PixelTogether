const fs = require('fs');
const path = require('path');

function count(dir) {
    let lines = 0;
    const files = fs.readdirSync(dir);
    
    files.forEach(f => {
        const p = path.join(dir, f);
        const stat = fs.statSync(p);
        
        if (stat.isDirectory()) {
            if (!['node_modules', '.git', 'build', 'dist'].includes(f)) {
                lines += count(p);
            }
        } else {
            if (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.css') || f.endsWith('.html')) {
                const content = fs.readFileSync(p, 'utf-8');
                lines += content.split('\n').length;
            }
        }
    });
    
    return lines;
}

try {
    const clientLines = count(path.join(__dirname, 'client', 'src'));
    const serverLines = count(path.join(__dirname, 'server'));
    console.log(`Client lines: ${clientLines}`);
    console.log(`Server lines: ${serverLines}`);
    console.log(`Total lines: ${clientLines + serverLines}`);
} catch (e) {
    console.error(e);
}
