var gpio = require("pi-gpio");
var on = false;

var t = process.argv[2];
console.log(t);
if(t=="true") on = true;

console.log(on);
if(on) {

//on
			gpio.open(12, "output", function(err) {        // Open pin 16 for output
			    gpio.write(12, 1, function() {            // Set pin 16 high (1)
			        gpio.close(12);                        // Close pin 16
			    });
			});		

} else {
//off


			gpio.open(12, "output", function(err) {        // Open pin 16 for output
			    gpio.write(12, 0, function() {            // Set pin 16 high (1)
			        gpio.close(12);                        // Close pin 16
			    });
			});		
}