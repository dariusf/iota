
var fs = require('fs');
var path = require('path');

var compile = require('./src/compile');

var args = process.argv.slice(2);
var filename = args[0];
var runtimeLibCode = ""

if (fs.readFile) {
	// we're running in node
	fs.readFile(path.resolve(__dirname, 'src/lib.js'), {encoding: 'utf-8'}, function(err, data) {
		if (err) {
			console.log("Error reading library file:", err);
		} else {
			runtimeLibCode = data;
		}

		if (filename) {
			var filePath = filename;
			fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
				if (err) {
					console.log("Error reading", filePath, ":", err);
				} else {
					console.log(JSON.stringify(compile.parse(data), null, 4));
				}
			});

		}
		
	});
}
// else... we're running in the browser, which has its own means of acquiring lib.js

module.exports = {
	compile: function (input) {
		return (runtimeLibCode + '\n\n' + compile.compile(input)).trim();
	},
	parse: function (input) {
		return compile.parse(input);
	}
};