
//includes
var tts = require("node-tts-google").tts;
var fs = require('fs');
var http = require('http');
var util = require('util');
var request = require("request");
var wait = require('wait.for');
var exec = require('child_process').exec, child;

var platform = process.platform;
var isWin32 = (platform == "win32");
var isRaspberry = (platform == "linux" && process.arch == "arm");
var gpio;

if(isRaspberry) {
	gpio = require("pi-gpio");
}

//global bit flags and settings
var FAILURE = "FAILURE";
var SUCCESS = "SUCCESS";
var BUILDING = "BUILDING";
var UNKNOWN = "UNKNOWN";
var pollInterval = 1000 * 10;
var outputAudio = !isWin32;
var outputLights = isRaspberry;

//See https://npmjs.org/package/pi-gpio 
//For light <-> pin setup

var rootUrl;
var builds;


//additional place holders for status and states
//holds the last build status for each build
var previousStatus = {};

//holds the current state of each light per build/project
var lightStates = {};


//Primary entry point
function main() {

	var file = __dirname + '/settings.json';

	fs.readFile(file, 'utf8', function (err, data) {
		if (err) {
			console.log('Error: ' + err);
			return;
		}

		data = JSON.parse(data);
		rootUrl = data.uri;
		builds = data.builds;
		console.dir(data);
		run();
	});

}

function run() {

	//grab the status right away, and perform notification operations
	wait.launchFiber(poll);

	//setup our timer interval to constantly check
	setInterval(function() { wait.launchFiber(poll) }, pollInterval);


	//create an http end point to expose some useful status data
	//also usefully blocks the thread from exiting
	http.createServer(function (req, res) {
	  res.writeHead(200, {'Content-Type': 'application/json'});
	  res.write(JSON.stringify({ "builds" : builds, "previous" : previousStatus, "lightStates" : lightStates}));
	  res.end();
	}).listen(8000);	
}


function getIndividualBuildStatus(options, build, project) {
	
	request(options , function(error, response, body) {
		if(error) {
			console.log("error:", error);
		} else {
			var result = JSON.parse(body);
			var status = (result.status || UNKNOWN);
			var lastStatus = UNKNOWN;

			var previous = previousStatus[project.id];
			if(previous) lastStatus = previous.status;

			if(!result.status) result.status = status;
			var trigger = false;

			if(!previous) {
				trigger = (status!=SUCCESS || status!=BUILDING);
			} else {
				trigger = (lastStatus != status);
			}

			if(trigger) {
				triggerEvent(options, build, project, result);
			}

			previousStatus[project.id] = result;
		}
	});		
}
function getBuildStatus(build) {
	for(var project in build.projects) {
		var p = build.projects[project];
		var options = {
				  "uri" : rootUrl.replace("{0}", p.id)
				, "headers" : {"Accept" : "application/json"}

			}
		getIndividualBuildStatus(options, build, p);
	}

}


function poll() {
	console.log('poll called');

	for(var build in builds) {
		var b = builds[build];
		getBuildStatus(b);
	}
}

function triggerEvent(options, build, project, result) {

	var previous = previousStatus[project.id];
	var resolvedStatus = resolveStatus(build, project, result, previous);

	lightStates[build.id + "." + project.id] = resolvedStatus;

	console.log("TRIGGERED", resolvedStatus.text);

	if(outputAudio) {
		downloadAndPlayBuildStatus(resolvedStatus);
	}


	controlLights(resolvedStatus.goodLight, resolvedStatus.badLight, resolvedStatus.goodLightStatus, resolvedStatus.badLightStatus);

}

function downloadAndPlayBuildStatus(resolvedStatus) {
	var text = resolvedStatus.text;
	text = text.replace("_", "%20");
	text = text.replace(" ", "%20");
	
	tts.speak(text);
	
}

function resolveStatus(build, project, current, last) {


	var currentStatus = current.status;
	var lastStatus = UNKNOWN;
	if(last && last.status) lastStatus = last.status;

	var username = UNKNOWN;
	if(current.triggered && current.triggered.user && current.triggered.user.username) username = (current.triggered.user.username || UNKNOWN);

	var status = "For: " + project.id + " it Was:" + lastStatus + " is:" + currentStatus + " by:" + build.owner;

	var goodLightStatus = 0;
	var badLightStatus = 0;

	if(lastStatus == UNKNOWN) {
		if(currentStatus == SUCCESS) {
			status = project.id + " is building fine";
			goodLightStatus = 1;
			badLightStatus = 0;
		}
		if(currentStatus == FAILURE) {
			status = project.id + " is broken";
			goodLightStatus = 0;
			badLightStatus = 1;
		}
	}
	if(lastStatus == SUCCESS) {
		if(currentStatus == UNKNOWN) {
			status = "There is something wrong with the " + project.id + "build";
			goodLightStatus = 1;
			badLightStatus = 1;
		}
		if(currentStatus == FAILURE) {
			status = project.id + " has been broken by " + username + "";
			goodLightStatus = 0;
			badLightStatus = 1;
		}
	}

	if(lastStatus == FAILURE) {
		if(currentStatus == UNKNOWN) {
			status = "There is something wrong with the " + project.id + "build";
			goodLightStatus = 1;
			badLightStatus = 1;
		}
		if(currentStatus == SUCCESS) {
			status = project.id + " has been fixed by " + username;
			goodLightStatus = 1;
			badLightStatus = 0;
		}
	}

	if(isWin32) end = "";
	status = status + end;

	return { "text" : status, "goodLight" : build.goodLight, "badLight" : build.badLight, "goodLightStatus" : goodLightStatus, "badLightStatus" : badLightStatus };

}

function controlLights(goodLight, badLight, goodLightStatus, badLightStatus) {
	if(outputLights) {
		if(isRaspberry) {
			gpio.open(goodLight, "output", function(err) {        // Open pin 16 for output
			    gpio.write(goodLight, goodLightStatus, function() {            // Set pin 16 high (1)
			        gpio.close(goodLight);                        // Close pin 16
			    });
			});		
			gpio.open(badLight, "output", function(err) {        // Open pin 16 for output
			    gpio.write(badLight, badLightStatus, function() {            // Set pin 16 high (1)
			        gpio.close(badLight);                        // Close pin 16
			    });
			});		
		} else {
			console.log('Good Light ('+goodLight+'):' + goodLightStatus)
			console.log('Bad Light ('+badLight+'):' + badLightStatus)
		}
	}
}


main();







