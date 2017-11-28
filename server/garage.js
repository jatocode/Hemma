const request = require('request');

exports.getGarageStatus = async function getGarageStatus() {
    return new Promise((resolve, reject) => {
        request('http://raspberrypi.local:3000/status', (err, res, body) => {
            if (err) {
                reject(err);
            }
            resolve(body);
        });
   });
}
