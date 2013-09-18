TeamCity Raspberry Pi Notifications
====================================
A simple TeamCity notification client for the Raspberry PI. Provides support for notifications via the Speaker and lighting control.

Requirement
===========
You will need to copy settings.sample.json to a new file called "settings.json" and update it to include your TeamCity Specific information.


Concept
=======
The core concept behind the project is based around Teams, where each team has a single owner, and a set of projects that they are working on (that needs to be monitored).  Each team is also associated to a "Good Light" and a "Bad Light".  Good light is triggered with the build is good, and the bad light when the build is broken.

Right now, for audio notifications it leverages a module "node-tts-google", which relies on node-speaker; which has issues running on Windows (basically stalls); so we disable audio notifications when this app is run on windows.

Also, if you want the light automation portion to be working, this must be run on a Rasberry Pi.  

See https://npmjs.org/package/pi-gpio for light <-> pin setup for each project.

