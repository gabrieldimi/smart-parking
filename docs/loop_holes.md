# Bugs which can be used later

- Alpr doesn't care about depth. Any object (be it a photo, poster or a signpost etc.) with a license plate number written on it will be     recognized and in that way, it doesn't have to necessarily be a car standing in front of the ultrasonic sensor.
- If car is changed quick enough, the newly parked one will not be analyzed.
- It is possible to publish messages to the mqtt broker remotely. This means that a intruder could send publish messages to the broker that   a car is parked at spot 1 but in reality nothing is there.
- Standard administrator credentials are set up.
- DDoS attack is possible, because system is scalable, which means that many IoT devices are connected to system.
- Major privacy issue due to the server saving data about each parking procedure. The server saves at the moment the following data of each   procedure
  - Parking spot location
  - License plate number as text
  - License plate number as image (image includes the car itself)
  - Timestamp
-

