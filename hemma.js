$SERVICE = "tellstickService.php";
var deviceData;

function finishedLoaded() {
     queryDevices();
     getCalendarEntries();
     checkDeviceCalendar("2", "not used");
}

function checkDeviceCalendar(id, tag) {
	$.post($SERVICE, { "cmd":"isrunning","id":id, "tag":tag },
		function statesResponse(entry) {
		  var txt = document.getElementById("tider");
		  if(entry.running == true) {
			 now = (new Date().getTime())/1000; // Javascript is in ms
			 minutesLeft = Math.round((entry.endTime - now)/60);
			 txt.innerHTML = "<p>" + findDeviceById(id).name + " aktiv i " + minutesLeft + " minuter till</p>";
			 turnOn([id]);
		  } else {
			 txt.innerHTML = "<p> Nästa start: " + entry.startTimeString + ", " + findDeviceById(entry.id).name + "</p>";
			 turnOff([id]);
		  }
		});
}

function getCalendarEntries() {
	$.post($SERVICE, { "cmd":"nextstarttime" }, function statesResponse(entries) {	
		var txt = document.getElementById("debug");
		txt.innerHTML = "";
		for(var d in entries) {
			e = entries[d];
			txt.innerHTML += "<p>" + e.title + ": " + e.startTime + "->" + e.endTime + "</p>"; 
		}
	});
}

function queryDevices() {
	$.post($SERVICE, { "cmd":"list" }, function statesResponse(data) {
		deviceData = data;
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
	});
}

function flipState(id) {
	var device = findDeviceById(id);
	var newState = ((device.state).toLowerCase()=="off") ? "on" : "off";
	$.post($SERVICE, { "cmd":newState, "devices":"[" + id + "]" },
		function flipResponse(data) {
			// TODO: Checkbox?
			device.state = newState;
		});
}

function dimDevice(id, power) {	
	$.post($SERVICE, { "cmd":"dim", "devices":"[" + id + "]", "power":power },
		function dimResponse(data) {;
			var device = findDeviceById(id);
			device.state = "DIMMER:" + power;
			var chkbox = document.getElementsByName(id)[0];
			chkbox.checked = true;
		});
}

function fixedState(state, idList) {
	$.post($SERVICE, { "cmd":state, "devices": JSON.stringify(idList)  });
	for(var i in idList) {
		var id = idList[i]
		var chkbox = document.getElementsByName(id)[0];
		chkbox.checked = state=="on"?true:false;
		findDeviceById(id).state = state;
	}	
}

function turnOff(idList) {
	fixedState("off", idList);
}

function turnOn(idList) {
	fixedState("on", idList);
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
