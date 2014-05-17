
var fs = require('fs');
var path = require('path');

var compile = require('./src/compile');

var args = process.argv.slice(2);
var filename = args[0];

var runtimeLibCode = fs.readFileSync(__dirname + '/src/lib.js', {encoding: 'utf-8'});
var boilerplateBefore = fs.readFileSync(__dirname + '/src/boilerplate/before.js', {encoding: 'utf-8'});
var boilerplateAfter = fs.readFileSync(__dirname + '/src/boilerplate/after.js', {encoding: 'utf-8'});

function compileCode(input, includeLibrary, boilerplate) {
	var result = compile.compile(input);

	result = (boilerplate ? boilerplateBefore : "") + result + (boilerplate ? boilerplateAfter : "");
	result = includeLibrary ? (runtimeLibCode + result) : result;

	return result.trim();
}

function parse(input) {
	return compile.parse(input);
}

if (filename) {
	var code = fs.readFileSync(path.resolve(__dirname, filename), {encoding: 'utf-8'});
	console.log(JSON.stringify(parse(code)));
}

module.exports = {
	compile: compileCode,
	parse: parse
};