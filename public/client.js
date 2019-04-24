var host = window.location.hostname;
console.log(window.location);
var port = window.location.port;
const socket = io(host+':'+port);

console.log('Connection to Websocket at ');
console.log(socket);

socket.on('spot taken', (spotID) =>{
	console.log(spotID);
	$('#'+spotID).removeClass("free");
	$('#'+spotID).addClass("taken");
});

socket.on('spot free', (spotID) =>{
	console.log(spotID);
	$('#'+spotID).removeClass("taken");
	$('#'+spotID).addClass("free");
});





