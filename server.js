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
let toggleArray = [];
for (var i = 0; i < args.amount_of_sensors; i++){
	toggleArray.push([false,false]);
}

//let toggleTaken = false;
//let toggleFree = false;

io.on('connection', (socket) => {
        console.log('New socket',socket.id);

        pyShell.on('message', function(msg){
                let res = msg.split(';');
                let id = res[1].trim();
                let measure = res[0];
                console.log("Distance measure from sensor",id,":",measure);
                if(measure <= args.distance){
                        if(!toggleArray[0][0]){
                                io.emit('spot taken',id);
                                toggleArray[0][0] = true;
                                toggleArray[0][1] = false;
                        }
                }else if(measure > args.distance){
                        if(!toggleArray[0][1]){
                                io.emit('spot free', id);
                                toggleArray[0][1] = true;
                                toggleArray[0][0] = false;
                        }
                }
        });

});


