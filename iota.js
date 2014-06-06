
var fs = require('fs');
var path = require('path');

var compile = require('./src/compile');
var lib = require('./src/lib');

function compileCode(input, options) {
	options = options || {};
	compile.setOptions(options);
	var result = compile.compile(input);
	return result.trim();
}

function parse(input, options) {
	options = options || {};
	compile.setOptions(options);
	return compile.parse(input);
}

module.exports = {
	compile: compileCode,
	parse: parse,
	lib: lib
};
