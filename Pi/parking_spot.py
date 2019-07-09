import pigpio
import paho.mqtt.client as mqtt
import time, sys, os, json, threading, uuid, sonar_ranger
from datetime import datetime

class UUIDEncoder(json.JSONEncoder):
	def default(self, object):
		if isinstance(object,uuid.UUID):
			return object.hex
		return json.JSONEncoder.default(self,object)

class myThread (threading.Thread):
	def __init__(self, threadID, name):
		threading.Thread.__init__(self)
		self.threadID = threadID
		self.name = name
		self.thread_working = True
		self.do_blink = False
		self.taken = False
		self.alpr_recognition_done = False
	def run(self):
		blink()

def blink():
	t = threading.currentThread()
	while getattr(t,"thread_working"):

		while getattr(t, "do_blink"):
			pi.write(yellow_gpio,1)
			time.sleep(blink_speed)
			pi.write(yellow_gpio,0)
			time.sleep(blink_speed)

		if getattr(t,"alpr_recognition_done") and getattr(t, "taken"):
			pi.write(blue_gpio,1)
		else:
			pi.write(blue_gpio,0)

def on_message(client, userdata, message):
	msg = str(message.payload.decode("utf-8"))
	msg_as_json = json.loads(msg)
	#print("Message topic:", message.topic)
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

	except NameError as error:
			print("This variable is not defined:",error)

def on_connect(client, userdata, flags, rc):
	#print("Connected to broker.",client._host,"at port", client._port)
	client.subscribe(image_is_taken)
	client.subscribe(car_is_here)

def setToDefault(isBegin):
	pi.write(red_gpio,0)
	pi.write(yellow_gpio,0)
	pi.write(blue_gpio,0)
	if isBegin:
		pi.write(green_gpio,1)
	else:
		pi.write(green_gpio,0)

def sensorMeasuring():
	global spot_taken
	global spot_free
	global uuid_for_mongo

	measured_distance = float(sonar.read()) / 100

	if measured_distance <= desired_distance:
		if not spot_taken:
			#print("Spot is taken.")
			if uuid_for_mongo is None:
				uuid_for_mongo = json.dumps(uuid.uuid4(), cls=UUIDEncoder).strip('\"')
				print("UUID:",uuid_for_mongo)

			pi.write(red_gpio,1)
			pi.write(green_gpio,0)
			client.publish(car_is_here,json.dumps({ 'uuid' : uuid_for_mongo, 'spot' : spot_number, 'spot_status': True, 'sender' : 'pi', 'arrival' : datetime.now().strftime("%d-%m-%Y %H:%M:%S") }))
			spot_taken = True
			spot_free = False
	else:
		if not spot_free:
			#print("Spot is free")
			pi.write(green_gpio,1)
			pi.write(red_gpio,0)
			client.publish(car_is_here,json.dumps({ 'uuid' : uuid_for_mongo, 'spot' : spot_number, 'spot_status': False, 'sender' : 'pi', 'departure' : datetime.now().strftime("%d-%m-%Y %H:%M:%S") }))
			uuid_for_mongo = None
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
			trigger_gpio = args['sensor_trigger']
			echo_gpio = args['sensor_echo']
			red_gpio = args['red_gpio']
			green_gpio = args['green_gpio']
			yellow_gpio = args['yellow_gpio']
			blue_gpio = args['blue_gpio']
			desired_distance = float(args['desired_distance'])
			time_to_sleep = float(args['time_to_sleep'])
			spot_number = args['id_number_of_sensor']
			car_is_here = args['topics'][0]
			image_is_taken = args['topics'][1]

			client = mqtt.Client('pi_sensors')
			client.on_connect = on_connect
			client.on_message = on_message
			client.connect(BROKER_ADDRESS)
			print("Connecting to MQTT broker:",BROKER_ADDRESS)
			client.loop_start()

			spot_taken = False
			spot_free = False
			uuid_for_mongo = None

			pi = pigpio.pi()
			sonar = sonar_ranger.ranger(pi, trigger_gpio, echo_gpio)
			blink_speed = float(args['blink_speed'])
			blink_thread = myThread(1,"alpr_recognition")
			blink_thread.start()

			setToDefault(True)

			if len(sys.argv) > 1:
				uuid_for_mongo = sys.argv[1]

			while True:
				sensorMeasuring()
				time.sleep(time_to_sleep);

		finally:
			blink_thread.thread_working = False
			blink_thread.join()
			sonar.cancel()
			setToDefault(False)
			pi.stop()

	except (Exception, KeyboardInterrupt) as ex:
		template = "An exception of type {0} occurred. Arguments:\n{1!r}"
		message = template.format(type(ex).__name__, ex.args)
		sys.stderr.write(message)
		try:
			print("Trying to exit with sys.exit(0)")
			sys.exit(0)
		except SystemExit:
			print("Sys.exit(0) did not work, trying to exit with os.exit(0)")
			os._exit(0)