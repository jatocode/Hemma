const mongodb = require('mongodb').MongoClient;

const dburl = 'mongodb://localhost:27017/hemmadb';

exports.createHemmaDB = function createHemmaDB() {
    createmongoDb();
    createCollections();
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
    mongodb.connect(dburl, function(err, db) {
        db.createCollection('config', function(err, res) {
            if(err) throw err;
            db.close();
        });
    });
}

exports.insertGarageStatus = function insertGarageStatus(status) {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;

        db.collection('garagestatus').insertOne(status, function(err, res) {
            if(err) throw err;
            console.log('inserted garagestatus');
            db.close();
        });
    });
}

exports.insertDevice = function insertDevice(device) {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;

        db.collection('device').update({id: device.id}, device, {upsert: true}, function(err, res) {
            if(err) throw err;
            db.close();
        });
    });
}

exports.insertCalendarEvent = function insertCalendarEvent(event) {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;

        db.collection('calendar').update({id: event.id}, event, {upsert: true}, function(err, res) {
            if(err) throw err;
            db.close();
        });
    });
}

exports.insertConfig = function insertConfig(config) {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;

        db.collection('config').update({version:config.version}, config, {upsert: true}, function(err, res) {
            if(err) throw err;
            db.close();
        });
    });
}
    
exports.getAllDevices = async function getAllDevices() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject(err);
            db.collection('device').find({}).toArray(function(err, res) {
                if(err) throw err;
                resolve(res);
            });
        });
    });
}

exports.getAllEvents = async function getAllEvents() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject(err);
            db.collection('calendar').find({}).toArray(function(err, res) {
                if(err) throw err;
                resolve(res);
            });
        });
    });
}

exports.getActiveEvents = async function getActiveEvents() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject(err);
            var now = Date.now();
            db.collection('calendar')
                .find({$and: [{start: { $lte:now}}, {end:{$gte:now}}] }).toArray(function(err, res) {
                    if(err) throw err;
                    resolve(res);
            });
        });
    });
}

//db.calendar.find({$and: [{start: { $gte:1511933300000}}, {end:{$lte:1511939700000}}] })


exports.getEventForId = async function getEventForId(id) {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject(err);
            db.collection('calendar').find({}).toArray(function(err, res) {
                if(err) throw err;
                res.forEach(e => {
                    if(e.location.indexOf(id.toString()) >= 0) { // TODO: Why strings!?
                        resolve(e);
                    }
                });
                resolve({});
            });
        });
    });
}

exports.getGarageStatusHistory = async function getGarageStatusHistory() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject(err);
            db.collection('garagestatus').find({}).toArray(function(err, res) {
                if(err) throw err;
                resolve(res);
            });
        });
    });
}

exports.getDBStatus = async function getDBStatus() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject(err);
            resolve(db.s.databaseName);
        });
    });
}

exports.getLightControlled = async function getLightControlled() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject(err);
            db.collection('config').findOne({}, function(err, res) {
                if(err) throw err;
                resolve(res.light);
            });
        });
    });
}

