<?php
$id = $_GET['id'];
$cmd = $_GET['cmd'];
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
	$run = "tdtool --$cmd $id";
	print_r("$run\n<br/>");
	exec($run, $out);
	// TODO: Return useful info, Success/Failure + id
} else if ($cmd == "dim") {
	// Not implemented
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

