<?php
header('Content-type: application/json');
define('SETTINGS_FILENAME', "/var/state/hemma.conf");
define('GOOGLE_SETTINGS_FILENAME', "/var/state/hemma-google.conf");
$cmd = strtolower($_POST['cmd']);
if($cmd == '') {
 // Use GET while testing new stuff and for cronjob
  $cmd = strtolower($_GET['cmd']);
}
$settings = getSettings();
switch($cmd) {
    case "list":
        $r=listDevices();
        break;
    case "on":
    case "off":
        $r=setDeviceState($cmd, json_decode(stripslashes($_POST['devices'])), 
            $settings->retries);
        break;
    case "dim":
        $r=dimDevice(json_decode(stripslashes($_POST['devices']), $_POST['power']));
        break;
    case "combined":
        $r = combined(json_decode(stripslashes($_POST['devicesOn'])),
            json_decode(stripslashes($_POST['devicesOff'])), $settings->retries);
        break;
    case "isrunning":
        $r = controlDevices($_POST['execute']);
        break;
    case "settings":
        $r = getSettings();
        break;
    case "sun":
        $r = getSun();
        break;
    default:
        $r = "unsupported function";
}

// END of WebService, return json_encoded string
print_r(json_encode($r));

// Check which devices that should be active according to settings
// Execute change if execute flag is NOT explicitly set.
function controlDevices($execute) {
    $eventFeed = getNextEvents();
    $rr = array();
    $on = array();
    $off = array();
    $settings = getSettings();
    $sun = getSun();
    $calcontrolled = explode(",", $settings->cal . "");
    $lightcontrolled = explode(",", $settings->light . "");
    // Add all units controlled by light
    foreach($lightcontrolled as $u) {
        $e = new SimpleEntry();
        $e->type = "l";
        $e->title = "Dusk till dawn";
        $e->id = $u;
        $e->startTime = $sun->nerTS;
        $e->endTime = $sun->uppTS;
        $e->startTimeString = $sun->down;
        $e->endTimeString = $sun->up;
        if((!in_array($u, $on) && $sun->dark)) {
            $on[] = $u;
            $e->running = true;
        } else if(!in_array($u, $off)) {
            $off[] = $u;
            $e->running = false;
        }
        $rr[] = $e;
    }
    // Add units controlled by calendar
    foreach ($eventFeed as $entry) {
        // TODO: idList or groups?
        $idList = explode(",", $entry->where[0] . "");
        foreach($idList as $id) {
            $when = $entry->when[0];
            $e = new SimpleEntry();
            $e->running = false;
            $e->type = "c";
            $e->title = $entry->title->text;
            $e->content = $entry->content->text;
            $e->conditional = checkConditions($e->content);;
            $e->id = $id;
            $start = strtotime($when->startTime);
            $end = strtotime($when->endTime);
            $e->startTime = $start;
            $e->endTime = $end;
            $now = time();
            if(in_array($id, $calcontrolled)) {     
                if(($now >= $start) && ($now <= $end) && ($e->conditional)) {   
                    $e->running = true;
                    if(!in_array($id, $on)) {
                        $on[] = $id;
                    }
                } else  {
                    // Future events will not affect running.
                    if( (!in_array($id, $on)) && (!in_array($id, $off))) {
                        $off[] = $id;
                    }
                }
            }
            $e->startTimeString = date("Ymd, H:i", $start);
            $e->endTimeString = date("Ymd, H:i", $end);
            $rr[] = $e;
        }
    }
    if(($execute != "no") && ($settings->override=="false")) {              
        foreach($on as $id) {
            $result[] = tdTool("--on $id", $settings->retries);       
        }
        foreach($off as $id) {
            $result[] = tdTool("--off $id", $settings->retries);      
        }
        $r->execute = "PHP SWITCHED";        
    }
    $r->off = $off;
    $r->on  = $on;
    $r->settings = $settings;
    $r->list = $rr;
    //      $r->result = $result;
    return $r;
}

function checkConditions($content) {
    if (preg_match("/Villkor:(.*)/", $e->content, $matches)) {
        $condition = trim($matches[1]);
        switch($condition) {
            case "ljus":
                if(!$sun->dark) {
                    return false;
                }
            break;
            default:
            break;
        }
    }
    return true;
}

// Find all devices in system
function listDevices() {
    $out = tdTool("--list", 1);
    $i = 0;
    $r = new Devices();
    $r->devices = array();
    foreach($out as $line) {
        if($i++ == 0) {
            // First line is number of devices
            $a = explode(":", $line);
            $r->numDev = $a[1];            
        } else {
            $d = new Device();
            $oo = explode("\t", $line);
            $d->id = $oo[0];
            $d->name = $oo[1];
            // State can be ON/OFF/DIMMED:xx
            $d->state = $oo[2];
            $r->devices[] = $d;
        }
    }
    return $r;
}

