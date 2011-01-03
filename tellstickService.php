<?php
$cmd = strtolower($_POST['cmd']);
if($cmd=="list") {
	exec("tdtool --list", $out);
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
		$run = "tdtool --$cmd $id";
		exec($run, $o[]);
	}
	$r = $o;
	// TODO: Return useful info, Success/Failure + id
} else if ($cmd == "dim") {
	$devices = json_decode(stripslashes($_POST['devices']));
	$power = $_POST['power'];
	$o = array();
	foreach($devices as $id) {
		$run = "tdtool --dim $id --dimlevel $power";
		// TBD
		//exec($run, $o[]);
		$o[] = $run;
	}
	$r = $o;
} else if ($cmd == "nextStarttime") {
	require_once('Zend/Loader.php');  
	$classes = array('Zend_Gdata','Zend_Gdata_Query','Zend_Gdata_ClientLogin','Zend_Gdata_Calendar');  
	foreach($classes as $class) {  
    	Zend_Loader::loadClass($class);  
	}  
	// TBD
	$service = Zend_Gdata_Calendar::AUTH_SERVICE_NAME;
	$user = "tobias.jansson@gmail.com";
	$pass = "pio535neer";
	$client = Zend_Gdata_ClientLogin::getHttpClient($user, $pass, $service);
	$service = new Zend_Gdata_Calendar($client);
	
	// calendarService = new google.gdata.calendar.CalendarService('motorvarmare-1');
	//$gdata = new Zend_Gdata();
	//$query = New Zend_Gdata_Query("https://www.google.com/calendar/feeds/8d9vj753tdtto51s74ddbvlg3o@group.calendar.google.com/public/full");
	//$query->setMaxResults(10);
	//$feed = $query
	$r = "Not implemented";
}

print_r(json_encode($r));

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

