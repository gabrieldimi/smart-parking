const express = require('express');
const args = require('./args.json').arguments;
var app = express();
var fs = require('fs');
var server = require('http').Server(app);
var io = require('socket.io')(server);

console.log("Distance:",args.distance,"cm");
console.log("Sleeping time between readings:",args.time_to_sleep,"sec(s)");

app.set('view engine', 'pug');

server.listen(args.port, () => {
	console.log(`Express running → PORT ${server.address().port}`);
});

//serve static files from the public folder
app.use(express.static(__dirname + '/public'));

app.get('/', (req,res) => {
	res.render('index',{
		title: 'Smart parking'
	});
});

app.get('/parking', (req,res) =>{
	console.log('parking website');
});

let {PythonShell} = require('python-shell');

let pythonScriptArray = [];
for (var i = 0; i < args.amount_of_sensors; i++){
	let pythonShellOptions = {
		mode: 'text',
		pythonOptions: ['-u'],
		args: [7,11,Number(args.time_to_sleep),]
	};

	pythonScriptArray.push([new PythonShell('sensor.py', pythonShellOptions),'A'+(i+1),false,false]);
}

io.on('connection', (socket) => {
        console.log('New socket',socket.id);
	pythonScriptArray.forEach((row)=>{
		row[0].on('message', function(distance){

		        console.log("Distance measure from sensor",row[1],":",distance);

		        if(distance <= args.distance){
		                if(!row[2]){
		                        io.emit('spot taken',row[1]);
		                        row[2] = true;
		                        row[3] = false;
		                }
		        }else if(distance > args.distance){
		                if(!row[3]){
		                        io.emit('spot free', row[1]);
		                        row[3] = true;
		                        row[2] = false;
		                }
		        }
		});
	});
});


