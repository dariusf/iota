
var fs = require('fs');
var path = require('path');
var iota = require('./../../src/iota.js');

fs.readFile(path.join(__dirname, 'demo.io'), {encoding: 'utf-8'}, function(err, data) {
	eval(iota.parse(data));
});
