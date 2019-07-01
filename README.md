## Description
This project is for a mini smart parking system with four main compoments, namely a browser application ,a android application, a server and a raspberry pi. The browser application serves as visualization of the smart parking system and uses for its implementation simple Javascript and HTML along with the following libraries: jQuery, MQTT.js and Bootstrap. The android application serves as a license plate recognizer and uses openALPR and a paho mqtt client (see [android application using OpenALPR and Tesseract OCR](https://github.com/gabrieldimi/OpenAlprDroidApp).

The system works as follows:
1. The server runs a MQTT broker and allows mqtt clients to publish and subscribe to customized topics. It also runs a nodeJS server using express and delivers the HTML files to the browser client. 
2. The browser application, which is, as already mentioned, served by the server, is solely there for receiving data. It uses a mqtt client over Websockets and subscribes to the topics needed, in order to visualize the parking data accordingly.
3. On the raspberry pi, sensor data is read from HC-SRO4 ultrasonic sensors and LED lights (red, green, yellow and blue) are manipulated. Once a given object is within a rang of i.e 50 cm. of the sensor (this value is saved in the config file), the mqtt client running on the raspberry pi publishes to a specific topic with a message saying that an object is present. Simultaneously, the raspberry pi subscribes to that specific topic and as soon as it receives a message, it manipulates the LED lights as wished.
4. The android application uses the paho mqtt client to publish and subscribe to the mqtt broker running on the server. Once the mqtt client running on the android application receives a message that an object is in front of a sensor, a image is taken by the smartphone's camera. That image is then analyzed by openALPR (short for, open automatic license plate recognition) for any license plate and once something is recognized, it is published and read by the browser application. The server also saves the parking data on a mongoDB database. The saved data has the following values: ____id, spot, timestamp, confidence and image __.









The server runs a MQTT broker from mosquitto and a nodeJS server. For this project, a raspberry pi zero has been used to read and write data from sensors and to led lights. Communication between the raspberryPI and the server is done through python's *sys.sdtout*. The server runs on *NodeJS* and routing is accomplished through express. Each sensor is assigned a *TRIGGER* and an *ECHO* pin. The python script uses these to measure the distance of a object infront of the sensor. 
The server uses *socket.io* to emit messages to the client's browser, informing it to update its parking slot's availibility. Once the server receives a message from the python script, it sends a message to the android application that it should try to take a picture of the object in front of the camera. This image is then analysed by the software OpenALPR for a license plate. If a license plate is found, it is sent back to the server and the server sends a message to the browser.

**It is important that the client browser and the android application are connected into the wifi access point of the raspberry pi.**

## Instructions
1. Clone repo
2. Run `sudo apt-get update`
3. Run `sudo apt-get install rpi.gpio`
3. Run `sudo npm install`




