const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const oldColor = /#f490b1/gi;
const newColor = '#db2777'; // pink-600, un rosa mucho más fuerte e intenso

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(srcDir, function(filePath) {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (oldColor.test(content)) {
            let updated = content.replace(oldColor, newColor);
            fs.writeFileSync(filePath, updated, 'utf8');
            console.log('Updated: ' + filePath);
        }
    }
});
