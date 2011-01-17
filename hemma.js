$SERVICE = "tellstickService.php";

function finishedLoaded() {
	queryDevices();
	
    var cm = $('#calendarlink').bind('click', function() {
    	checkDeviceCalendar("notused", "notused")
    	});
	var ddm = $('#duskdawnlink').bind('click', function() {
		getSun(1)
		});
    var dl = $('#debuglink').bind('click', getCalendarEntries());
    
}


function queryDevices() {
	// Using .ajax to be able to control sync/async or not.
	$.ajax({
		url : $SERVICE,
		data : { "cmd":"list" },
		async: true,  // Sync o make sure we have device-data? Use local storage?
		success: function statesResponse(data) {
			deviceData = data;
			displayGroups();
			//getSun(1);
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
	});
}

function checkDeviceCalendar(id, tag) {
	$.post($SERVICE, { "cmd":"isrunning","id":id, "tag":tag },
		function statesResponse(entry) {
		  if(entry.running == true) {
			 now = (new Date().getTime())/1000; // Javascript is in ms
			 minutesLeft = Math.round((entry.endTime - now)/60);
			 $('.tider').empty().append("<p>" + findDeviceById(id).name + " aktiv i " + minutesLeft + " minuter till</p>");
			 turnOn([id]);
		  } else {
			 $('.tider').empty().append("<p> N‰sta start: " + entry.startTimeString + ", " + findDeviceById(entry.id).name + "</p>");
			 turnOff([id]);
		  }
		});
}

function getCalendarEntries() {
	$.post($SERVICE, { "cmd":"nextstarttime" }, function statesResponse(entries) {	
                $('.kalenderinfo').empty();
		for(var d in entries) {
			e = entries[d];
                    var r = (e.running==true?"on":"off");
                    $('.kalenderinfo').append('<li><small>' + r + '</small>' + e.startTimeString +
                        '<em>' + e.title + '</em></li>');
		}
	});
}

function createGroups() {
	var grupp = new Object();
	grupp.name = "F&ouml;nsterlampor";
	grupp.members = ["1", "4", "5", "6"]; // Motorvärmarnen pga debug
	grupper.push(grupp);
	grupp = new Object();
 	grupp.name = "Utebelysning";
 	grupp.members = ["3"];
 	grupper.push(grupp);
}

function displayGroups() {
	var txt = document.getElementById("grupper");
	txt.innerHTML = "";
	for(var g in grupper) {
		name = grupper[g].name;
		idList = grupper[g].members;
		checked=groupState(g)=="on"?"checked":"";
		newState = checked =="checked"?"off":"on";
		grupper[g].state = groupState(g);
		txt.innerHTML += "<li>" + name + "<span class=\"toggle\">" + 
			"<input name=" + name + " " + checked + " type=\"checkbox\"" +
			"onclick=\'flipGroupState(" + g + ");\'>" +
			"</span>" + 
			"</li>";
	}
}

// Any device is on -> whole group is on
function groupState(groupId) {
	 for(var i in idList) {
	 	device = findDeviceById(idList[i]);
 		if(device.state.toLowerCase() == "on") {
 			return "on";
 		}
 	}
 	return "off";
}

function flipGroupState(groupId) {
	newState = grupper[groupId].state =="on"?"off":"on";	
	fixedState(newState, grupper[groupId].members);
	grupper[groupId].state = newState;
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

function getSun(groupId) {
	$.post($SERVICE, { "cmd":"sun" }, function sunResponse(tider) {	
		var solen = document.getElementById("solen");
		solen.innerHTML = "";
		solen.innerHTML += "<li>Upp:" + tider.up + "</li>";
		solen.innerHTML += "<li>Ner:" + tider.down + "</li>";
		solen.innerHTML += "<li>M&ouml;rkt ute:" + tider.dark + "</li>";
		
		if(tider.dark == true) {
			fixedState("on", grupper[groupId].members);
			$('.ljusenheter').empty().append("<p> Turning group " + groupId + 
				" on until " + tider.up + "</p>");
		}
	});
}

function getLocation() {
    jQT.updateLocation(function(coords){
        locationTxt = 'Latitude: ' + coords.latitude + '<br />Longitude: ' + coords.longitude;
        $('.plats').empty().append(locationTxt);
    });
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
