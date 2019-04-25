const express = require('express');
const args = require('./args.json').arguments;
var app = express();
var fs = require('fs');
var server = require('http').Server(app);
var io = require('socket.io')(server);

console.log("Distance:",args.distance,"cm");
console.log("Sleeping time between readings:",args.time_to_sleep,"sec(s)");

let {PythonShell} = require('python-shell');
let pythonShellOptions = {
	mode: 'text',
	pythonOptions: ['-u'],
	args: [Number(args.time_to_sleep)]
};

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

let pyShell =  new PythonShell('sensor.py', pythonShellOptions);
let toggleTaken = false;
let toggleFree = false;

io.on('connection', (socket) => {
        console.log('New socket',socket.id);

        pyShell.on('message', function(msg){
                console.log(msg);
                //var res = msg.split(';');
                //if(res[0] == 1){
                if(msg <= args.distance){
                        if(!toggleTaken){
                                io.emit('spot taken','A1');
                                toggleTaken = true;
                                toggleFree = false;
                        }
                }else if(msg > args.distance){
                        if(!toggleFree){
                                io.emit('spot free', 'A1');
                                toggleFree = true;
                                toggleTaken = false;
                        }
                }
        });

});

