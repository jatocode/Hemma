const express = require('express');
const suncalc = require('suncalc');
const socket = require('socket.io-client')('http://raspberrypi.local:3000');
const isonline = require('is-online');
const moment = require('moment');

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
const restartTimer = 8; // Hours

// Global variables 
var lastCheck;
var nextCheck;
var timer;
var force = false;
let waitingForRestart = false;

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

app.get('/device/off/:deviceId', function (req, res) {
    var id = req.params.deviceId;
    telldus.deviceOff(id);
    res.send({off:id});
});

app.get('/device/on/:deviceId', function (req, res) {
    var id = req.params.deviceId;
    telldus.deviceOn(id)
    res.send({on:id});
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
    force = false;
    main().then((data) => {
        res.send(data);
    });
});

app.get('/run/force', function (req, res) {
    force = true;
    main().then((data) => {
        res.send(data);
    });
});


app.get('/timer/off', function (req, res) {
    const restart = restartTimer * 60 * 60 * 1000;
    nextCheck = new Date((new Date()).getTime() + restart); 
    setTimeout(startTimer, restart);
    clearInterval(timer);
    waitingForRestart = true;
    res.send({nextCheck:nextCheck, restart: 'yes', waitingForRestart: waitingForRestart});
});
app.get('/timer/on', function (req, res) {
    startTimer();
    waitingForRestart = false;
    res.send({nextCheck:nextCheck, waitingForRestart: waitingForRestart});
});

server.listen(port);

// Setup DB
db.createHemmaDB();

// Waiting for socket io
socket.on('connect', function () { console.log('socket.io connected'); });
socket.on('status', function (data) {
    // Todo, save new status in DB
    db.insertGarageStatus(data.status.garage);
    //console.log(data);
});

var ts = (new Date()).toLocaleString() + "  ";
console.log(ts + 'Starting hemmaserver on port ' + port + '. Refreshing devices every ' + refreshTime + ' seconds');

// Start main loop
main();
startTimer();

function startTimer() {
    timer = setInterval(main, refreshTime * 1000);    
    nextCheck = new Date((new Date()).getTime() + refreshTime * 1000);    
}

async function main() {
    var now = new Date();
    var ts = (new Date()).toLocaleString() + "  ";
    lastCheck = now;
    nextCheck = new Date(lastCheck.getTime() + refreshTime * 1000);
    console.log('Checking next time: ' + nextCheck);
    console.log('Restarttimer:'  + restartTimer);

    var deviceId = [];
    
    try {
        // Save calendar events to DB
        var events = await googleapi.getEventsFromCalendar();
        //await db.clearCalendarEvents(); // TODO. How to handle changed events
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
        console.error(err);
    }

    // Let's turn shit on. And off.
    var devicesToOn = [];
    var devicesToOff = [];
    var devicesOn = [];
    var devicesOff = [];
    var on = [];
    var off = [];
    try {
        // Calendar events
        const events = await db.getActiveEvents();
        console.log('Number of events from db: ' + events.length);
        for(let event of events) {
            // TODO. Use Promise.All and get all at once
            for(let id of event.location) {
                try {
                    const device = await db.getDevice(id);
                    if(devicesToOn.indexOf(device.id) == -1) {
                        devicesToOn.push(device.id);
                    }
                } catch (err) {
                    console.error('No device found for id: ' + id);
                }
            }
            console.log('Devices from cal: ' + JSON.stringify(devicesToOn));
        }

        // By sun
        const light = getLightTimes();
        const sunset = moment(light.sunset).format('HH:mm');
        const sunrise= moment(light.sunrise).format('HH:mm');
        const now    = moment().format('HH:mm');
        const midnight = '00:00';
        console.log(sunset+', ' + now + ', ' + sunrise);

        // Efter solned eller mellan midnatt och soluppgång? Varför är det här så svårt?
        if((now > sunset ) || (now > midnight && now < sunrise )) {
            console.log('It is fucking dark: ' + conf.light);
            devicesToOn = devicesToOn.concat(conf.light);
        }
        
        if(force == true) {
            console.log('Someone\'s forcing me!');
            devicesOn = [];
        } else {
            devicesOn = devices.filter(function (device, i, array) { return device.state == 'ON'; }).map(d => { return d.id });
        }
        devicesOff = devices.filter(function (device, i, array) { return device.state == 'OFF'; }).map(d => { return d.id });
       
        
        // And turn off everything else
        devicesToOff = devices.filter((d) => { return !devicesToOn.includes(d.id); }).map(d => { return d.id });

        // Sort to make it pretty
        // TODO Save these to DB for easy status lookups
        devicesOn = devicesOn.sort(compare);        
        devicesOff = devicesOff.sort(compare);        
        devicesToOn = devicesToOn.sort(compare);
        devicesToOff = devicesToOff.sort(compare);

        console.log('I want these to be on: ' + JSON.stringify(devicesToOn));
        console.log('I believe these are on: ' + JSON.stringify(devicesOn));
        
        // Actual stuff to change
        on = devicesToOn.filter((d) => { return !devicesOn.includes(d)});
        off = devicesToOff.filter((d) => { return !devicesOff.includes(d)});

        console.log('Turning on: ' + on);
        console.log('Turning off: ' + off);
        
        telldus.turnOnDevices(on);
        telldus.turnOffDevices(off); 
    } catch (err) {
        console.error('I had a problem: ' + err);
    }

    return {nextCheck: nextCheck,
            force:force,
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
            force: force,
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
        status.refreshTime = refreshTime;
        status.restartTimer = restartTimer;
        status.garageHistory = await db.getGarageStatusHistory();
        status.waitingForRestart = waitingForRestart;
    } catch (err) {
        console.error(err);
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
