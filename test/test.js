
var fs = require('fs');
var path = require('path');
var iota = require('./../iota');

function isNotDirectory (filename) {
	return !fs.statSync(path.resolve(__dirname, filename)).isDirectory();
}

function splitExt (filename) {
	var temp = filename.split(/\./g);
	var ext = temp.pop();
	return [temp.join('.'), ext];
}

function normalize (str) {
	return str.replace(/\r/g, "").trim();
}

var files = fs.readdirSync(__dirname)
	.filter(isNotDirectory)
	.map(splitExt)
	.filter(function(f) {return f[1] === 'in';})
	.map(function(f) {return f[0];});

var count = 0;
var passed = 0;

files.forEach(function (file) {
	var filepath = path.resolve(__dirname, file);
	var contents = fs.readFileSync(filepath + '.in', {encoding: 'utf-8'});
	var expected = fs.readFileSync(filepath + '.out', {encoding: 'utf-8'});

	count++;

	console.log('------------------------');

	try {
		var result = iota.compile(contents);

		if (normalize(result) === normalize(expected)) {
			console.log('Test passed:', file);
			passed++;
		} else {
			console.log('Test failed (different result):', file);
			console.log('Expected:', expected);
			console.log('Result:', result);
		}
	} catch (e) {
		console.log('Test failed (exception thrown):', file);
		console.log('Error:', e);
		console.trace();
	}


});

console.log('------------------------');
console.log(count + ' tests run, ' + passed + ' passed.\n');
