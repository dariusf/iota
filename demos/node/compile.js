
var fs = require('fs');
var iota = require('./../../iota.js');

fs.readFile('demo.io', {encoding: 'utf-8'}, function(err, data) {
	console.log(iota.compile(data));
});
