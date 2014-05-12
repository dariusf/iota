
var fs = require('fs');
var path = require('path');

var compile = require('./src/compile');

var args = process.argv.slice(2);

var filename = args[0];

var runtimeLibCode = ""

if (fs.readFile) {
	// we're running in node
	fs.readFile('lib.js', {encoding: 'utf-8'}, function(err, data) {
		runtimeLibCode = data;

		if (filename) {
			var filePath = filename;
			fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
				if (err) {
					console.log(err);
				} else {
					var generated = compile.parse(data);
					console.log(generated);
					// fs.writeFile(path.join(__dirname, "output.js"), runtimeLibCode + "\n\n" + generated + ";", function(err) {
					// 	if (err) console.log("file was not written");
					// });
					// console.log(eval(runtimeLibCode + "\n" + generated));
				}
			});

		}
		
	});
}
// else {
	// we're in the browser
	// runtimeLibCode = document.querySelectorAll('#runtimeLibCode')[0].innerHTML;
// }

module.exports = {
	parse: function (input) {
		return (runtimeLibCode + '\n\n' + compile.parse(input) + ';').trim();
	}
};