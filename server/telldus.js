const request = require('request');
const exec = require('child_process').exec;

exports.deviceOn = async function deviceOn(id) {
    return new Promise((resolve, reject) => {
        exec('tdtool --on ' + id, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(null);
            }
            resolve(id);
        });
    });
}

exports.deviceOff = async function deviceOff(id) {
    return new Promise((resolve, reject) => {
        exec('tdtool --off ' + id, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(null);
            }
            resolve(id);
        });
    });
}

exports.getTellstickStatus = async function getTellstickStatus() {
    return new Promise((resolve, reject) => {
        exec('which tdtool', (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            resolve(stdout.trim());
        });
    });
}

exports.listDevices = async function listDevices() {
    return new Promise((resolve, reject) => {
        exec('tdtool --list', (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            var lines = stdout.split('\n');
            var devices = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].split('\t');
                if (line.length > 1) {
                    var device = {
                        id: line[0],
                        name: line[1],
                        state: line[2]
                    };
                    devices.push(device);
                }
            }
            resolve(devices);
        });
    });
}