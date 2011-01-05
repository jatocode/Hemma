var deviceData;
function finishedLoaded() {
     queryDevices();
     getCalendarEntries();
}

function finishedLoaded() {
     queryDevices();
     getCalendarEntries();
     checkDeviceCalendar("2", "not used");
}

function checkDeviceCalendar(id, tag) {
  var req = new XMLHttpRequest();
  req.open("POST", "tellstickService.php", true);
  var params = 'cmd=isrunning';
  params += "&tag=" + tag;
  req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  req.onreadystatechange = function statesResponse() {
    if(req.readyState == 4) {
      var runningEntry = JSON.parse(req.responseText);
      var txt = document.getElementById("tider");
      if(runningEntry != null) {
         now = (new Date().getTime())/1000; // Javascript is in ms
         minutesLeft = Math.round((runningEntry.endTimestamp - now)/60);
         txt.innerHTML = "<p>" + findDeviceById(id).name + " aktiv i " + minutesLeft + " minuter till</p>";
        turnOn([id]);
      } else {
         txt.innerHTML = "<p> Inget aktivt event</p>";
         turnOff([id]);
      }
    }
  }
  req.send(params);
}

function getCalendarEntries() {
	var req = new XMLHttpRequest();
	req.open("POST", "tellstickService.php", true);
	var params = 'cmd=nextstarttime';
	req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	req.onreadystatechange = function statesResponse() {
		if(req.readyState == 4) {
			entries = JSON.parse(req.responseText);
			var txt = document.getElementById("debug");
			txt.innerHTML = "";
			for(var d in entries) {
				e = entries[d];
		    	txt.innerHTML += "<p>" + e.title + ": " + e.startTime + "->" + e.endTime + "</p>"; 
			}
		}
	}
	req.send(params);
}

function queryDevices() {
	var req = new XMLHttpRequest();
	req.open("POST", "tellstickService.php", true);
	var params = 'cmd=list';
	req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	req.onreadystatechange = function statesResponse() {
		if(req.readyState == 4) {
			deviceData = JSON.parse(req.responseText);
			var e = document.getElementById("enheter");
			e.innerHTML = "";
			for(var d in deviceData.devices) {
		    	// State can be ON/OFF/DIMMED:xx
		    	var checked = (deviceData.devices[d].state).toLowerCase()=="off"?"":"checked";
		    	var id = deviceData.devices[d].id;
  				e.innerHTML += "<li>" + deviceData.devices[d].name +
                    "<span class=\"toggle\">" +
  					"<input name=\"" + id + "\"" + 
  					" type=\"checkbox\"" + checked + 
  					" onClick='flipState(\"" + id + "\");'/>" +
  					"</span></li>";
			}
		
		}
	}
	req.send(params);
}

function flipState(id) {
	var device = findDeviceById(id);
	var newState = ((device.state).toLowerCase()=="off") ? "on" : "off";
	var xhReq = new XMLHttpRequest();
	var req = 'tellstickService.php';
	xhReq.open("POST", req, true);
	var params = 'cmd=' + newState;
	params += '&devices=["' +id + '"]';
	xhReq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhReq.send(params);
	device.state = newState;
}

function dimDevice(id, power) {
	var xhReq = new XMLHttpRequest();
	var req = 'tellstickService.php';
	xhReq.open("POST", req, true);
	var params = 'cmd=dim';
	params += '&devices=["' +id + '"]';
	params += "&power=" + power;
	xhReq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhReq.send(params);
	
	var device = findDeviceById(id);
	device.state = "DIMMER:" + power;
	var chkbox = document.getElementsByName(id)[0];
	chkbox.checked = true;
}

function turnOff(idList) {
	var xhReq = new XMLHttpRequest();
	var req = 'tellstickService.php';
	xhReq.open("POST", req, true);
	var params = 'cmd=off';
	params += '&devices=' + JSON.stringify(idList);
	xhReq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhReq.send(params);
	
	for(var i in idList) {
		var id = idList[i]
		var chkbox = document.getElementsByName(id)[0];
		chkbox.checked = false;
		findDeviceById(id).state = "off";
	}
}

function turnOn(idList) {
	var xhReq = new XMLHttpRequest();
	var req = 'tellstickService.php';
	xhReq.open("POST", req, true);
	var params = 'cmd=on';
	params += '&devices=' + JSON.stringify(idList);
	xhReq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhReq.send(params);
	
	for(var i in idList) {
		var id = idList[i]
		var chkbox = document.getElementsByName(id)[0];
		chkbox.checked = true;
		findDeviceById(id).state = "on";
	}
}

function findDeviceById(id) {
	for(var d in deviceData.devices) {
		if(deviceData.devices[d].id == id) {
			return deviceData.devices[d];
		}
	}
	return -1;
}

function handleError(e) {
  alert(e.cause ? e.cause.statusText : e.message);
}
