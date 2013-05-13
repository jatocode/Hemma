$SERVICE = "tellstickService.php";

function finishedLoaded() {
    // Fetch list of devices at startup
    deviceData = JSON.parse(localStorage.getItem('deviceData'));
    if(deviceData != null) {
        displayUnits();
        displayGroups();
    }
    displayAutomaticEvents();

    $('#unitslink').tap(function() {
            queryDevices();
            });

    $('#calendarlink').tap(function() {
            getCalendarEntries();
            });

    $('#duskdawnlink').tap(function() {
            getSun(1)
            });

    $('#debuglink').tap(function(){
            getSun(1);
            });

    $('#settingslink').tap(function(){
            getSettings()
            });

    $("#settings").change(function(){
            updateSettings();
            });

    $("#editgroups").change(function(){
            gr = new Array();
            $(this).find(':input').each(function(i) {
                var g = {};
                g.name = this.name;
                g.members = this.value;
                gr.push(g);
                });
            updateGroups(gr);
            });

    $('#startsida').live('swipe', function(event, info){ 
            if(info.direction == "left") {
                jQT.goTo($('#units'), 'slide'); 
            } else if(info.direction == "right") {
                //jQT.goTo($('#testsida'), 'slide');
                //getSun(1);
                //getCalendarEntries();
            }
        }); 

    $('#startsida').ajaxError(function() {
        alert("Ajax request failed");
        });

    // iOS6 Cache workaround
    $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
            // you can use originalOptions.type || options.type to restrict specific type of requests
                options.data = jQuery.param($.extend(originalOptions.data||{}, { 
                          timeStamp: new Date().getTime()
                              }));
    });
}


function queryDevices() {
    // Using .ajax to be able to control sync/async or not.
    $.ajax({
        url : $SERVICE,
        data : { "cmd":"list" },
        type: "POST",
        async: true,  // Sync o make sure we have device-data? Use local storage?
        success: function statesResponse(data) {
            localStorage.setItem('deviceData', JSON.stringify(data)); 
            deviceData = data;
            displayUnits();
            displayGroups();
        }
    });
}

function displayUnits() {
    $('.enheter').empty();
    for(var d in deviceData.devices) {
        var device = deviceData.devices[d];
        // State can be ON/OFF/DIMMED:xx
        var checked = (device.state).toLowerCase()=="off"?"":"checked";
        var id = deviceData.devices[d].id;
        $('.enheter').append("<li>" +'<span class="unitid">' + id +
            "</span>&nbsp;" +
            device.name +
            "<span class=\"toggle\">" +
            "<input name=\"" + id + "\"" + 
            " type=\"checkbox\"" + checked + 
            " onClick='flipState(\"" + id + "\");'/>" +
            "</span></li>");
    }
}

function checkDeviceCalendar() {
    $.post($SERVICE, { "cmd":"isrunning","execute":"no" },
        function statesResponse(entries) {
            entry = entries.list[0];
            id = entry.id;
            if(entry.running == true) {
                now = (new Date().getTime())/1000; // Javascript is in ms
                minutesLeft = Math.round((entry.endTime - now)/60);
                $('.tider').empty().append("<p>" + findDeviceById(id).name + 
                    " aktiv i " + minutesLeft + " minuter till</p>");
                turnOn([id]);
            } else {
                 $('.tider').empty().append("<p> N�sta start: " +
                    entry.startTimeString + ", " + 
                    findDeviceById(entry.id).name + "</p>");
                 turnOff([id]);
            }
    });
}

function getCalendarEntries() {
    $.post($SERVICE, { "cmd":"isrunning", "execute":"no" }, 
        function statesResponse(entries) {      
            // First draw the array for a quick response
            localStorage.setItem('automatic', JSON.stringify(entries));
            displayAutomaticEvents();
            // Talk to the hardware
            o = $("#override").is(':checked');
            if(o == false) {
                sendCombined(entries.on, entries.off);
            }
    });
}

function displayAutomaticEvents() {
    entries = JSON.parse(localStorage.getItem('automatic'));
    if(entries == null) {
        return;
    }
    $('.kalenderinfo').empty();
    for(var d in entries.list) {
        var r ="";
        e = entries.list[d];
        startTime = new Date();
        startTime.setTime(e.startTime * 1000);
        endTime = new Date();
        endTime.setTime(e.endTime * 1000);
        
        if(e.running==true) {
            r='<img src="img/icon_lightbulb48.jpg" width="20" height="20" alt="on"/>';
            if(e.type == "l") {
                r+='<img src="img/sun_icon.png" width="20" height="20" alt="sun"/>';
            } else if(e.type == "c") {
                r+='<img src="img/cal_icon.gif" width="20" height="20" alt="cal"/>';
            }
        }

        startTimeString = dateFormatter(startTime, "dd/m hh:nn");
        endTimeString = dateFormatter(endTime, "hh:nn");

        $('.kalenderinfo').append('<li><small>' + r + '</small>' + 
            findDeviceById(e.id).name + 
            '<br/><em>&nbsp;' + startTimeString + "->" + 
            endTimeString + '</em></li>');
    }
}

