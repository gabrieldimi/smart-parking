## Description
This project is for a mini smart parking system using HC-SR04 ultrasonic sensors in combination with a raspberryPI zero. Communication between the raspberryPI and the server is done through python's *sys.sdtout*. The server runs on *NodeJS* and routing is accomplished through express. It is possilbe to connect multiple sensors to the raspberryPI and simulate up to now 12 different parking slots. Each sensor is assigned a *TRIGGER* and an *ECHO* pin. The python script uses these to measure the distance of a object infront of the sensor. 
The server uses *socket.io* to emit messages to the client's browser, informing it to update its parking slot's availibility.

## Instructions
1. Clone repo
2. Run `sudo apt-get update`
3. Run `sudo apt-get install rpi.gpio`
3. Run `sudo npm install`




