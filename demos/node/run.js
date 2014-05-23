
var fs = require('fs');
var iota = require('./../../iota.js');

var code = fs.readFileSync('demo.io', {encoding: 'utf-8'});
var _io = iota.lib;

console.log(eval(iota.compile(code, false)));
