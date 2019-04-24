# Benoetigte Module werden importiert und eingerichtet
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)

# Hier wird der Eingangs-Pin deklariert, an dem der Sensor angeschlossen ist.
GPIO_PIN = 4
GPIO.setup(GPIO_PIN, GPIO.IN, pull_up_down = GPIO.PUD_UP)

# Pause  zwischen der Ausgabe des Ergebnisses wird definiert (in Sekunden)
delayTime = 0.5

# Hauptprogrammschleife
try:
	while True:
	    if GPIO.input(GPIO_PIN) == True:
	        print ('0;A1')
	    else:
	        print ('1;A1')

	    #Reset + Delay
	    time.sleep(delayTime)

# Aufraeumarbeiten nachdem das Programm beendet wurde
except KeyboardInterrupt:
	GPIO.cleanup()
