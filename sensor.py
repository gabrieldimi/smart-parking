# Benoetigte Module werden importiert und eingerichtet
import RPi.GPIO as GPIO
import time, sys

def sensorInitialize(trigger_pin,echo_pin):
	GPIO.setmode(GPIO.BOARD)
	#Matching the pin to the GPIO slots
	GPIO.setup(trigger_pin, GPIO.OUT)
	GPIO.setup(echo_pin, GPIO.IN)


def sensorMeasuring(trigger_pin,echo_pin,time_to_sleep):
	GPIO.output(trigger_pin, GPIO.LOW)
	#print('Waiting for the sensor to settle')	
	#print(sys.argv[1])	
	time.sleep(time_to_sleep)
		
	#print('Time to calculate distance')
		
	GPIO.output(trigger_pin, GPIO.HIGH)
	time.sleep(0.00001)
		
	GPIO.output(trigger_pin, GPIO.LOW)

	while GPIO.input(echo_pin) == 0:
		pulse_start_time = time.time()
	while GPIO.input(echo_pin) == 1:
		pulse_end_time = time.time();
		
	pulse_duration = pulse_end_time - pulse_start_time
	distance = round(pulse_duration * 17250, 2)
	print(distance)


if __name__ == '__main__':
	try:
		trigger = int(sys.argv[1],10)
		echo = int(sys.argv[2],10)
		sleep_time = float(sys.argv[3])
		sensorInitialize(trigger,echo)
		while True:
			sensorMeasuring(trigger,echo,sleep_time)
	finally:
		GPIO.cleanup()

	
