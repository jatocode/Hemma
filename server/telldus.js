const request = require('request');
const exec = require('child_process').exec;
const fs = require('fs');

exports.turnOnDevices = async function turnOnDevices(ids) {
    for (let id of ids) {
        await this.deviceOn(id);
    }
}

exports.turnOffDevices = async function turnOffDevices(ids) {
    for (let id of ids) {
        await this.deviceOff(id);
    }
}

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

exports.watchTdTool = async function watchTdTool() {
    return new Promise((resolve, reject) => {
        // Load client secrets from a local file.    
        fs.watch('/var/state/telldus-core.conf', (eventType, filename) => {
            console.log(`event type is: ${eventType}`);
            if (filename) {
                console.log(`filename provided: ${filename}`);
            } else {
                console.log('filename not provided');
            }
        });
    });
}