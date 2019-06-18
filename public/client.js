let host = window.location.hostname;
let port = window.location.port;
console.log('Connection to Websocket at port', port, 'on host', host);

let mqttBrowserClient = mqtt.connect('mqtt://10.0.0.3:9001');

function addListItem( parkingSpotIdNumber, text ) {
	console.log('Adding text for spot number',parkingSpotIdNumber,':',text)
    $("#platelist").append( `<li id='plate${parkingSpotIdNumber}'>` + text + `</li>` );
    $("#plate"+parkingSpotIdNumber).mouseenter( function(){
        $('#parkingSlotGroup'+parkingSpotIdNumber).addClass('scaleOut');
    }).mouseleave( function(){
        $('#parkingSlotGroup'+parkingSpotIdNumber).removeClass('scaleOut');
    });
};
 
function removeListItem( licensePlateListId ) {
    $("#plate" + licensePlateListId).detach();
};

function addImage( image ) {
    let imgElement = document.getElementById('licenseplate');
    imgElement.setAttribute('xlink:href',image);
    imgElement.classList.remove('free');
};

function addCar( parkingSpotIdNumber ){
	console.log('Parking spot',parkingSpotIdNumber, 'is taken');
    $('#car'+parkingSpotIdNumber).removeClass("free");
    $('#spot'+parkingSpotIdNumber).addClass("taken");
}

function removeCar( parkingSpotIdNumber ){
    console.log('Parking spot',parkingSpotIdNumber, 'is free again');
    $('#car'+parkingSpotIdNumber).addClass("free");
    $('#licenseplate').addClass("free");
    $('#spot'+parkingSpotIdNumber).removeClass("taken");
    if($('#parkingSlotGroup'+parkingSpotIdNumber).hasClass('scaleOut')){
        $('#parkingSlotGroup'+parkingSpotIdNumber).removeClass('scaleOut');   
    }
    removeListItem( parkingSpotIdNumber );
}

function handleCarIsHere(message){
    let jsonMsg = JSON.parse(message.toString());
    if(jsonMsg.spot_status){
        addCar(jsonMsg.spot);
    }else{
        removeCar(jsonMsg.spot);
    }
}

function handleImageIsTaken(message){
    let jsonMsg = JSON.parse(message.toString());
    console.log('Image has been taken by camera at spot', jsonMsg.spot);
    addListItem( jsonMsg.spot, jsonMsg.text );
    addImage( jsonMsg.image );
}

function handleNothingIsDetected(message){
    let jsonMsg = JSON.parse(message.toString());
    console.log('No license plate detected by camera at spot', jsonMsg.spot);
	if( !($('#car'+jsonMsg.spot).hasClass("free")) ){
		console.log('Checking again');
		mqttBrowserClient.publish('parking-spot/car-is-here',JSON.stringify({ 'spot' : jsonMsg.spot,'spot_status': true }));
	}else{
		console.log('Car at spot', jsonMsg.spot, 'is gone already');
	}
}

mqttBrowserClient.on('connect', function(connack){
    console.log('Connection status',connack);
    mqttBrowserClient.subscribe('parking-spot/car-is-here');
    mqttBrowserClient.subscribe('parking-spot/image-is-taken');
    mqttBrowserClient.subscribe('parking-spot/nothing-is-detected');
});

mqttBrowserClient.on('message', (topic, message) => {
    switch (topic) {
        case 'parking-spot/car-is-here':
            return handleCarIsHere(message);
        case 'parking-spot/image-is-taken':
            return handleImageIsTaken(message);
        case 'parking-spot/nothing-is-detected':
            return handleNothingIsDetected(message);
    }
    console.log('No handler for topic %s', topic)
});

mqttBrowserClient.on('disconnect', (packet) => {
    console.log('Disconnect received from broker', packet);
    mqttBrowserClient.end();
});
