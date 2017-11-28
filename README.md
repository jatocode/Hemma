# iPhone optimized control for tellStick

Uses a html/ajax frontend and a PHP backend for the actual work

## Client side
* index.html
* hemma.js
* css/hemma.css
* hemma.manifest
* flat.html

## Server side
* tellstickService.php
* hemma.conf (settings from client). JSON format
* hemma-google.conf (google user/passwd and address to calendar). Line-based
* hemmaServer.js (Ongoing replacement for tellstickService.php)

## TODO
* Make refreshTime configurable
* Configurable list of light-devices
* Fallback to DB-list of events if net timeout
* /api for setting state of a single device
* /api for reporting state of a single device
* /api for getting last garagestate
* /api for getting full garagestate history
* 

