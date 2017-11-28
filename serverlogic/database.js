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
            console.log('inserted device ' + device.id);
            db.close();
        });
    });
}

exports.insertCalendarEvent = function insertCalendarEvent(event) {
    mongodb.connect(dburl, function(err, db) {
        if(err) throw err;

        db.collection('calendar').update({etag: event.etag}, event, {upsert: true}, function(err, res) {
            if(err) throw err;
            console.log('inserted event ' + event.etag);
            db.close();
        });
    });
}

exports.getGarageStatusHistory = async function getGarageStatusHistory() {
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

exports.getDBStatus = async function getDBStatus() {
    return new Promise((resolve, reject) => {
        mongodb.connect(dburl, function(err, db) {
            if(err) reject('error');
            resolve(db.s.databaseName);
        });
    });
}
