var calendarService;
var deviceData = null;
var feedUrl = "https://www.google.com/calendar/feeds/8d9vj753tdtto51s74ddbvlg3o@group.calendar.google.com/public/full";

function finishedLoaded() {
     setupCalendarService();
     calendarService.getEventsFeed(feedUrl, handleCalendarFeed, handleError);
     queryDevices();
}

function setupCalendarService() {
	calendarService = new google.gdata.calendar.CalendarService('motorvarmare-1');
}

function handleCalendarFeed(result) {
    var entries = result.feed.entry;
    var txt = document.getElementById("u");
    txt.innerHTML = "<p>";
    for(var i in entries) {
       var eventEntry = entries[i];
       var eventTitle = eventEntry.getTitle().getText();
       var eventTimes = eventEntry.getTimes();

       var startTime = eventTimes[0].getStartTime().getDate();
       var endTime = eventTimes[0].getEndTime().getDate();
       var startString = startTime.getHours() + ":" + startTime.getMinutes();
       var endString = endTime.getHours() + ":" + endTime.getMinutes();
       var day = startTime.getDay();

       txt.innerHTML += "<p>" + eventTitle + ": " + startString + "->" + endString + "," + day + "</p>"; 
    }    
    txt.innerHTML += "</p>";
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
			for(var d in deviceData.devices) {
		    	// State can be ON/OFF/DIMMED:xx
		    	var checked = (deviceData.devices[d].state).toLowerCase()=="off"?"":"checked";
		    	var id = deviceData.devices[d].id;
  				e.innerHTML += "<li>" + deviceData.devices[d].name +
                                        "<span class=\"toggle\">" +
  					"<input name=\"" + id + "\"" + 
  					" type=\"checkbox\"" + checked + " onClick='flipState(\"" + id + "\");'/>" +
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