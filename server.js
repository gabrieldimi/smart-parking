const express = require('express');
const args = require('./args.json').arguments;
let app = express();
let fs = require('fs');
let ip = require('ip');
let path = require('path');
let cluster = require('cluster');
let numCPUs = require('os').cpus().length;
let server = require('http').Server(app);
let io = require('socket.io')(server);
let {PythonShell} = require('python-shell');

let timeFromLastMessageFromSensor;

// Namespaces for browser and app socket connections
const nspBrowsers = io.of('/browsers');
const nspApps = io.of('/apps');

// Passed arguments
let measuringDistance = args.distance;
let sensorSleepingtime = args.time_to_sleep;
let idNumberOfSensor = args.id_number_of_sensor;

// These two following values are for the python script for setting the GPIO IN and OUT, HIGH and LOW 
let sensorTrigger = args.sensor_trigger;
let sensorEcho = args.sensor_echo;

let noSernorsPluggedOn = args.no_sensors_plugged_on;

let licensePlatePattern = args.license_plate_pattern;

console.log("Distance:",measuringDistance,"cm");
console.log("Id number of sensor:",idNumberOfSensor);
console.log("Sleeping time between readings of sensor:",sensorSleepingtime,"sec(s)");

// Using pug engine for viewing html
// app.set('view engine', 'pug');

server.listen(args.port, () => {
	console.log(`Express running → ADDRESS ${ip.address()} on PORT ${server.address().port}`);
});

// serve static files from the public folder
app.use(express.static(__dirname + '/public'));

app.get('/', (req,res) => {
	// res.render('index',{
	//   title: 'Smart parking on 9th floor of DEC'
	// });
	res.sendFile(path.join(__dirname + '/index.html'));
});

if(!noSernorsPluggedOn){

	let pythonShellOptions = {
		mode: 'text',
		pythonOptions: ['-u'], // get print results in real-time
		args: [sensorTrigger,sensorEcho,Number(sensorSleepingtime),]
	};

    /*	The parking slot is a JSON-object, containing the following key-value pairs:
	*	1.		A python shell with options (see above),
	*	2.		Python-shell's child process
	*	3.		ID number of the sensor,
	*	4./5.	Two boolean values, which are used as a toggle whenever the sensor measures a distance 
	*			between the 0 and the given distance (see above from arguments);
	*	6.		The read text of the license plate (this value is by default empty),
	*	7.		The number of the license plate list item corresponding to a parking slot.
	*	8.		The image of license plate
	*/
	let parkingSlot = { 
		'shell' : new PythonShell('sensor.py', pythonShellOptions),
		'shell_process' : '',
		'spotNumber' : idNumberOfSensor,
		'spotTaken' : false,
		'spotFree' : false,
		'licensePlateText' : '',
		'licensePlateListItemNumber' : idNumberOfSensor,
		'licensePlateImage' : ''
	};


	startPythonScript( parkingSlot );

	nspBrowsers.on('connection', (socket) => {

		console.log('New browser socket is connected',socket.id);
		console.log('Checking if browser has missed any parking action...');

		if(parkingSlot.licensePlateText !== ""){
			socket.emit('updateSmartPark',
						parkingSlot.spotNumber,
						parkingSlot.licensePlateListItemNumber,
						parkingSlot.licensePlateText,
						parkingSlot.licensePlateImage);
		}

		socket.on('disconnect', () => {
			console.log('Browser has been disconnected');
		});
	});

	nspApps.on('connection', (socket) => {

		console.log('New app socket is connected',socket.id);

		socket.on('image taken', (image,text,parkingSpotIdNumber,plateListIdNumber) => {
			// This next condition is only true if car stays parked.
			if(plateListIdNumber != undefined && parkingSlot.spotTaken){
				if(text.match(licensePlatePattern)){
					console.log('Image was taken from app from license plate',text,'of spot', parkingSpotIdNumber);
					nspBrowsers.emit('license plate received',text,parkingSpotIdNumber,plateListIdNumber);
					nspBrowsers.emit('image received', image);
					parkingSlot.licensePlateImage = image;
					parkingSlot.licensePlateText = text;
					console.log('App has sent image and text');
				}else{
					console.log('Text from image', text,'does not match with the pattern. Trying again...');
					nspApps.emit('take picture',parkingSpotIdNumber,plateListIdNumber);
				}
			}else{
				// the license plate number (see above: row[5] = 0) is set back to 0 (the default value)
				console.log('Car at spot',parkingSpotIdNumber,'with license plate',text,'just came and went.');
			}
		});

		socket.on('no car detected', (parkingSpotIdNumber,plateListIdNumber) => {
			console.log('No car at',parkingSpotIdNumber,'detected, trying again...');
			if(parkingSlot.spotTaken){
				nspApps.emit('take picture',parkingSpotIdNumber,plateListIdNumber);
			}
		});

		socket.on('disconnect', () => {
			console.log('App has been disconnected');
		});
	});

   
	setInterval(function() {
		console.log('Server still running',(Date.now() - timeFromLastMessageFromSensor));
		if((Date.now() - timeFromLastMessageFromSensor) >5500){ 
			console.log('Restarting python script');
			parkingSlot.shell_process.stdin.pause();
			parkingSlot.shell_process.stdout.pause();
			parkingSlot.shell_process.kill();
			parkingSlot.shell = new PythonShell('sensor.py', pythonShellOptions);
			parkingSlot.spotTaken = false;
			parkingSlot.spotFree = false;
			startPythonScript( parkingSlot );
		}
	}, 5000);
   

}else{
	console.log('This is for debugging purposes outside of raspberry PI usage');
}


function startPythonScript( parkingSlot ){

	console.log('Starting python shell for sensor', parkingSlot.spotNumber);

	parkingSlot.shell.on('stderr', function (stderr) {
		console.log('Stderr',stderr);
	});

	parkingSlot.shell.on('message', function(distance){

			timeFromLastMessageFromSensor = Date.now();

			console.log("Distance measure from sensor",parkingSlot.spotNumber,":",distance);

			if(distance <= measuringDistance){
				if(!parkingSlot.spotTaken){
					nspBrowsers.emit('spot taken',parkingSlot.spotNumber);
					nspApps.emit('take picture',parkingSlot.spotNumber,parkingSlot.licensePlateListItemNumber);
					parkingSlot.spotTaken = true;
					parkingSlot.spotFree = false;
				}
			}else if(distance > measuringDistance){
				if(!parkingSlot.spotFree){
					nspBrowsers.emit('spot free',parkingSlot.spotNumber,parkingSlot.licensePlateListItemNumber);
					parkingSlot.spotTaken = false;
					parkingSlot.spotFree = true;
					parkingSlot.licensePlateText = "";
				}
			}
	});

	parkingSlot.shell.end(function (err,code,signal) {
		console.log('Python shell ended.');
		console.log('The exit code was: ' + code);
		console.log('The exit signal was: ' + signal);
		if(err){
			console.log('Closing...',err);
		}
	});

	parkingSlot.shell_process = parkingSlot.shell.childProcess;
}