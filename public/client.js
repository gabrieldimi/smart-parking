var host = window.location.hostname;
console.log('Window location',window.location);
var port = window.location.port;
const socket = io('/browsers');

console.log('Connection to Websocket at port', port);

socket.on('spot taken', (spotID) =>{
    console.log('Parking slot',spotID, 'has been taken');
    $('#car'+spotID).removeClass("free");
    $('#spot'+spotID).addClass("taken");
});

socket.on('spot free', (spotID) =>{
    console.log('Parking slot',spotID, 'is free again');
    $('#car'+spotID).addClass("free");
    $('#spot'+spotID).removeClass("taken");
});

socket.on('image received', (image,text) =>{
    console.log('Image has been taken');
    var image = document.getElementById('licenseplate');
    image.setAttribute('xlink:href',image);
    console.log('Text read',text);
});

socket.on('disconnect', () => {
    console.log('Server has been disconnected.');
    socket.disconnect(0);
});

