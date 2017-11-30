const express = require('express');
const suncalc = require('suncalc');
const socket = require('socket.io-client')('http://raspberrypi.local:3000');
const isonline = require('is-online');

// Homerolled
const googleapi = require('./server/googleapi');
const db = require('./server/database');
const net = require('./server/internet');
const telldus = require('./server/telldus');
const garageapi = require('./server/garage');
const config = require('./server/config');

// My consts
const port = 3001;
const refreshTime = 5 * 60;

// Global variables 
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
    telldus.listDevices().then((data) => {
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

app.get('/run/', function (req, res) {
    main().then((data) => {
        res.send(data);
    });
});

server.listen(port);

// Setup DB
db.createHemmaDB();

// Waiting for socket io
socket.on('connect', function () { console.log('socket.io connected'); });
socket.on('status', function (data) {
    // Todo, save new status in DB
    db.insertGarageStatus(data.status.garage);
    console.log(data);
});

var ts = (new Date()).toLocaleString() + "  ";
console.log(ts + 'Starting hemmaserver on port ' + port + '. Refreshing devices every ' + refreshTime + ' seconds');

// Start main loop
main();
setInterval(main, refreshTime * 1000);

async function main() {
    var now = new Date();
    var ts = (new Date()).toLocaleString() + "  ";
    console.log(ts + 'In the future: Turn on/off all devices based on sun and/or calendar');
    lastCheck = now;
    nextCheck = new Date(lastCheck.getTime() + refreshTime * 1000);
    console.log('Checking next time: ' + nextCheck);

    var deviceId = [];
    
    try {
        // Save calendar events to DB
        var events = await googleapi.getEventsFromCalendar();
        events.forEach(e => { 
            db.insertCalendarEvent(e) 
        });

        // Save devices to DB
        var devices = await telldus.listDevices();
        devices.forEach(device => { 
            deviceId.push(parseInt(device.id));
            db.insertDevice(device);
        });

        // And get config
        var conf = await config.readConfig();
        db.insertConfig(conf);

    } catch (err) {
        console.log(err);
    }

    // Let's turn shit on. And off.
    var devicesToOn = [];
    var devicesToOff = [];
    var on = [];
    var off = [];
    try {
        // Calendar events
        const events = await db.getActiveEvents();
        for(let event of events) {
            // TODO. Use Promise.All and get all at once
            for(let id of event.location) {
                try {
                    const device = await db.getDevice(id);
                    if(devicesToOn.indexOf(device.id) == -1) {
                        devicesToOn.push(device.id);
                    }
                } catch (err) {
                    console.log('No device found for id: ' + id);
                }
            }
        }

        // By sun
        const light = getLightTimes();
        const now = Date.now();
        if(now > light.sunset && light.sunrise < now) {
            console.log('Sun is setting on: ' + conf.light);
            devicesToOn = devicesToOn.concat(conf.light);
        }

        devicesOn = devices.filter(function (device, i, array) { return device.state == 'ON'; }).map(d => { return d.id });
        devicesOff = devices.filter(function (device, i, array) { return device.state == 'OFF'; }).map(d => { return d.id });
        
        // And turn off everything else
        devicesToOff = devices.filter((d) => { return !devicesToOn.includes(d.id); }).map(d => { return d.id });

        // Sort to make it pretty
        // TODO Save these to DB for easy status lookups
        devicesOn = devicesOn.sort(compare);        
        devicesOff = devicesOff.sort(compare);        
        devicesToOn = devicesToOn.sort(compare);
        devicesToOff = devicesToOff.sort(compare);
        
        // Actual stuff to change
        on = devicesToOn.filter((d) => { return !devicesOn.includes(d)});
        off = devicesToOff.filter((d) => { return !devicesOff.includes(d)});

        console.log('Turning on: ' + on);
        console.log('Turning off: ' + off);
        
        telldus.turnOnDevices(on);
        telldus.turnOffDevices(off); 
        
    } catch (err) {
        console.log('I had a problem: ' + err);
    }

    return {nextCheck: nextCheck,
            turnedOn: on,
            turnedOff: off,
            devicesOn: devicesOn,
            devicesOff: devicesOff};
}

async function getStatus() {
    var status = {};
    try {
        status.internet = {
            online: (await isonline()) ? 'ok' : 'no internet',
            externalip: await net.getExternalIp()
        };
        status.db = await db.getDBStatus();
        status.servers = {
            nas: await net.pingServer('garagenas.local'),
            garagepi: await net.pingServer('raspberrypi.local'),
            gogs: await net.pingServer('gogs'),
        };
        status.googleapi = ((await googleapi.getGoogleApiAuth()).clientId_) != null ? 'OK' : 'Not auth';
        const garage = JSON.parse(await garageapi.getGarageStatus());
        status.garagedoor = garage.garage;
        status.innerdoor = garage.inner;
        const devices = await db.getAllDevices();
        status.nexa = {
            tdtool: await telldus.getTellstickStatus(),
            numDevice: devices.length,
            motorvarmare: await db.getEventForId(2),
            trappan: await db.getEventForId(19),
            devicesOn: devices.filter(function (device, i, array) { return device.state == 'ON'; }),
            lightControlled : await db.getLightControlled(),
        };
        status.sunrise = getLightTimes().sunrise;
        status.sunset = getLightTimes().sunset;
        var now = new Date();
        status.lastCheck = lastCheck.toISOString();
        status.nextCheck = nextCheck.toISOString();
        status.garageHistory = await db.getGarageStatusHistory();
    } catch (err) {
        console.log(err);
        status.err = err;
    }

    return status;
}

function getLightTimes() {
    var times = suncalc.getTimes(new Date(), 59.33, 13.50);
    return times;
}

function compare(a,b) {
    return a - b;
}