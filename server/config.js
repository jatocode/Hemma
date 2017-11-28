const fs = require('fs');

exports.readConfig = async function readConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile('/var/state/hemma.conf', function processConfig(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                reject(err);
            }        
            var c = JSON.parse(content);
            c.cal = c.cal.split(','); // I fucking hate PHP
            c.light = c.light.split(','); // See above
            resolve(c);
        });
    });
}