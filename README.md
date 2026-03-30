# 🦅 Edge C2 Simulator: Voice-Controlled Hardware-in-the-Loop

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Hardware](https://img.shields.io/badge/Hardware-Arduino_Uno-blue)
![Tech](https://img.shields.io/badge/Tech-Web_Serial_API-orange)

An offline Aerospace Command and Control (C2) simulation system featuring Natural Language Processing (NLP) at the edge, a "Human-in-the-Loop" authorization protocol, and real-time physical telemetry using an Arduino-based Pan-Tilt servo mechanism.

> 🎥 **[Insert a GIF or YouTube link here showing you giving a voice command and the physical Pan-Tilt moving smoothly]**

## 🚀 Key Features

* **🎙️ Edge Voice Command:** Utilizes the Web Speech API to process military/aviation jargon locally, without relying on cloud servers.
* **⚙️ Hardware-in-the-Loop (HITL):** Seamlessly translates virtual flight kinematics (Pitch, Roll, Heading) into physical movements using a Pan-Tilt base connected via the Web Serial API.
* **🛡️ Tactical Protocols:** Implements a strict Readback/Execution workflow. The AI proposes maneuvers (or reacts to Datalink orders) and waits for operator confirmation before moving the physical actuators.
* **🚨 Emergency Overrides:** Built-in threat response routines, including Evasive Maneuvers, Electronic Warfare (Jamming) fallback, and Mayday descents.
* **💾 Telemetry Blackbox:** Logs all system events, commands, and autopilot states, allowing the operator to export a `.txt` report directly from the browser memory.

## 🧠 The Engineering Challenge: Bridging Web and Physics

One of the main challenges in this project was synchronizing a 50fps web-based physics engine with physical servo motors without causing mechanical jitter or system crashes. 

This was solved by implementing two core control strategies:

1.  **Deadband Filter (Software Side):** Implemented in JavaScript to prevent the system from flooding the USB port. The UI only sends telemetry to the hardware if the angle change exceeds a minimum threshold (2 degrees), ignoring microscopic physics calculations.
2.  **Kinematic Smoothing / Easing (Hardware Side):** Instead of forcing the servos to jump instantly to the target coordinates, the C++ firmware utilizes an inertia algorithm (`current += (target - current) * 0.05`). This guarantees buttery-smooth diagonal movements across the Pan-Tilt axes, mimicking the weight and inertia of a real aircraft.

## 🛠️ Architecture & Technologies

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Browser APIs:** Web Speech API (NLP), Web Serial API (Hardware Bridge), Canvas API (Artificial Horizon Render)
* **Hardware:** Arduino Uno/Nano, 2x SG90/MG995 Servo Motors (Pan-Tilt Configuration)
* **Firmware:** C++ (Arduino IDE)

## 🔌 Hardware Setup

1. Assemble the Pan-Tilt mechanism with the two servo motors.
2. Connect the **Tilt** servo signal to Digital Pin `9`.
3. Connect the **Pan** servo signal to Digital Pin `10`.
4. Connect the power (`5V`) and ground (`GND`) wires. *(Note: For stable operation during rapid combined movements, an external 5V power supply for the servos is highly recommended to prevent Arduino brownouts).*

## 💻 How to Run

1.  Flash the `firmware.ino` code into your Arduino.
2.  Close the Arduino IDE (to free up the COM port).
3.  Open `index.html` in **Google Chrome** or **Microsoft Edge** (Required for Web Serial API support).
4.  Click **"🔌 Conectar Cabo USB"** and select your Arduino COM port.
5.  Click **"🎙️ Ligar Rádio"** and give a command (e.g., *"Sistema, curva à direita com 40 graus e subir 20 graus"*).
6.  Say *"Executa"* to authorize the physical movement.

## 🤝 Acknowledgments
Developed during a Hackathon focusing on aerospace human-machine interfaces and offline tactical edge computing.
