
var fs = require('fs');
var path = require('path');

var compile = require('./src/compile');

var args = process.argv.slice(2);
var filename = args[0];
var runtimeLibCode = ""

var runningInNode = !!fs.readFile;

if (runningInNode) {
	runtimeLibCode = fs.readFileSync(path.resolve(__dirname, 'src/lib.js'), {encoding: 'utf-8'});

	if (filename) {
		var data = fs.readFileSync(filename, {encoding: 'utf-8'});
		console.log(JSON.stringify(compile.parse(data), null, 4));
	}
}
// else... we're running in the browser, which has its own means of acquiring lib.js

module.exports = {
	compile: function (input, includeLibrary) {
		// never include the library when running in the browser
		includeLibrary = runningInNode && includeLibrary;

		var result = compile.compile(input);
		return includeLibrary ? (runtimeLibCode + '\n\n' + result).trim() : result.trim();
	},
	parse: function (input) {
		return compile.parse(input);
	}
};