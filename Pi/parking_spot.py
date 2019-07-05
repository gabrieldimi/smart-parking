import RPi.GPIO as GPIO
import paho.mqtt.client as mqtt
import time, sys, os, json, threading, uuid
from datetime import datetime

class UUIDEncoder(json.JSONEncoder):
	def default(self, object):
		if isinstance(object,uuid.UUID):
			return object.hex
		return json.JSONEncoder.default(self,object)

class myThread (threading.Thread):
	def __init__(self, threadID, name, yellow_pin, blue_pin):
		threading.Thread.__init__(self)
		self.threadID = threadID
		self.name = name
		self.yellow_pin = yellow_pin
		self.blue_pin = blue_pin
		self.thread_working = True
		self.do_blink = False
		self.taken = False
		self.alpr_recognition_done = False
	def run(self):
		blink(self.yellow_pin,self.blue_pin)


def blink(yellow_pin,blue_pin):
	GPIO.setmode(GPIO.BOARD)
	GPIO.setup(yellow_pin, GPIO.OUT)
	GPIO.output(yellow_pin, GPIO.LOW)
	GPIO.setup(blue_pin, GPIO.OUT)
	GPIO.output(blue_pin, GPIO.LOW)
	t = threading.currentThread()
	while getattr(t,"thread_working"):

		while getattr(t, "do_blink"):
			GPIO.output(yellow_pin, GPIO.HIGH)
			time.sleep(blink_speed)
			GPIO.output(yellow_pin, GPIO.LOW)
			time.sleep(blink_speed)

		if getattr(t,"alpr_recognition_done") and getattr(t, "taken"):
			GPIO.output(blue_pin,GPIO.HIGH)
		else:
			GPIO.output(blue_pin,GPIO.LOW)

def on_message(client, userdata, message):
	msg = str(message.payload.decode("utf-8"))
	msg_as_json = json.loads(msg)
	print("Message topic:", message.topic)
	try:

		if msg_as_json['spot'] is not None:
			if msg_as_json['spot'] == spot_number:
				if message.topic == car_is_here:
					if msg_as_json['spot_status']:
						blink_thread.do_blink = True
						blink_thread.taken = True
					else:
						blink_thread.do_blink = False
						blink_thread.alpr_recognition_done = False
						blink_thread.taken = False
				elif message.topic == image_is_taken:
					blink_thread.do_blink = False
					blink_thread.alpr_recognition_done = True

	except NameError:
			print("This variable is not defined")

def on_connect(client, userdata, flags, rc):
	print("Connected to broker.",client._host,"at port", client._port)
	client.subscribe(image_is_taken)
	client.subscribe(car_is_here)

def pinsInitialization():
	GPIO.setmode(GPIO.BOARD)
	#Matching the pins to the GPIO slots
	GPIO.setup(trigger_pin, GPIO.OUT)
	GPIO.setup(echo_pin, GPIO.IN)
	GPIO.setup(red_pin, GPIO.OUT)
	GPIO.setup(green_pin, GPIO.OUT)
	GPIO.setwarnings(False)


def sensorMeasuring():
	GPIO.output(trigger_pin, GPIO.LOW)
	#print('Waiting for the sensor to settle')
	time.sleep(time_to_sleep);

	GPIO.output(trigger_pin, GPIO.HIGH)
	time.sleep(0.00001)

	GPIO.output(trigger_pin, GPIO.LOW)

	global pulse_start_time
	global pulse_end_time
	global spot_taken
	global spot_free
	global uuid_for_mongo
	global arrival

	while GPIO.input(echo_pin) == 0:
		pulse_start_time = time.time()
	while GPIO.input(echo_pin) == 1:
		pulse_end_time = time.time()

	pulse_duration = pulse_end_time - pulse_start_time
	measured_distance = round(pulse_duration * 17150, 2)

	if measured_distance <= desired_distance:
		if not spot_taken:
			print("Spot is taken.")
			uuid_for_mongo = json.dumps(uuid.uuid4(), cls=UUIDEncoder).strip('\"')
			GPIO.output(red_pin, GPIO.HIGH)
			GPIO.output(green_pin, GPIO.LOW)
			arrival = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
			client.publish(car_is_here,json.dumps({ 'uuid' : uuid_for_mongo, 'spot' : spot_number,'spot_status': True, 'sender' : 'pi', 'arrival' : arrival, 'departure' : '-'}))
			spot_taken = True
			spot_free = False
	else:
		if not spot_free:
			print("Spot is free")
			GPIO.output(green_pin, GPIO.HIGH)
			GPIO.output(red_pin, GPIO.LOW)
			client.publish(car_is_here,json.dumps({ 'uuid' : uuid_for_mongo, 'spot' : spot_number,'spot_status': False,'sender' : 'pi', 'arrival' : arrival, 'departure' : datetime.now().strftime("%d-%m-%Y %H:%M:%S")}))
			spot_free = True
			spot_taken = False
	
	print("Distance measured:",measured_distance)

if __name__ == '__main__':
	try:
		with open('args.json') as arguments:
			args = json.load(arguments)['arguments']
			#print(json.dumps(args))
		try:
			BROKER_ADDRESS = args['mqtt_ip']
			client = mqtt.Client('pi_sensors')
			client.on_connect = on_connect
			client.on_message = on_message
			client.connect(BROKER_ADDRESS)
			print("Connecting to MQTT broker:",BROKER_ADDRESS)
			client.loop_start()
			
			trigger_pin = args['sensor_trigger']
			echo_pin = args['sensor_echo']
			red_pin = args['red_pin']
			green_pin = args['green_pin']
			yellow_pin = args['yellow_pin']
			blue_pin = args['blue_pin']
			desired_distance = float(args['desired_distance'])
			time_to_sleep = float(args['time_to_sleep'])
			spot_number = args['id_number_of_sensor']

			car_is_here = args['topics'][0]
			image_is_taken = args['topics'][1]

			pulse_start_time = 0.0
			pulse_end_time = 0.0
			spot_taken = False
			spot_free = False
			uuid_for_mongo = None
			arrival = None

			blink_speed = float(args['blink_speed'])
			blink_thread = myThread(1,"alpr_recognition",yellow_pin,blue_pin)
			blink_thread.start()

			pinsInitialization()
			while True:
				time.sleep(0.01)
				sensorMeasuring()

		finally:
			GPIO.cleanup()
			blink_thread.thread_working = False
			blink_thread.join()

	except (Exception, KeyboardInterrupt) as ex:
		template = "An exception of type {0} occurred. Arguments:\n{1!r}"
		message = template.format(type(ex).__name__, ex.args)
		sys.stderr.write(message)
		try:
			print("Trying to exit with sys.exit(0)")
			blink_thread.thread_working = False
			blink_thread.join()
			GPIO.cleanup()
			sys.exit(0)
		except SystemExit:
			print("Sys.exit(0) did not work, trying to exit with os.exit(0)")
			os._exit(0)