let host = window.location.hostname;
console.log('Window location',window.location,'on host',host);
let port = window.location.port;
const socket = io('/browsers');

console.log('Connection to Websocket at port', port);

function addListItem( parkingSpotIdNumber, text, licensePlateListCounter ) {
	console.log('Adding text for spot number',parkingSpotIdNumber,':',text)
    $("#platelist").append( `<li id='plate${licensePlateListCounter}'>` + text + `</li>` );
    $("#plate"+licensePlateListCounter).mouseenter( function(){
        $('#parkingSlotGroup'+parkingSpotIdNumber).addClass('scaleOut');
    }).mouseleave( function(){
        $('#parkingSlotGroup'+parkingSpotIdNumber).removeClass('scaleOut');
    });
};
 
function removeListItem( licensePlateListCounter ) {
    $("#plate" + licensePlateListCounter).detach();
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

socket.on('updateSmartPark', ( dataForBrowserUpdate, latestLicensePlateImage ) => {
    console.log('Searching for data for update...');
    console.log('Smart park being updated...');
    addImage( latestLicensePlateImage );
    console.log('length of update data',dataForBrowserUpdate.length);
    dataForBrowserUpdate.forEach((row)=>{
        //Row contains respectively: parking spot number, image text (license plate), and license plate list number
        addListItem( row[0], row[1], row[2] );
        addCar(row[0]);
    });

});

socket.on('spot taken', ( parkingSpotIdNumber ) =>{
    console.log('Parking slot',parkingSpotIdNumber, 'has been taken');
    addCar( parkingSpotIdNumber );
});

socket.on('spot free', ( parkingSpotIdNumber, licensePlateListCounter ) =>{
    console.log('Parking slot',parkingSpotIdNumber, 'is free again');
    $('#car'+parkingSpotIdNumber).addClass("free");
    $('#licenseplate').addClass("free");
    $('#spot'+parkingSpotIdNumber).removeClass("taken");
    if($('#parkingSlotGroup'+parkingSpotIdNumber).hasClass('scaleOut')){
        $('#parkingSlotGroup'+parkingSpotIdNumber).removeClass('scaleOut');   
    }
    removeListItem( licensePlateListCounter );
});

socket.on('license plate received', ( text, parkingSpotIdNumber, licensePlateListCounter ) =>{
    console.log('Image has been taken by spot', parkingSpotIdNumber);
    addListItem( parkingSpotIdNumber, text, licensePlateListCounter );
});

socket.on('image received', ( image ) =>{
    addImage( image );
});

socket.on('disconnect', () => {
    console.log('Server has been disconnected.');
    socket.disconnect();
});