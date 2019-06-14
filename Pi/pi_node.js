let {PythonShell} = require('python-shell');
let mqtt = require('mqtt');
let raspberryPiClient  = mqtt.connect('mqtt://10.42.0.211');

// Passed arguments
const args = require('./args.json').arguments;

let measuringDistance = args.distance;
let sensorSleepingtime = args.time_to_sleep;
let idNumberOfSensor = args.id_number_of_sensor;
// These two following values are for the python script for setting the GPIO IN and OUT, HIGH and LOW 
let sensorTrigger = args.sensor_trigger;
let sensorEcho = args.sensor_echo;

console.log("Distance:",measuringDistance,"cm");
console.log("Id number of sensor:",idNumberOfSensor);
console.log("Sleeping time between readings of sensor:",sensorSleepingtime,"sec(s)");

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
*/
let parkingSlot = { 
	'shell' : new PythonShell('sensor.py', pythonShellOptions),
	'shell_process' : '',
	'spotNumber' : idNumberOfSensor,
	'spotTaken' : false,
	'spotFree' : false
};


let timeFromLastMessageFromSensor = Date.now();

raspberryPiClient.on('connect', function(connack){

    console.log(connack);
	failFast(5000);
	startPythonScript( parkingSlot );

});


function failFast( milliseconds ){

	setInterval(function() {
		console.log('Server still running',(Date.now() - timeFromLastMessageFromSensor));
		if((Date.now() - timeFromLastMessageFromSensor) > (milliseconds+500)){ 
			console.log('Restarting python script');
			parkingSlot.shell_process.stdin.pause();
			parkingSlot.shell_process.stdout.pause();
			parkingSlot.shell_process.kill();
			parkingSlot.shell = new PythonShell('sensor.py', pythonShellOptions);
			parkingSlot.spotTaken = false;
			parkingSlot.spotFree = false;
			startPythonScript( parkingSlot );
		}
	}, milliseconds);

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
				raspberryPiClient.publish(`parking-slot/spot${parkingSlot.spotNumber}/carIsHere`,true);
				parkingSlot.spotTaken = true;
				parkingSlot.spotFree = false;
			}
		}else if(distance > measuringDistance){
			if(!parkingSlot.spotFree){
				raspberryPiClient.publish(`parking-slot/spot${parkingSlot.spotNumber}/carIsHere`,false);
				parkingSlot.spotTaken = false;
				parkingSlot.spotFree = true;
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