// Turn on or off specified list of devices
function setDeviceState($cmd, $devices, $retries) {
    $o = array();
    foreach($devices as $id) {
        $o[] = tdTool("--$cmd $id", $retries);
    }
    $r->result = $o;
    $r->retries = $retries;
    return $r;
}

// Multiple comands on multiple devices
function combined($onList, $offList, $retries) {
    $o = array();
    foreach($offList as $id) {
        $o[] = tdTool("--off $id", $retries);
    }
    foreach($onList as $id) {
        $o[] = tdTool("--on $id", $retries);
    }
    $r->result = $o;
    $r->retries = $retries;
    return $r;
}

function getSettings() {
    $cal = $_POST['cal'];   
    $light = $_POST['light'];       
    $manual = $_POST['manual'];     
    $override = $_POST['override']; 
    $retries = $_POST['retries']; 

    $f = file(SETTINGS_FILENAME, FILE_IGNORE_NEW_LINES);
    if($f != FALSE) {
        $r = json_decode($f[0]);
    }
    $fh = fopen(SETTINGS_FILENAME, 'w');
    $r->cal = $cal==null?$r->cal:$cal;
    $r->light = $light==null?$r->light:$light;
    $r->manual = $manual==null?$r->manual:$manual;
    $r->override = $override==null?$r->override:$override;
    $r->retries = $retries==null?$r->retries:$retries;
    if($fh != FALSE) {
        fwrite($fh, json_encode($r));
        fwrite($fh, "\n"); // For human readability
        fclose($fh);
    } else {
        $r->write = "write FAIL";
    }
    return $r;
}

function getGoogleSettings() {
    $f = file(GOOGLE_SETTINGS_FILENAME);
    if($f != FALSE) {
        $g->user = $f[0]; // Row 1: Username
        $g->pass = $f[1]; // Row 2: passwd
        $g->calendar = $f[2]; // Row 3: calendar address
    }
    return $g;
}

function dimDevice($devices, $power) {
    $o = array();
    foreach($devices as $id) {
        $o[] = tdTool("--dim $id --dimlevel $power", 1);
    }
    return $o;
}

function getSun() {
    $r->up = date_sunrise(time(), SUNFUNCS_RET_STRING, 59.33, 13.50, 94, 1);
    $r->down = date_sunset(time(), SUNFUNCS_RET_STRING, 59.33, 13.50, 94, 1);
    $upp = date_sunrise(time(), SUNFUNCS_RET_TIMESTAMP, 59.33, 13.50, 94, 1);
    $ner = date_sunset(time(), SUNFUNCS_RET_TIMESTAMP, 59.33, 13.50, 94, 1);
    $r->uppTS = $upp;
    $r->nerTS = $ner;
    $now = time();
    $r->dark = !(($now >= $upp) && ($now <= $ner));
    return $r;
}

function tdTool($params, $retries) {
    $command = "tdtool" . " " . $params;
    for($i=0;$i<$retries;$i++) {
        $output = null;
        exec($command, $output);
    }
    return $output;
}

// Helper classes
class SimpleEntry {
    public $title;
    public $id;
    public $startTime;
    public $endTime;
    public $startTimeString;
    public $endTimeString;
    public $running;
    public $type;
}

class Devices {
    public $numDev;
    public $devices;
}
class Device {
    public $id;
    public $name;
    public $state;
}

// Calendar helper functions
function createCalendarService($user, $pass) {
    require_once('Zend/Loader.php');  
    $classes = array('Zend_Gdata','Zend_Gdata_Query','Zend_Gdata_ClientLogin','Zend_Gdata_Calendar');  
    foreach($classes as $class) {  
        Zend_Loader::loadClass($class);  
    }  
    $calService = Zend_Gdata_Calendar::AUTH_SERVICE_NAME;
    $client = Zend_Gdata_ClientLogin::getHttpClient($user, $pass, $calService);
    $calService = new Zend_Gdata_Calendar($client); 

    return $calService;
}

function createCalendarQuery($service, $calendar) {
    $query = $service->newEventQuery();
    $query->setUser($calendar);
    $query->setVisibility('public');
    $query->setProjection('full');
    return $query;
}

function getNextEvents() {
    $google = getGoogleSettings();
    $calService = createCalendarService(trim($google->user), trim($google->pass));
    $query = createCalendarQuery($calService, trim($google->calendar));

    $query->setOrderby('starttime');

    // singleEvents till true för att expandera repeterande möten
    $query->setSingleEvents(true);
    $query->setFutureEvents(true);
    $query->setMaxResults(5);       
    $query->setSortOrder(a);
    return $calService->getCalendarEventFeed($query);       
}

?>

