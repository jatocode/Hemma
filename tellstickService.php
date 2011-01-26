<?php
header('Content-type: application/json');
define('SETTINGS_FILENAME', "/var/state/hemma.conf");
$cmd = strtolower($_POST['cmd']);
if($cmd == '') {
 // Use GET while testing new stuff
  $cmd = strtolower($_GET['cmd']);
}
if($cmd=="list") {
    $out = tdTool("--list");
	$i = 0;
	$r = new Devices();
	$r->devices = array();
	foreach($out as $line) {
		if($i++ == 0) {
			// First line is number of devices
			$r->numDev = explode(":", $line);
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
} else if ($cmd == "on" || $cmd == "off") {
	$devices = json_decode(stripslashes($_POST['devices']));
	$o = array();
	foreach($devices as $id) {
		$o[] = tdTool("--$cmd $id");
	}
	$r = $o;
} else if ($cmd == "combined") {
	$devicesOn = json_decode(stripslashes($_POST['devicesOn']));
	$devicesOff = json_decode(stripslashes($_POST['devicesOff']));
	$o = array();
	foreach($devicesOff as $id) {
		$o[] = tdTool("--off $id");
	}
	foreach($devicesOn as $id) {
		$o[] = tdTool("--on $id");
	}
	$r = $o;
} else if ($cmd == "dim") {
	$devices = json_decode(stripslashes($_POST['devices']));
	$power = $_POST['power'];
	$o = array();
	foreach($devices as $id) {
		$o[] = tdTool("--dim $id --dimlevel $power");
	}
	$r = $o;
} else if ($cmd == "isrunning") {
	$execute = $_POST['execute'];
	$eventFeed = getNextEvents();
	$rr = array();
	$on = array();
	$off = array();
	// TODO duplicated code for reading settings
	$f = file(SETTINGS_FILENAME, FILE_IGNORE_NEW_LINES);
	if($f != FALSE) {
		$settings = json_decode($f[0]);
		$calcontrolled = explode(",", $settings->cal . "");
		$lightcontrolled = explode(",", $settings->light . "");
		// TODO: Duplicated code
		$upp = date_sunrise(time(), SUNFUNCS_RET_TIMESTAMP, 59.33, 13.50, 94, 1);
		$ner = date_sunset(time(), SUNFUNCS_RET_TIMESTAMP, 59.33, 13.50, 94, 1);
		$now = time();
		$dark = !(($now >= $upp) && ($now <= $ner));
		foreach($lightcontrolled as $u) {
			if((!in_array($u, $on) && $dark)) {
				$on[] = $u;
			} else if(!in_array($u, $off)) {
				$off[] = $u;
			}
		}
	}
	foreach ($eventFeed as $entry) {
		// TODO: idList or groups?
		  $idList = explode(",", $entry->where[0] . "");
		  foreach($idList as $id) {
			  $when = $entry->when[0];
			  $e = new SimpleEntry();
			  $e->running = false;
			  $e->title = $entry->title->text;
			  $e->id = $id;
			  $start = strtotime($when->startTime);
			  $end = strtotime($when->endTime);
			  $e->startTime = $start;
			  $e->endTime = $end;
			  $now = time();
			  if(in_array($id, $calcontrolled)) {	  
				  if(($now >= $start) && ($now <= $end)) {   
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
	$r->test = ($settings->override);
	if(($execute != "no") && ($settings->override=="false")) {		
		foreach($on as $id) {
			$result[] = tdTool("--on $id");	
		}
		foreach($off as $id) {
			$result[] = tdTool("--off $id");	
		}
		$r->execute = "PHP SWITCHED";        
    }
    $r->calcontrolled = $settings;
    $r->list = $rr;
    $r->off = $off;
	$r->on  = $on;
	$r->result = $result;
} else if ($cmd == "sun") {
	$r->up = date_sunrise(time(), SUNFUNCS_RET_STRING, 59.33, 13.50, 94, 1);
	$r->down = date_sunset(time(), SUNFUNCS_RET_STRING, 59.33, 13.50, 94, 1);
	$upp = date_sunrise(time(), SUNFUNCS_RET_TIMESTAMP, 59.33, 13.50, 94, 1);
	$ner = date_sunset(time(), SUNFUNCS_RET_TIMESTAMP, 59.33, 13.50, 94, 1);
	$now = time();
	$r->dark = !(($now >= $upp) && ($now <= $ner));
} else if ($cmd == "settings") {
	$cal = $_POST['cal'];	
	$light = $_POST['light'];	
	$manual = $_POST['manual'];	
	$override = $_POST['override'];	
	
	$f = file(SETTINGS_FILENAME, FILE_IGNORE_NEW_LINES);
 	if($f != FALSE) {
 		$r = json_decode($f[0]);
 	}
	$fh = fopen(SETTINGS_FILENAME, 'w');
	$r->cal = $cal==null?$r->cal:$cal;
	$r->light = $light==null?$r->light:$light;
	$r->manual = $manual==null?$r->manual:$manual;
	$r->override = $override==null?$r->override:$override;
	if($fh != FALSE) {
		$r->write = "OK";
		fwrite($fh, json_encode($r));
		fclose($fh);
	}
} 

function tdTool($params) {
  $command = "tdtool" . " " . $params;
  exec($command, $output);
  return $output;
}
// END of WebService, return json_encoded string
print_r(json_encode($r));

// Helper classes
class SimpleEntry {
	public $title;
    public $id;
	public $startTime;
	public $endTime;
	public $startTimeString;
	public $endTimeString;
	public $running;
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
function createCalendarService() {
	require_once('Zend/Loader.php');  
	$classes = array('Zend_Gdata','Zend_Gdata_Query','Zend_Gdata_ClientLogin','Zend_Gdata_Calendar');  
	foreach($classes as $class) {  
    	    Zend_Loader::loadClass($class);  
	}  
	$calService = Zend_Gdata_Calendar::AUTH_SERVICE_NAME;
	$user = "tobias.jansson@gmail.com";
	$pass = "pio535neer";
	$client = Zend_Gdata_ClientLogin::getHttpClient($user, $pass, $calService);
	$calService = new Zend_Gdata_Calendar($client);	
	
	return $calService;
}

function createCalendarQuery($service) {
	$query = $service->newEventQuery();
	$query->setUser('8d9vj753tdtto51s74ddbvlg3o@group.calendar.google.com');
	$query->setVisibility('public');
	$query->setProjection('full');
	return $query;
}

function getNextEvents() {
	$calService = createCalendarService();
	$query = createCalendarQuery($calService);
	
	$query->setOrderby('starttime');

	// singleEvents till true för att expandera repeterande möten
	$query->setSingleEvents(true);
	$query->setFutureEvents(true);
	$query->setMaxResults(5);	
	$query->setSortOrder(a);
	return $calService->getCalendarEventFeed($query);	
}

?>

