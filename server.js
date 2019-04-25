const express = require('express');
var app = express();
var fs = require('fs');
var server = require('http').Server(app);
var io = require('socket.io')(server);

let {PythonShell} = require('python-shell');
let pythonShellOptions = {
	mode: 'text',
	pythonOptions: ['-u'],
};

app.set('view engine', 'pug');

server.listen(9999, () => {
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
	
	let pyShell =  new PythonShell('sensor.py', pythonShellOptions);

	pyShell.on('message', function(msg){
		console.log(msg);
		//var res = msg.split(';');
		//if(res[0] == 1){
		if(msg <= 3.5){			
			io.emit('spot taken','A1');
		}else if(msg > 5.0){
			io.emit('spot free', 'A1');	
		}	
	});

});
