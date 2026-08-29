/*
====================================================
 IoT-Based Fire and Smoke Detection System

 ESP32 + MQ-2 Smoke Sensor
 ESP32 + DHT22 Temperature Sensor
 ESP32 + Flame Sensor

 Features:
 - Real-time Fire Monitoring
 - Smoke Detection
 - Temperature Monitoring
 - Flame Detection
 - OLED Display
 - Alarm System
 - IoT API Ready

====================================================
*/


#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>


// ==========================
// OLED CONFIG
// ==========================

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  -1
);


// ==========================
// SENSOR CONFIG
// ==========================

#define MQ2_SENSOR 34

#define FLAME_SENSOR 35

#define DHT_PIN 4
#define DHT_TYPE DHT22


DHT dht(
  DHT_PIN,
  DHT_TYPE
);


// ==========================
// OUTPUT CONFIG
// ==========================

#define GREEN_LED 14
#define YELLOW_LED 27
#define RED_LED 26

#define BUZZER 25

#define RESET_BUTTON 33



// ==========================
// FIRE THRESHOLD
// ==========================

#define SMOKE_THRESHOLD 3000

#define TEMP_THRESHOLD 50



// ==========================
// VARIABLES
// ==========================

int smokeValue;

int flameValue;

float temperature;


bool fireState=false;

bool oledReady = false;


// ==========================
// FUNCTION PROTOTYPES
// ==========================

void normalState();
void fireAlert();
void resetSystem();
void showDisplay(String title, String message);
void sendFireEvent();
void sendTelemetry();



// ==========================
// SETUP
// ==========================

void setup(){


Serial.begin(115200);
delay(250);

Serial.println();
Serial.println("[BOOT] Fire detection system starting...");
Serial.println("[BOOT] Initializing sensors, display, and telemetry stream.");

Wire.begin(21, 22);



pinMode(
MQ2_SENSOR,
INPUT
);


pinMode(
FLAME_SENSOR,
INPUT
);



pinMode(
GREEN_LED,
OUTPUT
);


pinMode(
YELLOW_LED,
OUTPUT
);


pinMode(
RED_LED,
OUTPUT
);


pinMode(
BUZZER,
OUTPUT
);



pinMode(
RESET_BUTTON,
INPUT_PULLUP
);



dht.begin();



oledReady = display.begin(
SSD1306_SWITCHCAPVCC,
0x3C
);

if(
!oledReady
){


Serial.println(
"[WARN] OLED init failed, continuing with serial output only."
);


} else {


showDisplay(
"SYSTEM START",
"READY"
);


}



delay(2000);



normalState();



Serial.println(
"[BOOT] FIRE DETECTION SYSTEM READY"
);



}





// ==========================
// MAIN LOOP
// ==========================

void loop(){



// RESET BUTTON

if(
digitalRead(RESET_BUTTON)==LOW
){

resetSystem();

delay(500);

}



// READ SENSOR VALUES

smokeValue =
analogRead(MQ2_SENSOR);



temperature =
dht.readTemperature();



flameValue =
digitalRead(FLAME_SENSOR);



// DHT ERROR CHECK

if(
isnan(temperature)
){

temperature=25;

}



// DEBUG MONITOR


Serial.println("================");
Serial.printf(
  "[SENSORS] smoke=%d ppm | temperature=%.1f C | flame=%d\n",
  smokeValue,
  temperature,
  flameValue
);

Serial.print(
"Smoke Level: "
);

Serial.println(
smokeValue
);


Serial.print(
"Temperature: "
);

Serial.println(
temperature
);


Serial.print(
"Flame Status: "
);

Serial.println(
flameValue
);




// FIRE EVALUATION


bool smokeAlert =
smokeValue > SMOKE_THRESHOLD;


bool temperatureAlert =
temperature > TEMP_THRESHOLD;


bool flameAlert =
flameValue == LOW;



if(
smokeAlert ||
temperatureAlert ||
flameAlert
){


fireAlert();


}

else{


normalState();


}



delay(1000);

sendTelemetry();



}





// ==========================
// NORMAL STATE
// ==========================

void normalState(){


fireState=false;



digitalWrite(
GREEN_LED,
HIGH
);


digitalWrite(
YELLOW_LED,
LOW
);


digitalWrite(
RED_LED,
LOW
);


noTone(BUZZER);



showDisplay(
"SYSTEM NORMAL",
"Monitoring"
);



}



// ==========================
// FIRE ALERT
// ==========================

void fireAlert(){


bool wasFireState = fireState;

fireState=true;



digitalWrite(
GREEN_LED,
LOW
);


digitalWrite(
YELLOW_LED,
HIGH
);


digitalWrite(
RED_LED,
HIGH
);



tone(
BUZZER,
2500
);



showDisplay(
"!!! FIRE !!!",
"ALERT"
);

if(
!wasFireState
){

sendFireEvent();

}



}





// ==========================
// RESET SYSTEM
// ==========================

void resetSystem(){


fireState=false;


digitalWrite(
GREEN_LED,
HIGH
);


digitalWrite(
YELLOW_LED,
LOW
);


digitalWrite(
RED_LED,
LOW
);


noTone(BUZZER);



showDisplay(
"SYSTEM",
"RESET"
);



Serial.println(
"SYSTEM RESET"
);



}





// ==========================
// OLED DISPLAY
// ==========================

void showDisplay(
String title,
String message
){


if(
!oledReady
){

return;

}



display.clearDisplay();


display.setTextColor(
WHITE
);



display.setTextSize(1);


display.setCursor(
0,
0
);


display.println(title);



display.println();



display.setTextSize(2);


display.println(message);



display.display();



}





// ==========================
// LARAVEL API READY
// ==========================

void sendFireEvent(){



Serial.print(
"{\"type\":\"fire_event\",\"device_id\":\"FIRE-SYSTEM-001\",\"event\":\"FIRE DETECTED\",\"alarm\":true,\"timestamp\":"
);

Serial.print(
millis()
);

Serial.print(
",\"smoke_level\":"
);

Serial.print(
smokeValue
);

Serial.print(
",\"temperature\":"
);

Serial.print(
temperature
);

Serial.println(
"}"
);

Serial.println(
"[EVENT] FIRE DETECTED"
);
Serial.flush();



}


// ==========================
// TELEMETRY STREAM
// ==========================

void sendTelemetry(){


Serial.print(
"{\"type\":\"telemetry\",\"device_id\":\"FIRE-SYSTEM-001\",\"alarm\":"
);

Serial.print(
fireState ? "true" : "false"
);

Serial.print(
",\"timestamp\":"
);

Serial.print(
millis()
);

Serial.print(
",\"smoke\":"
);

Serial.print(
smokeValue
);

Serial.print(
",\"temperature\":"
);

Serial.print(
temperature
);

Serial.print(
",\"flame\":"
);

Serial.print(
flameValue
);

Serial.print(
",\"fire\":"
);

Serial.print(
fireState ? "true" : "false"
);

Serial.println(
"}"
);

Serial.flush();



}