function createGroups() {
    var grupp = new Object();
    grupp.name = "F&ouml;nsterlampor";
    grupp.members = ["1", "6"]; 
    grupper.push(grupp);
    grupp = new Object();
    grupp.name = "Utebelysning";
    grupp.members = ["3"];
    grupper.push(grupp);
    grupp = new Object();
    grupp.name = "Myslys";
    grupp.members = ["4", "5"]; 
    grupper.push(grupp);
}

function displayGroups() {
        var txt = document.getElementById("grupper");
        txt.innerHTML = "";
        $('.gruppinfo').empty();
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
           // Grupp 1: <input type="text" name="Grupp 1" placeholder="1,2" id="grupp1">
                $('.gruppinfo').append('<li>' + name + '<input type="text" name="' + name + '" ' +
                        'value="' + idList + '" id="' + name + '"></li>');
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
        var device = findDeviceById(id);
        var chkbox = document.getElementsByName(device.id)[0];
        chkbox.checked = state=="on"?true:false;
        device.state = state;
    }       
}

function sendCombined(onList, offList) {
    $.post($SERVICE, { "cmd":"combined", 
            "devicesOn": JSON.stringify(onList), 
            "devicesOff":JSON.stringify(offList)  });
    for(var i in onList) {
        id = onList[i]
            device = findDeviceById(id);
        chkbox = document.getElementsByName(device.id)[0];
        chkbox.checked = true;
        device.state = "on";
    }       
    for(var i in offList) {
        id = offList[i]
            device = findDeviceById(id);
        chkbox = document.getElementsByName(device.id)[0];
        chkbox.checked = false;
        device.state = "off";
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

function updateGroups(groups) {
    $.post($SERVICE, { "cmd":"groups",
            "groups":JSON.stringify(groups)}, 
            function(settings) {    
    });     
}
function getSettings() {
    $.post($SERVICE, { "cmd":"settings" }, function(settings) {     
            $('#calstyrda').val(settings.cal);
            $('#ljusstyrda').val(settings.light);
            $('#manuelltstyrda').val(settings.manual);
            $('#retries').val(settings.retries);
            var override = (settings.override == "true");
            $("#override").prop("checked", override);
    });
}

function updateSettings() {
    var cal = $('#calstyrda').val();
    var light = $('#ljusstyrda').val();
    var manual = $('#manuelltstyrda').val();
    var retries = $('#retries').val();
    var override = $("#override").is(':checked');
    $.post($SERVICE, { "cmd":"settings",
            "cal":cal,
            "light":light,
            "manual":manual,
            "override":override,
            "retries":retries
            }, function(settings) { 
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

function dateFormatter(formatDate, formatString) {
        if(formatDate instanceof Date) {
                var months = new Array("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec");
                var yyyy = formatDate.getFullYear();
                var yy = yyyy.toString().substring(2);
                var m = formatDate.getMonth() + 1;
                var mm = m < 10 ? "0" + m : m;
                var mmm = months[m-1];
                var d = formatDate.getDate();
                var dd = d < 10 ? "0" + d : d;
                
                var h = formatDate.getHours();
                var hh = h < 10 ? "0" + h : h;
                var n = formatDate.getMinutes();
                var nn = n < 10 ? "0" + n : n;
                var s = formatDate.getSeconds();
                var ss = s < 10 ? "0" + s : s;

                formatString = formatString.replace(/yyyy/i, yyyy);
                formatString = formatString.replace(/yy/i, yy);
                formatString = formatString.replace(/mmm/i, mmm);
                formatString = formatString.replace(/mm/i, mm);
                formatString = formatString.replace(/m/i, m);
                formatString = formatString.replace(/dd/i, dd);
                formatString = formatString.replace(/d/i, d);
                formatString = formatString.replace(/hh/i, hh);
                formatString = formatString.replace(/h/i, h);
                formatString = formatString.replace(/nn/i, nn);
                formatString = formatString.replace(/n/i, n);
                formatString = formatString.replace(/ss/i, ss);
                formatString = formatString.replace(/s/i, s);

                return formatString;
        } else {
                return "";
        }
}
