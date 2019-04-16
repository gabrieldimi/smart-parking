const express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

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
	console.log(socket);
	socket.emit('spot taken','A1');
});


/*
"scripts": {
    "start": "npm start"
  },

"pm2": "^2.10.3"
*/

