function checkDoors() {
    var xhr = new XMLHttpRequest();
    var url = "http://garagepi.helentobias.se/status";

    xhr.onload = reqListener;
    xhr.open("GET", url, true);
    xhr.send(null);

    function reqListener () {
        updateAlerts(this.responseText);
    };

}

function updateAlerts(jsonstatus) {
//       console.log("updateAlerts:" + jsonstatus);
       var status = JSON.parse(jsonstatus);

        setAlertType("#garageport", convertStatusToAttr(status.garage), convertStatusToMessage(status.garage));
        setAlertType("#innerdoor", convertStatusToAttr(status.inner), convertStatusToMessage(status.inner));
}

function convertStatusToAttr(status) {
    if(status == "closed") return "alert alert-success";
    return "alert alert-error";
}

function convertStatusToMessage(status) {
    if(status == "closed") return "Stängd";
    else if(status == "open") return "Öppen";
    else return "Schrödinger";
}
function setAlertType(id, type, text) {
    $(id).removeClass();
    $(id).addClass(type);
    $(id + " p").html(text);
}

function runMotor() {
    socket.emit('run', {start:'running'});
}

function activateMotor() {
    var oReq = new XMLHttpRequest();
    //oReq.onload = reqListener;
    oReq.timeout = 1000;
    try {
        oReq.open("GET", "http://192.168.0.15:3000/run", true);
        oReq.send();
    } catch (err) {
        console.log("Exception: " + err);
    }
}

function statusReceived(msg){
    updateAlerts(msg.status);
}

function stayInWebApp() {
    var a=document.getElementsByTagName("a");
    for(var i=0;i<a.length;i++) {
        if(!a[i].onclick && a[i].getAttribute("target") != "_blank") {
            a[i].onclick=function() {
                              window.location=this.getAttribute("href");
                              return false; 
           }
        }
    }
}

// Test for flat-ui display of units
function displayUnits2() {
    $('.enheter').empty();
    var i = 2;
    var k = 1;
    for(var d in deviceData.devices) {
        var device = deviceData.devices[d];
        // State can be ON/OFF/DIMMED:xx
        var checked = (device.state).toLowerCase()=="off"?"":"checked";
        var id = deviceData.devices[d].id;
        if(k == 1) {
            j = "";
        } else 
            j = k;

        $('#enheter').append("<li>" + '<label class="share-label" for="share-toggle' + i + '">' + device.name.trim() + "</label>" +
            '<div class="toggle">' +
            '<label class="toggle-radio" for="share-toggle' + i + '">ON</label>' +
            '<input type="radio" name="share-toggles' + j + '" id="share-toggle' + i + '" value="toggle1'+  '">' +
            '<label class="toggle-radio" for="share-toggle' + (i-1) + '">OFF</label>' +
            '<input type="radio" name="share-toggles' + j + '" id="share-toggle' + (i-1) + '" value="toggle2' + '" checked="checked">' +
            '</div></li>');
        i += 2;
        k++;
    }
}
function queryDevices2() {
    // Using .ajax to be able to control sync/async or not.
    $.ajax({
        url : $SERVICE,
        data : { "cmd":"list" },
        type: "POST",
        async: true,  // Sync o make sure we have device-data? Use local storage?
        success: function statesResponse(data) {
            localStorage.setItem('deviceData', JSON.stringify(data)); 
            deviceData = data;
            displayUnits2();
        }
    });
}
