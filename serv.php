<?php
$id = $_GET['id'];
$cmd = $_GET['cmd'];
if($cmd=="state") {
	exec("tdtool --list", $out);
	$deviceArray = array();
	$i = 0;
	$r = new Devices();
	foreach($out as $line) {
		if($i++ == 0) {
			// First line is number of devices
			$r->numDev = explode(":", $line);
		} else {
			$d = new Device();
			$oo = explode("\t", $line);
			$d->id = $oo[0];
			$d->name = $oo[1];
			$d->state = $oo[2];
			$deviceArray[] = $d;
		}
	}
	$r->devices = $deviceArray;
} else if ($cmd == "on" || $cmd == "off") {
	$run = "tdtool --$cmd $id";
	print_r("$run\n<br/>");
	exec($run, $out);
} else if ($cmd == "dim") {

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

