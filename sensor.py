# Benoetigte Module werden importiert und eingerichtet
import RPi.GPIO as GPIO
import time, sys

try:
	while True:
		GPIO.setmode(GPIO.BOARD)
		# Hier wird der Eingangs-Pin deklariert, an dem der Sensor angeschlossen ist.
		PIN_TRIGGER = 7
		PIN_ECHO = 11
		
		GPIO.setup(PIN_TRIGGER, GPIO.OUT)
		GPIO.setup(PIN_ECHO, GPIO.IN)
		
		GPIO.output(PIN_TRIGGER, GPIO.LOW)

		#print('Waiting for the sensor to settle')
		#print(sys.argv[1])
		time.sleep(float(sys.argv[1]))
		
		#print('Time to calculate distance')
		
		GPIO.output(PIN_TRIGGER, GPIO.HIGH)

		time.sleep(0.00001)
		
		GPIO.output(PIN_TRIGGER, GPIO.LOW)

		while GPIO.input(PIN_ECHO) == 0:
			pulse_start_time = time.time()
		while GPIO.input(PIN_ECHO) == 1:
			pulse_end_time = time.time();
		
		pulse_duration = pulse_end_time - pulse_start_time
		distance = round(pulse_duration * 17250, 2)
		print(distance)

finally:
	GPIO.cleanup()
