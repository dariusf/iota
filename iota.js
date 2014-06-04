
var fs = require('fs');
var path = require('path');

var compile = require('./src/compile');
var lib = require('./src/lib');

var args = process.argv.slice(2);
var filename = args[0];

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

if (filename) {
	var code = fs.readFileSync(path.resolve(__dirname, filename), {encoding: 'utf-8'});
	console.log(JSON.stringify(parse(code), null, 4));
}

module.exports = {
	compile: compileCode,
	parse: parse,
	lib: lib
};
