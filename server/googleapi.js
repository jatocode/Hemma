const fs = require('fs');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const readline = require('readline');

// Consts for Google API
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

exports.getGoogleApiAuth = async function getGoogleApiAuth() {
    return new Promise((resolve, reject) => {
        // Load client secrets from a local file.
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                reject(err);
            }
            authorize(JSON.parse(content)).then((auth) => {
                resolve(auth);
            });
        });
    });
}

exports.getEventsFromCalendar = function getEventsFromCalendar() {
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
                }).catch((err) => {
                    console.log('Unable to list events');
                    reject(err);
                });
            });
        });
    });
}


/**
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
    return new Promise((resolve, reject) => {
        var calendar = google.calendar('v3');
        var timemin = new Date();
        var timemax = new Date();
        timemax.setHours(timemax.getHours() + 72); // Prepping!
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
            try {
            response.items.forEach(e => {
                var event = {};
                event.id = e.id;
                event.etag = e.etag.replace(/"/g,'');
                event.summary = e.summary;
                const location = e.location.split(',').filter((e,i,a) => { return parseInt(e); });
                event.location = location;
                event.start = Date.parse(e.start.dateTime);
                event.end = Date.parse(e.end.dateTime);
                events.push(event);
            });
            if (events.length == 0) {
                console.log('No upcoming events found.');
                resolve([]);
            } else {
                resolve(events);
            }
            } catch (err) {
                console.log('Error when reading events ' + err);
                reject(err);
            }
        });
    });
}

exports.findEventForId = function findEventForId(auth, id) {
    return new Promise((resolve, reject) => {
        var calendar = google.calendar('v3');
        var timemin = new Date();
        calendar.events.list({
            auth: auth,
            calendarId: '8d9vj753tdtto51s74ddbvlg3o@group.calendar.google.com',
            timeMin: timemin.toISOString(),
            maxEvents: 50,
            singleEvents: true,
            orderBy: 'startTime'
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                reject(err);
            }
            var events = [];
            response.items.forEach(e => {
                const location = e.location.split(',');
                if(location.indexOf(id.toString()) >= 0) { // TODO: Why strings!?
                    var event = {};
                    event.summary = e.summary;
                    event.location = location;
                    event.start = new Date(Date.parse(e.start.dateTime)).toUTCString();
                    event.end = new Date(Date.parse(e.end.dateTime)).toUTCString();
                    events.push(event);
                }
            });
            if (events.length == 0) {
                console.log('No upcoming events found.');
                resolve([]);
            } else {
                resolve(events[0]);
            }
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
