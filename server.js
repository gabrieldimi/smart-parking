// Passed arguments
const args = require('./args.json').arguments;

const express = require('express');
let app = express();
let ip = require('ip');
let path = require('path');
let server = require('http').Server(app);
let mqtt = require('mqtt');
let mongodb = require('mongodb');

let mqttServerClient = mqtt.connect(args.mqtt_uri);

let mongoServerClient;

let parkingSpotsStatusJson = {
}

function handleCarIsHere(message,collectionObj){
    let jsonMsg = JSON.parse(message.toString());
    parkingSpotsStatusJson[jsonMsg.spot] = jsonMsg.spot_status;
    
    let messageObject = {
    	"spot" : jsonMsg.spot,
    	"arrival" : jsonMsg.arrival,
    	"departure" : jsonMsg.departure,
    	"image" : "Camera is on",
    	"text"  : "No image shot"
    }

    collectionObj.updateOne({_id:jsonMsg.uuid}, {$set : messageObject}, {upsert:true})

}

function handleNothingIsDetected(message,collectionObj){
	let jsonMsg = JSON.parse(message.toString());
	console.log('No license plate detected by camera at spot', jsonMsg.spot);
	collectionObj.updateOne({_id:jsonMsg.uuid}, {$set : {'image': jsonMsg.image} })

	if( parkingSpotsStatusJson[jsonMsg.spot] ){
		console.log('Checking again');
		mqttServerClient.publish(args.topics[0],JSON.stringify({ 'uuid' : jsonMsg.uuid, 'spot' : jsonMsg.spot,'spot_status': true, 'sender' : 'server'}));
	}else{
		console.log('Car at spot', jsonMsg.spot, 'is gone already');
	}
}

function handleImageIsTaken(message,collectionObj){

	let jsonMsg = JSON.parse(message.toString());
	let messageObject = {
		"text" : jsonMsg.text, 
      	"confidence" : jsonMsg.confidence,
   		"image" : jsonMsg.image
    }
	collectionObj.updateOne({_id : jsonMsg.uuid}, { $set : messageObject });
}

let connectToMongoWithRetry = function() {

	mongodb.MongoClient.connect(args.mongodb_uri,{ useNewUrlParser: true }, (error, client) => {

		if(error){
			console.error('Failed to connect to mongo on startup - retrying in 5 sec', error);
			setTimeout(connectToMongoWithRetry,5000);
		}
		console.log('Connection to mongodb established');

		mongoServerClient = client;

		const dataBaseObj = client.db(args.mongodb_database);

		let collectionObj = dataBaseObj.collection(args.mongodb_collection);

		mqttServerClient.on('message',(topic, message) => {
			switch (topic) {
				case args.topics[0]:
            		return handleCarIsHere(message,collectionObj);
            	case args.topics[1]:
            		return handleImageIsTaken(message,collectionObj);
       			case args.topics[2]:
            		return handleNothingIsDetected(message,collectionObj);
            }
            console.log('No handler for topic %s', topic)
		});
	});
}
connectToMongoWithRetry();

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
    mqttServerClient.subscribe('parking-spot/car-is-here');
    mqttServerClient.subscribe('parking-spot/image-is-taken');
    mqttServerClient.subscribe('parking-spot/nothing-is-detected');
});

process.on('SIGINT', () => {
	mongoServerClient.close(() => {
		console.log('Mongo database connection closed on app termination');
		process.exit(0);
	});
});