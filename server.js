import {PythonShell} from 'python-shell';
const express = require('express');
var app = express();
var fs = require('fs');
var server = require('http').Server(app);
var io = require('socket.io')(server);

let pythonShellOptions = {
	mode: 'json',
	pythonOptions: ['-u'],
};

let pyShell =  new PythonShell('sensor.py', pythonShellOptions);

pyShell.on('message', function(message){
	console.log(message);
});

/*
var spawn = require('child_process').spawn;
var py = spawn('python', ['sensor.py']);
py.stdout.on('data', function (data){
	console.log(data.toString());
});
*/
app.set('view engine', 'pug');

server.listen(999, () => {
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

io.on('connection', (socket) => {
	socket.emit('spot taken','A1');
});
