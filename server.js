const express = require('express');
const args = require('./args.json').arguments;
var app = express();
var fs = require('fs');
var ip = require('ip');
var server = require('http').Server(app);
var io = require('socket.io')(server);
let {PythonShell} = require('python-shell');

const nspBrowsers = io.of('/browsers');
const nspApps = io.of('/apps');

let amountOfSensors = args.amount_of_sensors;
let sensorSleepingtime = args.time_to_sleep;
let measuringDistance = args.distance;
let maxAmountOfSensors = args.max_amount_of_sensors;
let dummySleepingTime = args.time_to_sleep_for_dummies;
let noSernorsPluggedOn = args.no_sensors_plugged_on;


let licensePlateListItemCounter = 1;

console.log("Distance:",measuringDistance,"cm");
console.log("Amount of sensors:",amountOfSensors);
console.log("Sleeping time between readings of sensors:",sensorSleepingtime,"sec(s)");
console.log("Sleeping time between readings of dummies:",dummySleepingTime,"sec(s)");


app.set('view engine', 'pug');

server.listen(args.port, () => {
	console.log(`Express running → ADDRESS ${ip.address()} on PORT ${server.address().port}`);
});

//serve static files from the public folder
app.use(express.static(__dirname + '/public'));

app.get('/', (req,res) => {
	res.render('index',{
		title: 'Smart parking on 9th floor of DEC'
	});
});

if(!noSernorsPluggedOn){

	let pythonScriptArray = [];
	let trigger = 7;
	let echo = 11;
	for (var i = 0; i < amountOfSensors; i++){
		let pythonShellOptions = {
			mode: 'text',
			pythonOptions: ['-u'],
			args: [trigger,echo,Number(sensorSleepingtime),]
		};

		pythonScriptArray.push([new PythonShell('sensor.py', pythonShellOptions),(i+1),false,false]);
		trigger += 6;
		echo += 4;
	}

	nspBrowsers.on('connection', (socket) => {
		
		console.log('New browser socket is connected',socket.id);
		pythonScriptArray.forEach((row)=>{
			row[0].on('message', function(distance){

				console.log("Distance measure from sensor",row[1],":",distance);

				if(distance <= measuringDistance){
				        if(!row[2]){
				                nspBrowsers.emit('spot taken',row[1]);
                        licensePlateListItemCounter ++;
								        nspApps.emit('take picture',row[1],licensePlateListItemCounter);
				                row[2] = true;
				                row[3] = false;
				        }
				}else if(distance > measuringDistance){
				        if(!row[3]){
				                nspBrowsers.emit('spot free', row[1],licensePlateListItemCounter);
                        licensePlateListItemCounter --;
                        row[3] = true;
				                row[2] = false;
				        }
				}
        console.log('License plate counter', licensePlateListItemCounter);
			});
		});
		if(amountOfSensors < maxAmountOfSensors){
			//simulation(maxAmountOfSensors - amountOfSensors,amountOfSensors,dummySleepingTime);
		}

	});
	
	nspApps.on('connection', (socket) => {
		
		console.log('New app socket is connected',socket.id);
		socket.on('image taken', (image,text,spotNumber,plateListCounterOld) => {
			console.log('Image was taken from app with number', plateListCounterOld);
      if(plateListCounterOld == licensePlateListItemCounter){
			  nspBrowsers.emit('image received', image,text,spotNumber,licensePlateListItemCounter);
      }else{
        console.log('Car with license plate',text,'just came and went');
      }
		});
		
		socket.on('disconnect', () => {
      console.log('App is disconnected');
		});
	});
	
}else{
	console.log('This is for debugging purposes outside of the raspberry PI');
}

function simulation(leftOverSensors, amountOfSensors, time){

	setInterval(()=>{
		let rand1 = Math.floor(Math.random() *leftOverSensors) + amountOfSensors + 1;
		let rand2 = Math.floor(Math.random() *leftOverSensors) + amountOfSensors + 1;
		console.log('rand1:',rand1," rand2: ",rand2);
		nspBrowsers.emit('spot taken', rand1);
		nspBrowsers.emit('spot free', rand2);
	},time);
}
