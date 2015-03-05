function updateAlerts(jsonstatus) {
        // console.log("updateAlerts:" + jsonstatus);
        // var status = JSON.parse(jsonstatus);
        var status = jsonstatus;

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
    else return "-";
}
function setAlertType(id, type, text) {
    $(id).removeClass();
    $(id).addClass(type);
    $(id + " p").html(text);
}

function runMotor() {
    socket.emit('run', {start:'running'});
}

function statusReceived2(msg){
    console.log(msg.status2);
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
        var buttonclass = "btn-info";
        if((device.state).toLowerCase()!="off") {
            buttonclass = "btn-success";
        }
        var calendar = "";
        if(device.auto == "calendar") {
            calendar = "active";
        }
        var light = "";
        if(device.auto == "light") {
            light = "active";
        }

        $('<li>' +
            '<div class="btn-toolbar">' +
            '<label>' + device.name + '</label>' +
                '<div class="btn-group">' +
                  '<a href="#" class="btn ' + buttonclass + '"><i class="fui-checkround-16"></i></a>' + 
                  '<a href="#" class="btn ' + buttonclass + ' ' + calendar + '"><i class="fui-time-16"></i></a>' + 
                  '<a href="#" class="btn ' + buttonclass + ' ' + light + '"><i class="fui-eye-16"></i></a>' + 
                  '<a href="#" class="btn ' + buttonclass + '"><i class="fui-cross-16"></i></a>' + 
                '</div>' + 
            '</div>' +
          '</li>').appendTo("#enheter");
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

function createMenu() {
    $("li a").click(function(){
            console.log("hiding");
            $(this.hash).show().siblings(".page").hide();
            $(".top").siblings().removeClass("active");
            $(this).parents(".top").addClass("active");
        });
}
