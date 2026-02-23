const fs = require('fs');
console.log('Watching index.js...');
fs.watch('index.js', (eventType, filename) => {
    console.log(`event type is: ${eventType}`);
    if (filename) {
        console.log(`filename provided: ${filename}`);
    } else {
        console.log('filename not provided');
    }
});

// also try polling
fs.watchFile('index.js', { interval: 1000 }, (curr, prev) => {
    console.log(`polling detected change. mtime: ${curr.mtime}`);
});
