## Description
This project is for a mini smart parking system using HC-SR04 ultrasonic sensors in combination with a raspberryPI zero. This project utilizes another project which is an [android application using OpenALPR and Tesseract OCR](https://github.com/gabrieldimi/OpenAlprDroidApp). Communication between the raspberryPI and the server is done through python's *sys.sdtout*. The server runs on *NodeJS* and routing is accomplished through express. Each sensor is assigned a *TRIGGER* and an *ECHO* pin. The python script uses these to measure the distance of a object infront of the sensor. 
The server uses *socket.io* to emit messages to the client's browser, informing it to update its parking slot's availibility. Once the server receives a message from the python script, it sends a message to the android application that it should try to take a picture of the object in front of the camera. This image is then analysed by the software OpenALPR for a license plate. If a license plate is found, it is sent back to the server and the server sends a message to the browser.

**It is important that the client browser and the android application are connected into the wifi access point of the raspberry pi.**

## Instructions
1. Clone repo
2. Run `sudo apt-get update`
3. Run `sudo apt-get install rpi.gpio`
3. Run `sudo npm install`




