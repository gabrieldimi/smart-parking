const express = require('express');
const args = require('./args.json').arguments;
let app = express();
let fs = require('fs');
let ip = require('ip');
let path = require('path');
let server = require('http').Server(app);
let io = require('socket.io')(server);
let {PythonShell} = require('python-shell');

// Namespaces for browser and app socket connections
const nspBrowsers = io.of('/browsers');
const nspApps = io.of('/apps');

// Passed arguments
let amountOfSensors = args.amount_of_sensors;
let sensorSleepingtime = args.time_to_sleep;
let measuringDistance = args.distance;
let maxAmountOfSensors = args.max_amount_of_sensors;
let dummySleepingTime = args.time_to_sleep_for_dummies;
let noSernorsPluggedOn = args.no_sensors_plugged_on;

console.log("Distance:",measuringDistance,"cm");
console.log("Amount of sensors:",amountOfSensors);
console.log("Sleeping time between readings of sensors:",sensorSleepingtime,"sec(s)");
console.log("Sleeping time between readings of dummies:",dummySleepingTime,"sec(s)");

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

	let latestLicensePlateImage = "";
	let licensePlateListItemCounter = amountOfSensors;
	let connectionToAtleastOneBrowserEstablished = false;
	let parkingSlotArray = [];
	let sensorTrigger = 7;
	let sensorEcho = 11;

	for (var i = 0; i < amountOfSensors; i++){
		let pythonShellOptions = {
			mode: 'text',
			pythonOptions: ['-u'],
			args: [sensorTrigger,sensorEcho,Number(sensorSleepingtime),]
		};

        /*	The parking slot array is two-dimensional; each row contains the following content:
		*	1.		A python shell with options (see above),
		*	2.		ID number of the sensor,
		*	3./4.	Two boolean values, which are used as a toggle whenever the sensor measures a distance 
		*			between the 0 and the given distance (see above from arguments); row[2] is for spot taken and row[3] for spot free,
		*	5.		The read text of the license plate (this value is by default empty),
		*	6.		The number of the license plate list item corresponding to a parking slot (this value is by default 0).
		*/
		parkingSlotArray.push([new PythonShell('sensor.py', pythonShellOptions),(i+1),false,false,"",0]);

		// These two following values are for the python script for setting the GPIO IN and OUT, HIGH and LOW 
		sensorTrigger += 6;
		sensorEcho += 4;
	}

	startPythonScripts(parkingSlotArray,licensePlateListItemCounter);

	nspBrowsers.on('connection', (socket) => {
		
		console.log('New browser socket is connected',socket.id);
		console.log('Checking if browser has missed any parking action...');

		let dataForBrowserUpdate = [];
		parkingSlotArray.forEach((row)=>{
				// see above for details to row
				if(row[4] !== ""){
					dataForBrowserUpdate.push([row[1],row[4],row[5]]);
				}
			});
		socket.emit('updateSmartPark',dataForBrowserUpdate/*,latestLicensePlateImage*/);
		
		if(amountOfSensors < maxAmountOfSensors){
			// simulationForDummySensors(maxAmountOfSensors - amountOfSensors,amountOfSensors,dummySleepingTime);
		}
		 
		socket.on('disconnect', () => {
			console.log('Browser has been disconnected');
		});

	});
	
	nspApps.on('connection', (socket) => {
		
		console.log('New app socket is connected',socket.id);
		socket.on('image taken', (image,text,parkingSpotIdNumber,plateListIdNumberCache) => {
			console.log('Image was taken from app from license plate of spot', parkingSpotIdNumber);

			// This next condition is only true if car stays parked, because if it goes away,
			// the license plate number (see above: row[5] = 0) is set back to 0 (the default value)
			if(plateListIdNumberCache != undefined && plateListIdNumberCache == parkingSlotArray[parkingSpotIdNumber-1][5]){
				nspBrowsers.emit('license plate received',text,parkingSpotIdNumber,plateListIdNumberCache);
				nspBrowsers.emit('image received', image);
				// Optional TODO: save each image either way
				// latestLicensePlateImage = image;
				parkingSlotArray[parkingSpotIdNumber-1][4] = text;
			}else{
				console.log('Car at spot',parkingSpotIdNumber,'with license plate',text,'just came and went');
			}
		});
		
		socket.on('disconnect', () => {
			console.log('App has been disconnected');
		});
	});
	
}else{
	console.log('This is for debugging purposes outside of raspberry PI usage');
}


function startPythonScripts( parkingSlotArray,licensePlateListItemCounter ){

	console.log('Starting python shell for',amountOfSensors,'sensor(s)');

	parkingSlotArray.forEach((row)=>{
		row[0].on('message', function(distance){

			console.log("Distance measure from sensor",row[1],":",distance);

			if(distance <= measuringDistance){
				if(!row[2]){
					nspBrowsers.emit('spot taken',row[1]);
					licensePlateListItemCounter ++;
					nspApps.emit('take picture',row[1],licensePlateListItemCounter);
					row[2] = true;
					row[3] = false;
					row[5] = licensePlateListItemCounter;
				}
			}else if(distance > measuringDistance){
				if(!row[3]){
					nspBrowsers.emit('spot free', row[1],row[5]);
					licensePlateListItemCounter --;
					row[2] = false;
					row[3] = true;
					row[4] = "";
					row[5] = 0;

				}
			}
			console.log('License plate counter', licensePlateListItemCounter);
		});
	});

	console.log('Python scripts are running for',amountOfSensors,'sensor(s)');
}

function simulationForDummySensors(leftOverSensors, amountOfSensors, time){

	setInterval(()=>{
		let rand1 = Math.floor(Math.random() *leftOverSensors) + amountOfSensors + 1;
		let rand2 = Math.floor(Math.random() *leftOverSensors) + amountOfSensors + 1;
		console.log('rand1:',rand1," rand2: ",rand2);
		nspBrowsers.emit('spot taken', rand1);
		nspBrowsers.emit('spot free', rand2);
	},time);
}