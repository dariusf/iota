
var fs = require('fs');
var path = require('path');

var compile = require('./src/compile');

var args = process.argv.slice(2);
var filename = args[0];

var runtimeLibCode = fs.readFileSync(__dirname + '/src/lib.js', {encoding: 'utf-8'});
var boilerplateBefore = fs.readFileSync(__dirname + '/src/boilerplate/before.js', {encoding: 'utf-8'});
var boilerplateAfter = fs.readFileSync(__dirname + '/src/boilerplate/after.js', {encoding: 'utf-8'});

module.exports = {
	compile: function (input, includeLibrary, boilerplate) {
		var result = compile.compile(input);

		result = (boilerplate ? boilerplateBefore : "") + result + (boilerplate ? boilerplateAfter : "");
		result = includeLibrary ? (runtimeLibCode + result) : result;

		return result.trim();
	},
	parse: function (input) {
		return compile.parse(input);
	}
};