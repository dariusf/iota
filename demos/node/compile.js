
var fs = require('fs');
var iota = require('./../../iota.js');

var args = process.argv.slice(2);
var filename = args[0] ? args[0] : 'demo.io';

fs.readFile(filename, {encoding: 'utf-8'}, function(err, data) {
	console.log(iota.compile(data, true, true));
});
