let host = window.location.hostname;
let port = window.location.port;
console.log('Connection to Websocket at port', port, 'on host', host);

let mqttBrowserClient = mqtt.connect('mqtt://10.0.0.3:9001');

let pwd = document.getElementById("pwd");
let repeatPwd = document.getElementById("repeated_pwd");

repeatPwd.onkeyup = function(){
    if(repeatPwd.value.equals(pwd.value)){
        $('#submitRegistration').prop("disabled","false");
    }else{
        $('#submitRegistration').prop("disabled","true");
    }
}
function openLoginForm() {
  document.getElementById("loginForm").style.display = "block";
}

function openRegisterForm(){
    closeLoginForm();
    document.getElementById("registerForm").style.display = "block";
}

function closeLoginForm() {
  document.getElementById("loginForm").style.display = "none";
}

function closeRegisterForm() {
  document.getElementById("registerForm").style.display = "none";
}

function addCar( parkingSpotIdNumber ){
	console.log('Parking spot',parkingSpotIdNumber, 'is taken');
    $('#car'+parkingSpotIdNumber).removeClass('free');
    $('#spot'+parkingSpotIdNumber).addClass('taken');
}

function removeCar( parkingSpotIdNumber ){
    console.log('Parking spot',parkingSpotIdNumber, 'is free');
    $('#car'+parkingSpotIdNumber).addClass('free');
    $('#spot'+parkingSpotIdNumber).removeClass('taken');
}

function handleCarIsHere(message){
    let jsonMsg = JSON.parse(message.toString());
    if(jsonMsg.spot_status){
        addCar(jsonMsg.spot);
    }else{
        removeCar(jsonMsg.spot);
    }
}

mqttBrowserClient.on('connect', function(connack){
    console.log('Connection status',connack);
    mqttBrowserClient.subscribe('parking-spot/car-is-here');
});

mqttBrowserClient.on('message', (topic, message) => {
    switch (topic) {
        case 'parking-spot/car-is-here':
            return handleCarIsHere(message);
    }
    console.log('No handler for topic %s', topic)
});

mqttBrowserClient.on('disconnect', (packet) => {
    console.log('Disconnect received from broker', packet);
    mqttBrowserClient.end();
});
