
var fs = require('fs');
var iota = require('./../../iota.js');

var code = fs.readFileSync('demo.io', {encoding: 'utf-8'});
console.log(JSON.stringify(iota.parse(code), null, 4));
