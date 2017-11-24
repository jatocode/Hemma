const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const exec = require('child_process').exec;
const express = require('express');
const suncalc = require('suncalc');
const request = require('request');
const isonline = require('is-online');

const port = 3001;

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

var app = express(),
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
    getEventsFromCalendar().then((data) => {
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
var ts = (new Date()).toLocaleString() + "  ";
console.log(ts + 'Running on port ' + port);

async function getStatus() {
    var status = {};
    try {
        status.internet = (await isonline())?'online':'no internet'; 
        status.googleapi = await getGoogleApiStatus();
        status.tdtool = await getTellstickStatus();
        const devices = await listDevices();        
        status.numDevice = devices.length; 
        status.devicesOn = devices.filter(function(device,i,array) { return device.state == 'ON'; });
        status.devicesUnkown = devices.filter(function(device,i,array) { return device.state != 'OFF' && device.state != 'ON'; });
        status.garage = JSON.parse(await getGarageStatus());
        status.sunrise = getLightTimes().sunrise;
        status.sunset = getLightTimes().sunset;
        status.db = 'not implemented';
        var now = new Date();
        status.lastrun = 'not implemented';
        status.nextcheck = new Date(now.setMinutes(now.getMinutes() + 5)).toUTCString();
    } catch (err) {
        console.log(err);
        status.err = err;
    }

    return status;
}

async function getGoogleApiStatus() {
    return new Promise((resolve, reject) => {
        // Load client secrets from a local file.
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                reject(err);
            }
            authorize(JSON.parse(content)).then((auth) => {
                resolve('OK');
            });
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

function getLightTimes() {
    var times = suncalc.getTimes(new Date(), 59.33, 13.50);
    return times;    
}

function getEventsFromCalendar() {
    return new Promise((resolve, reject) => {
        // Load client secrets from a local file.
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                reject(err);
            }
            //
            // Authorize a client with the loaded credentials, then call the
            // Google Calendar API.
            authorize(JSON.parse(content)).then((auth) => {
                listEvents(auth).then((data) => {
                    resolve(data);
                });
            });
        });
    });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
    return new Promise((resolve, reject) => {
        var calendar = google.calendar('v3');
        var timemin = new Date();
        var timemax = new Date();
        timemax.setHours(timemax.getHours() + 24);
        calendar.events.list({
            auth: auth,
            calendarId: '8d9vj753tdtto51s74ddbvlg3o@group.calendar.google.com',
            timeMin: timemin.toISOString(),
            timeMax: timemax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                reject(err);
            }
            var events = [];
            response.items.forEach(e => {
                var event = {};
                event.summary = e.summary;
                event.location = e.location;
                event.start = new Date(Date.parse(e.start.dateTime)).toUTCString();
                event.end = new Date(Date.parse(e.end.dateTime)).toUTCString();
                events.push(event);
            });
            if (events.length == 0) {
                console.log('No upcoming events found.');
                resolve([]);
            } else {
                resolve(events);
            }
        });
    });
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
                }
            }
            resolve(devices);
        });
    });
}

function authorize(credentials) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;  
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, '');
    return new Promise((resolve,reject) => {
        fs.readFile(TOKEN_PATH, function (err, token) {
            if (err) {
                reject(err);
            } else {
                oauth2Client.credentials = JSON.parse(token);
                resolve(oauth2Client);
            }
        }); 
    });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize2(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
            return;
        } else {
            oauth2Client.credentials = JSON.parse(token);
            return callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}
