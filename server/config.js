const fs = require('fs');
const VERSION = 1.0;

exports.readConfig = async function readConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile('/var/state/hemma.conf', function processConfig(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                reject(err);
            }        
            var c = JSON.parse(content);
            c.version = VERSION;
            c.cal = c.cal.split(','); // I fucking hate PHP
            c.light = c.light.split(','); // See above
            resolve(c);
        });
    });
}