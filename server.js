// Passed arguments
const args = require('./args.json').arguments;

const express = require('express');
let app = express();
let ip = require('ip');
let fs = require('fs');
let path = require('path');
let https = require('https')
let mqtt = require('mqtt');
let mongodb = require('mongodb');
let bcrypt = require('bcryptjs');
let bodyParser = require('body-parser');


let mqttServerClient = mqtt.connect(args.mqtt_uri);

let mongoServerClient;
let mongoDatabaseObj;

let parkingSpotsStatusJson = {
}

function handleCarIsHere(message,collectionObj){
	let jsonMsg = JSON.parse(message.toString());
	if(jsonMsg.sender === "pi")
	{
		console.log("Message published to parking-spot/car-is-here by Pi");
		parkingSpotsStatusJson[jsonMsg.spot] = jsonMsg.spot_status;

		let messageObject = {
			"spot" : jsonMsg.spot
		}	
		if(jsonMsg.spot_status){
			messageObject.text = "No plate recognized";
			messageObject.confidence = "0.0";
			messageObject.image = "No image shot";
			messageObject.arrival = jsonMsg.arrival;
			messageObject.departure = "-";
		}else{
			messageObject.departure = jsonMsg.departure;
		}
		collectionObj.updateOne({_id : jsonMsg.uuid}, {$set : messageObject}, {upsert:true})
	}else{
		console.log("Message published to parking-spot/car-is-here by Server, so do nothing.");
	}
}

function handleNothingIsDetected(message,collectionObj){
	let jsonMsg = JSON.parse(message.toString());
	console.log('No license plate detected by camera at spot', jsonMsg.spot);
	
	collectionObj.updateOne({_id : jsonMsg.uuid}, {$set : {'image': jsonMsg.image} })
	
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

		mongoDatabaseObj = client.db(args.mongodb_database);

		let collectionObj = mongoDatabaseObj.collection(args.mongodb_collection_for_park_data);

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

// serve static files from the public folder
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true}));

app.get('/', (req,res) => {
	res.sendFile(path.join(__dirname + '/index.html'));
});
app.post('/login', (req,res) => {

	let user_id = req.body.user_id;
	let password_hash = req.body.pwd;
	let key = req.body.key;

	if(user_id === undefined || password_hash === undefined){
		console.log("Redirecting to user site");
		res.sendFile(path.join(__dirname + '/index.html'));
	}else{
		console.log("Manager trying to log in");

		let collectionForManagementData = mongoDatabaseObj.collection(args.mongodb_collection_for_manager_data);
		let managerDoc = collectionForManagementData.findOne({manager_id : user_id});

		if(managerDoc){
			let hashingSuccessful = bcrypt.compareSync(password_hash, managerDoc.pwd);
	   		if(!hashingSuccessful){
		    	console.log("Comparing password to dataset hash did not work");
		    }else{
		    	console.log("Redirecting to manager site");
				res.sendFile(path.join(__dirname + '/index_manager.html'));
    		}
		}else{
		 	if(key === undefined){
		 		console.log("No key specified for registering manager, redirecting to user site");
				res.sendFile(path.join(__dirname + '/index.html'));
		 	}else{
		 		if(key === args.key){
					bcrypt.hash(password_hash,10,function(err, hash){
						if(err){
							console.log("Hashing of manager's pwd failed.",err);
						}
						collectionForManagementData.updateOne({manager_id : user_id}, {$set : {"pwd":hash}}, {upsert:true});
						res.sendFile(path.join(__dirname + '/index_manager.html'));
					});
		 		}else{
		 			console.log("False key for registration of new manager, redirecting to normal user site");
		 			res.sendFile(path.join(__dirname + '/index.html'));
		 		}
			}
		}
	}
});

let server = https.createServer({
  key: fs.readFileSync(path.join(__dirname + '/server.key')),
  cert: fs.readFileSync(path.join(__dirname + '/server.cert'))
}, app);

server.listen(args.port, function () {
  console.log(`Express running → ADDRESS ${ip.address()} on PORT ${server.address().port}`);
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
