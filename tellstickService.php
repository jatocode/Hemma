<?php
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
	// TODO: Return useful info, Success/Failure + id
} else if ($cmd == "dim") {
	$devices = json_decode(stripslashes($_POST['devices']));
	$power = $_POST['power'];
	$o = array();
	foreach($devices as $id) {
		$o[] = tdTool("--dim $id --dimlevel $power");
	}
	$r = $o;
} else if ($cmd == "nextstarttime") {
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
	
	$query = $calService->newEventQuery();
	$query->setUser('8d9vj753tdtto51s74ddbvlg3o@group.calendar.google.com');
	$query->setVisibility('public');
	$query->setProjection('full');
	$query->setOrderby('starttime');
	$query->setFutureEvents(true);
	$eventFeed = $calService->getCalendarEventFeed($query);

	$r = array();
	foreach ($eventFeed as $entry) {
    	  $when = $entry->when[0];
    	  $e = new SimpleEntry();
    	  $e->title = $entry->title->text;
    	  $e->startTime = date("Ymd H:i", strtotime($when->startTime));
    	  $e->endTime = date("Ymd H:i", strtotime($when->endTime));
    	  $r[] = $e;
	}
} else if ($cmd == "isrunning") {
	$tag = $_POST['tag'];	
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
	
	$query = $calService->newEventQuery();
	$query->setUser('8d9vj753tdtto51s74ddbvlg3o@group.calendar.google.com');
	$query->setVisibility('public');
	$query->setProjection('full');
	$query->setOrderby('starttime');
	$query->setFutureEvents(true);
	$eventFeed = $calService->getCalendarEventFeed($query);

	foreach ($eventFeed as $entry) {
    	  $when = $entry->when[0];
    	  $e = new SimpleEntry();
       $e->running = false;
    	  $e->title = $entry->title->text;
	  $start = strtotime($when->startTime);
          $end = strtotime($when->endTime);
          $now = time();
		$e->startTime = $start;
    	     $e->endTime = $end;
          if(($now >= $start) && ($now <= $end)) {   
          	$e->running = true;
    	     	$r = $e;
	     	// TODO: Hardcoded id
             	tdTool("--on 2"); 
             break;
          }
	}
     if($e->running == false) {
           $r = $e;
	   // TODO: Hardcoded id
           tdTool("--off 2"); 
     }
}

function tdTool($params) {
  $command = "tdtool" . " " . $params;
  exec($command, $output);
  return $output;
}

print_r(json_encode($r));

class SimpleEntry {
	public $title;
	public $startTime;
	public $endTime;
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
?>

