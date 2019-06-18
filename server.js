const express = require('express');
let app = express();
let fs = require('fs');
let ip = require('ip');
let path = require('path');
let server = require('http').Server(app);
let mqtt = require('mqtt');

let mqttServerClient = mqtt.connect('mqtt://10.0.0.3');

// Using pug engine for viewing html
// app.set('view engine', 'pug');
let appCounter = 1;

server.listen(9999, () => {
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

mqttServerClient.on('connect', function(connack){
    console.log('Connection status to mqtt broker',connack);
    mqttServerClient.publish('parking-spot/who-am-i',appCounter);
    appCounter ++;
});