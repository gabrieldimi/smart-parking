let host = window.location.hostname;
console.log('Window location',window.location,'on host',host);
let port = window.location.port;
const socket = io('/browsers');

console.log('Connection to Websocket at port', port);

function addListItem( parkingSpotIdNumber, text, licensePlateListId ) {
	console.log('Adding text for spot number',parkingSpotIdNumber,':',text)
    $("#platelist").append( `<li id='plate${licensePlateListId}'>` + text + `</li>` );
    $("#plate"+licensePlateListId).mouseenter( function(){
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
    $('#car'+parkingSpotIdNumber).removeClass("free");
    $('#spot'+parkingSpotIdNumber).addClass("taken");
}

socket.on('updateSmartPark', ( parkingSpotIdNumber, licensePlateListId, licensePlateText, licensePlateImage) => {
    console.log('Searching for data for update...');
    console.log('Smart park being updated...');
    addImage( licensePlateImage );
    addListItem( parkingSpotIdNumber, licensePlateText, licensePlateListId );
    addCar( parkingSpotIdNumber );
});

socket.on('spot taken', ( parkingSpotIdNumber ) =>{
    console.log('Parking slot',parkingSpotIdNumber, 'has been taken');
    addCar( parkingSpotIdNumber );
});

socket.on('spot free', ( parkingSpotIdNumber, licensePlateListId ) =>{
    console.log('Parking slot',parkingSpotIdNumber, 'is free again');
    $('#car'+parkingSpotIdNumber).addClass("free");
    $('#licenseplate').addClass("free");
    $('#spot'+parkingSpotIdNumber).removeClass("taken");
    if($('#parkingSlotGroup'+parkingSpotIdNumber).hasClass('scaleOut')){
        $('#parkingSlotGroup'+parkingSpotIdNumber).removeClass('scaleOut');   
    }
    removeListItem( licensePlateListId );
});

socket.on('license plate received', ( text, parkingSpotIdNumber, licensePlateListId ) =>{
    console.log('Image has been taken by spot', parkingSpotIdNumber);
    addListItem( parkingSpotIdNumber, text, licensePlateListId );
});

socket.on('image received', ( image ) =>{
    addImage( image );
});

socket.on('disconnect', () => {
    console.log('Server has been disconnected.');
    socket.disconnect();
});