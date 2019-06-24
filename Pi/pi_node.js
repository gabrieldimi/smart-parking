let {PythonShell} = require('python-shell');

let pythonShellOptions = {
	mode: 'text',
	pythonOptions: ['-u'], // get print results in real-time
};

let shell = new PythonShell('parking_spot.py', pythonShellOptions);
let shell_process = '';

let timeFromLastMessageFromSensor = Date.now();

failFast(5000);
startPythonScript();

function failFast( milliseconds ){

	setInterval(function() {
		console.log('Server still running',(Date.now() - timeFromLastMessageFromSensor));
		if((Date.now() - timeFromLastMessageFromSensor) > (milliseconds+500)){ 
			console.log('Restarting python script');
			shell_process.stdin.pause();
			shell_process.stdout.pause();
			shell_process.kill();
			shell = new PythonShell('sensor.py', pythonShellOptions);
			startPythonScript();
		}
	}, milliseconds);

}

function startPythonScript(){
	shell.on('stderr', function (stderr) {
		console.log('Stderr',stderr);
	});

	shell.on('message', function(status){

		timeFromLastMessageFromSensor = Date.now();
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
}