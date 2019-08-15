// Passed arguments
const args = require('./args.json').arguments;
const express = require('express');

let app = express();
let ip = require('ip');
let fs = require('fs');
let path = require('path');
let https = require('https');
let http = require('http');
let mqtt = require('mqtt');
let mongodb = require('mongodb');
let bcrypt = require('bcryptjs');
let bodyParser = require('body-parser');


let mqttServerClient = mqtt.connect(args.mqtt_uri);
let mongoServerClient;
let mongoDatabaseObj;

//Stores the status of the parking spots
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
// parse post form input
app.use(bodyParser.urlencoded({ extended: true}));

app.get('/', (req,res) => {
	console.log("Directing to user page");
	res.sendFile(path.join(__dirname + '/index.html'));
});

/* 
* If manager, redirect to manager page;
* If normal user, redirect to user page. 
*/
app.post('/', (req,res) => {

	let user_id = req.body.user_id;
	let password_hash = req.body.pwd;
	// This key is used for registration, in order to make sure that the real manager is registering
	let key = req.body.key;

	if(user_id === undefined || password_hash === undefined){
		console.log("User id or password are not defined, redirecting to user page");
		res.sendFile(path.join(__dirname + '/index.html'));
	}else{

		let collectionForManagementData = mongoDatabaseObj.collection(args.mongodb_collection_for_manager_data);
			
		if(key === undefined){
			console.log("Manager trying to log in ...");

			collectionForManagementData.findOne({manager_id : user_id}, function(err,result){
				if(err){
					console.log("Error during search for document, redirecting to user page",err);
					res.sendFile(path.join(__dirname + '/index.html'));
				}else{

					if(result){
						console.log("Manager with user_id "+user_id+" exists");

						let hashingSuccessful = bcrypt.compareSync(password_hash, result.pwd);
				   		if(!hashingSuccessful){
					    	console.log("Comparison of password to dataset hash not successful, redirecting to user page");
							res.sendFile(path.join(__dirname + '/index.html'));
						}else{
					    	console.log("Redirecting to manager page");
					    	res.sendFile(path.join(__dirname + '/index_manager.html'));
			    		}
					}else{
						console.log("Manager does not exist, redirecting to user page");
						res.sendFile(path.join(__dirname + '/index.html'));
					}
				}	
			});
		}else{
			console.log("Manager trying to register ...")

		 	if(key === args.key.toString()){

				bcrypt.hash(password_hash,10,function(err, hash){
			 		if(err){
						console.log("Hashing of manager's pwd failed, redirecting to user page",err);
						res.sendFile(path.join(__dirname + '/index.html'));
					}else{
						console.log("Manager has registered, redirecting to manager page");
						collectionForManagementData.updateOne({manager_id : user_id}, {$set : {"pwd":hash}}, {upsert:true});
						res.sendFile(path.join(__dirname + '/index_manager.html'));
					}
				});

			}else{
			 	console.log("False key for registration of a new manager, redirecting to user page");
			 	res.sendFile(path.join(__dirname + '/index.html'));
			}
		}
	}
});
/*
// Starting https-server with local key and certificate
let server = https.createServer({
  key: fs.readFileSync(path.join(__dirname + '/server.key')),
  cert: fs.readFileSync(path.join(__dirname + '/server.cert'))
}, app);
*/
//Starting http server
let server = http.createServer(app);
server.listen(args.port, function () {
  console.log(`Express running → ADDRESS ${ip.address()} on PORT ${args.port}`);
});

mqttServerClient.on('connect', (connack) => {
	console.log('Connection status to mqtt broker',connack);
	mqttServerClient.subscribe('parking-spot/car-is-here');
	mqttServerClient.subscribe('parking-spot/image-is-taken');
	mqttServerClient.subscribe('parking-spot/nothing-is-detected');
});

process.on('SIGINT', () => {
	mongoServerClient.close(() => {
		console.log('Mongo database connection closed due to app termination');
		process.exit(0);
	});
});
