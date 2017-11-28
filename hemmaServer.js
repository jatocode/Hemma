const exec = require('child_process').exec;
const express = require('express');
const suncalc = require('suncalc');
const request = require('request');
const isonline = require('is-online');
const mongodb = require('mongodb').MongoClient;
const socket = require('socket.io-client')('http://raspberrypi.local:3000');
const googleapi = require('./serverlogic/googleapi');

// My consts
const dburl = 'mongodb://localhost:27017/hemmadb';
const port = 3001;
const refreshTime = 5*60;

// Global variables 
var mainTimer;
var lastCheck;
var nextCheck;

// Create App
const app = express(),
    server = require('http').createServer(app);

app.all('/*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

app.get('/device/', function (req, res) {
    listDevices().then((data) => {
        res.send(data);
    });
});

app.get('/calendar/', function (req, res) {
    googleapi.getEventsFromCalendar().then((data) => {
        res.send(data);
    });
});

app.get('/light/', function (req, res) {
    res.send(getLightTimes());
});

app.get('/status/', function (req, res) {
    getStatus().then((data) => {
        res.send(data);
    });
});

server.listen(port);

// Playing with DB
createmongoDb();
createCollections();

// Waiting for socket io
socket.on('connect', function () { console.log('socket.io connected'); });
socket.on('event', function (data) {
    // Todo, save new status in DB
    insertGarageStatus({garage: 'socketio', since: new Date()});
    console.log(data);
});

var ts = (new Date()).toLocaleString() + "  ";
console.log(ts + 'Starting hemmaserver on port ' + port + '. Refreshing devices every ' + refreshTime + ' seconds');

// Start main loop
main();
mainTimer = setInterval(main, refreshTime * 1000);

function main() {
    var now = new Date();
    var ts = (new Date()).toLocaleString() + "  ";
    console.log(ts + 'In the future: Turn on/off all devices based on sun and/or calendar');
    lastCheck = now;
    nextCheck = new Date(lastCheck.getTime() + refreshTime * 1000);
    console.log('Checking next time: ' + nextCheck);

    // Save calendar events to DB
    googleapi.getEventsFromCalendar().then((data) => {
        data.forEach(e => {
            insertCalendarEvent(e);
        });
    });
}

function createmongoDb() {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;
        db.close();
    });
}

function createCollections() {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;
        db.createCollection('garagestatus', function(err, res) {
            if(err) throw err;
            db.close();
        });
    });
    mongodb.connect(dburl, function(err, db) {
        db.createCollection('device', function(err, res) {
            if(err) throw err;
            db.close();
        });
    });
    mongodb.connect(dburl, function(err, db) {
        db.createCollection('calendar', function(err, res) {
            if(err) throw err;
            db.close();
        });
    });
}

function insertGarageStatus(status) {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;

        db.collection('garagestatus').insertOne(status, function(err, res) {
            if(err) throw err;
            console.log('inserted garagestatus');
            db.close();
        });
    });
}

function insertDevice(device) {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;

        db.collection('device').update({id: device.id}, device, {upsert: true}, function(err, res) {
            if(err) throw err;
            console.log('inserted device ' + device.id);
            db.close();
        });
    });
}

function insertCalendarEvent(event) {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;

        db.collection('calendar').update({etag: event.etag}, event, {upsert: true}, function(err, res) {
            if(err) throw err;
            console.log('inserted event ' + event.etag);
            db.close();
        });
    });
}

async function getGarageStatusHistory() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject('error');
            db.collection('garagestatus').find({}).toArray(function(err, res) {
                if(err) throw err;
                resolve(res);
            });
        });
    });
}

async function getDBStatus() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject('error');
            resolve(db.s.databaseName);
        });
    });
}

async function getStatus() {
    var status = {};
    try {
        status.internet = {
                online: (await isonline())?'ok':'no internet',
                externalip: await getExternalIp()
        };
        status.db = await getDBStatus();
        status.servers = {
            nas : await pingServer('garagenas.local'),
            garagepi: await pingServer('raspberrypi.local'),
            gogs: await pingServer('gogs'),
        };
        status.googleapi = ((await googleapi.getGoogleApiAuth()).clientId_) != null?'OK':'Not auth';
        const garage = JSON.parse(await getGarageStatus());
        status.garagedoor = garage.garage;
        status.innerdoor = garage.inner;
        const devices = await listDevices();        
        status.nexa = {
            tdtool : await getTellstickStatus(),
            numDevice : devices.length,
            motorvarmare : await googleapi.findEventForId(await googleapi.getGoogleApiAuth(), 2),
            trappan : await googleapi.findEventForId(await googleapi.getGoogleApiAuth(), 19),
            devicesOn : devices.filter(function(device,i,array) { return device.state == 'ON'; }),
            devicesUnkown : devices.filter(function(device,i,array) { return device.state != 'OFF' && device.state != 'ON'; })
        };
        status.sunrise = getLightTimes().sunrise;
        status.sunset = getLightTimes().sunset;
        var now = new Date();
        status.lastcheck = lastCheck.toISOString();
        status.nextcheck = nextCheck.toISOString();
        status.dbtest = await getGarageStatusHistory();
    } catch (err) {
        console.log(err);
        status.err = err;
    }

    return status;
}

async function pingServer(server) {
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

async function getTellstickStatus() {
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

async function getGarageStatus() {
    return new Promise((resolve, reject) => {
        request('http://raspberrypi.local:3000/status', (err, res, body) => {
            if (err) {
                reject(err);
            }
            resolve(body);
        });
   });
}

async function getExternalIp() {
    return new Promise((resolve, reject) => {
        request('http://api.ipify.org?format=json', (err, res, body) => {
            if (err) {
                reject(err);
            }
            resolve(JSON.parse(body).ip);
        });
   });
}

function getLightTimes() {
    var times = suncalc.getTimes(new Date(), 59.33, 13.50);
    return times;    
}

function listDevices() {
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
                    insertDevice(device);
                }
            }
            resolve(devices);
        });
    });
}