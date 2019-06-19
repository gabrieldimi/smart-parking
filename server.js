// Passed arguments
const args = require('./args.json').arguments;

const express = require('express');
let app = express();
let fs = require('fs');
let ip = require('ip');
let path = require('path');
let server = require('http').Server(app);
let mqtt = require('mqtt');
let mongodb = require('mongodb');

let mqttServerClient = mqtt.connect(args.mqtt_uri);

let mongoServerClient;

mongodb.MongoClient.connect(args.mongodb_uri,{ useNewUrlParser: true }, (error, client) => {
	if(error){
		throw error;
	}
	console.log('Connection to mongodb established');

	mongoServerClient = client;

	const dataBaseObj = client.db(args.mongodb_database);

	let collectionObj = dataBaseObj.collection(args.mongodb_collection);
	collectionObj.createIndex( {"parker": 1});

	mqttServerClient.on('message',(topic, message) => {

	 	if (topic == 'parking-spot/image-is-taken') {

	    	let jsonMsg = JSON.parse(message.toString());
	    	let dateObj = new Date();
	    	let date = dateObj.getFullYear()+'-'+(dateObj.getMonth()+1)+'-'+dateObj.getDate();
	    	let time = dateObj.getHours() + ":" + dateObj.getMinutes() + ":" + dateObj.getSeconds();
		
	       	let messageObject = {

	       		"spot" : jsonMsg.spot,
	       		"text" : jsonMsg.text,
	       		"image" : jsonMsg.image,
	       		"time_stamp" : date+' '+time
	       	}

	       	collectionObj.insertOne(messageObject, (error,resultObj) =>{
	       		if(error){
	       			console.log("Error", error);
	       		}else{
	       			console.log("Result",resultObj.result);
	       		}
	       	});
	    }
	});
});


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

mqttServerClient.on('connect', (connack) => {
    console.log('Connection status to mqtt broker',connack);
    mqttServerClient.subscribe('parking-spot/image-is-taken');
});

process.on('SIGINT', () => {
	mongoServerClient.close(() => {
		console.log('Mongo database connection closed on app termination');
		process.exit(0);
	});
});