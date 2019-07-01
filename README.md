## Description
This project is for a mini smart parking system with four main compoments, namely **a browser application**, **a android application**, **a server** and **a raspberry pi**. The browser application serves as visualization of the smart parking system and uses for its implementation simple Javascript and HTML along with the following libraries: jQuery, MQTT.js and Bootstrap. The android application serves as a license plate recognizer and uses openALPR and a paho mqtt client (see [android application using OpenALPR and Tesseract OCR](https://github.com/gabrieldimi/OpenAlprDroidApp).

The system works as follows:
1. The server runs a MQTT broker and allows mqtt clients to publish and subscribe to customized topics. It also runs a nodeJS server using express and delivers the HTML files to the browser client. 
2. The browser application, which is, as already mentioned, served by the server, is solely there for receiving data. It uses a mqtt client over Websockets and subscribes to the topics needed, in order to visualize the parking data accordingly.
3. On the raspberry pi, sensor data is read from HC-SRO4 ultrasonic sensors and LED lights (red, green, yellow and blue) are manipulated. Once a given object is within a rang of i.e 50 cm. of the sensor (this value is saved in the config file), the mqtt client running on the raspberry pi publishes to a specific topic with a message saying that an object is present. Simultaneously, the raspberry pi subscribes to that specific topic and as soon as it receives a message, it manipulates the LED lights as wished.
4. The android application uses the paho mqtt client to publish and subscribe to the mqtt broker running on the server. Once the mqtt client running on the android application receives a message that an object is in front of a sensor, a image is taken by the smartphone's camera. That image is then analyzed by openALPR (short for, open automatic license plate recognition) for any license plate and once something is recognized, it is published and read by the browser application. The server also saves the parking data on a mongoDB database. The saved data has the following values: *__id, spot, timestamp, confidence and image*.


**It is important that the client browser and the android application are connected to the wifi access point of the raspberry pi.**

# Instructions for building and starting project

## On raspberry pi
1. Clone repository with `git clone https://github.com/gabrieldimi/smart-parking.git`
2. Run `sudo apt-get update`
3. Make sure python is installed (it should already be installed on raspbian image)
4. Install the GPIO library for the sensors with `sudo apt-get install rpi.gpio`
5. Make sure pip is installed, if not install with `sudo apt-get install python-pip`
6. Install paho mqtt client with `sudo pip install paho-mqtt`
7. Install `sudo npm install`
8. `cd Pi/`
9. Check **args.json** to configure GPIO pins and mqtt address
10. Use pm2 to run application or alternatively run with `node pi_node.js`

## On server

1. Clone repository with `git clone https://github.com/gabrieldimi/smart-parking.git`
2. Run `sudo apt-get update`
3. Make sure python and node are installed
4. Install mosquitto mqtt broker with
    - `sudo apt-add-repository ppa:mosquitto-dev/mosquitto-ppa`
    - `sudo apt-get update`
    - `sudo apt-get install mosquitto`(read online for details on configuring mosquitto (also for mqtt over Websocket)
    - start mosquitto broker
5. Install `sudo npm install`
6. Check **args.json** to change mqtt and node server address
6. Use pm2 to run application or alternatively run with `node server.js`

## On android application
Take a look at the readme from [android application using OpenALPR and Tesseract OCR](https://github.com/gabrieldimi/OpenAlprDroidApp)
