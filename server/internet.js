const exec = require('child_process').exec;
const request = require('request');

exports.pingServer = async function pingServer(server) {
    return new Promise((resolve, reject) => {
        exec('ping -c 1 -q ' + server, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            var ip = stdout.match(/\((.*?)\)/);
            resolve(ip[1]);
        });
    });
}

exports.getExternalIp = async function getExternalIp() {
    return new Promise((resolve, reject) => {
        request('http://api.ipify.org?format=json', (err, res, body) => {
            if (err) {
                reject(err);
            }
            resolve(JSON.parse(body).ip);
        });
   });
}
