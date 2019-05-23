var host = window.location.hostname;
console.log('Window location',window.location);
var port = window.location.port;
const socket = io('/browsers');


function addListItem( txt, counter, spotNumber) {
    $("#platelist").append( `<li id='plate${counter}'>` + txt + `</li>` );
    $("#plate"+counter).mouseenter( function(){
        $('#parkingSlotGroup'+counter).addClass('scaleOut');
    }).mouseleave( function(){
        $('#parkingSlotGroup'+counter).removeClass('scaleOut');
    });
};

function removeListItem(counter ) {
    $("#plate" + counter).detach();
};




console.log('Connection to Websocket at port', port);

socket.on('spot taken', (spotID) =>{
    console.log('Parking slot',spotID, 'has been taken');
    $('#car'+spotID).removeClass("free");
    $('#spot'+spotID).addClass("taken");
});

socket.on('spot free', (spotID,counter) =>{
    console.log('Parking slot',spotID, 'is free again');
    $('#car'+spotID).addClass("free");
    $('licenseplate').addClass("free");
    $('#spot'+spotID).removeClass("taken");
    removeListItem(counter);
});

socket.on('image received', (image,text,spotNumber,counter) =>{
    console.log('Image has been taken');
    let imgElement = document.getElementById('licenseplate');
    imgElement.setAttribute('xlink:href',image);
    imgElement.classList.remove('free');
    addListItem(text,counter,spotNumber);
});

socket.on('disconnect', () => {
    console.log('Server has been disconnected.');
    socket.disconnect(0);
});
