# Description

This project constructs a mini smart parking system using four main compoments, namely **two browser applications**, **a android application**, **a server** and **a raspberry pi**.

#### The system works as follows:
1. The server runs a MQTT broker and allows mqtt clients to publish and subscribe to customized topics. It also runs a nodeJS server using express. The nodeJS server delivers a html document to the client's browser, as well as renders new information when needed.  
2. The browser applications, which are, as already mentioned, served by the server, are solely there for receiving data. They use a mqtt client over Websocket and subscribe to the topics needed, in order to visualize the parking data accordingly.
3. The raspberry pi reads sensor data from a HC-SRO4 ultrasonic sensor and manipulates LED lights (red, green, yellow and blue). Once a given object is within a rang of i.e 50 cm. of the sensor (this value is saved in the config file *args.json*), the mqtt client running on the raspberry pi publishes a message to a specific topic saying that an object is present. Simultaneously, the raspberry pi subscribes to that specific topic and as soon as it receives a message, it manipulates the LED lights as wished.
4. The android application uses the paho mqtt client to publish and subscribe to the mqtt broker running on the server. Once the mqtt client running on the android application receives a message that an object is in front of a sensor, a image is taken by the smartphone's camera. That image is then analyzed by openALPR (short for, [open automatic license plate recognition](https://github.com/SandroMachado/openalpr-android.git)) for any license plate and once something is recognized, it is published and read by the browser application. The server also saves the parking data on a mongoDB database. This mongoDB collection containes documents with the following values: *__id, spot, arrival timestamp, departure timestamp, license plate text, confidence value and image*.

**It is important that the devices, on which the browser app and the android app are running, as well as the raspberry pi are connected to the same wifi network as the server is.**

#### Each parking spot is made up of the raspberry pi with its sensor and LED lights and the android application. Therefore with more hardware, more parking spots are realizable. The system is at the moment configured for 10 parking spots. ####

# Instructions for building and starting the project

## On raspberry pi
1. Clone repository with `git clone https://github.com/gabrieldimi/smart-parking.git`
2. Run `sudo apt-get update`
3. Make sure python is installed (it should already be installed on raspbian image)
4. Install the pigpio library for the sensors with `sudo apt-get install pigpio python-pigpio python3-pigpio`
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

## Here is a view of the components in relation to another.

![Component diagram](https://github.com/gabrieldimi/smart-parking/blob/mqtt_branch_extend/docs/Component_diagram.png)
