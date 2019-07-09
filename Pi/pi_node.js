let {PythonShell} = require('python-shell');

let pythonShellOptions = {
	mode: 'text',
	pythonOptions: ['-u'], // get print results in real-time
};

let shell = new PythonShell('parking_spot.py', pythonShellOptions);
let shell_process = '';

let last_uuid_from_sensor = '';

let timeFromLastMessageFromSensor = Date.now();

failFast(5000);
startPythonScript();

function failFast( milliseconds ){

	setInterval(function() {
		console.log('SERVER_INFO Running...');
		if((Date.now() - timeFromLastMessageFromSensor) > (milliseconds+500)){ 
			console.log('SERVER_INFO Restarting python script...');
			shell_process.stdin.pause();
			shell_process.stdout.pause();
			shell_process.kill();
			pythonShellOptions.args = [last_uuid_from_sensor];
			shell = new PythonShell('parking_spot.py', pythonShellOptions);
			startPythonScript();
		}
	}, milliseconds);

}

function startPythonScript(){
	shell.on('stderr', function (stderr) {
		console.log('STDERR',stderr);
	});

	shell.on('message', function(info){

		timeFromLastMessageFromSensor = Date.now();
		let info_split = info.split(':');
		if(info_split[0] === 'UUID'){
			last_uuid_from_sensor = info_split[1].trim();
			console.log(last_uuid_from_sensor)
		}
		//console.log('INFO', info)
	});

	shell.end(function (err,code,signal) {
		console.log('Python shell ended.');
		console.log('The exit code was: ' + code);
		console.log('The exit signal was: ' + signal);
		if(err){
			console.log('Closing...',err);
		}
	});

	shell_process = shell.childProcess;