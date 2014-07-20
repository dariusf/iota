
var iota = require('../iota');
var prompt = 'iota> '

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdout.write(prompt);
process.stdin.on('data', function(text) {
	if (text === 'quit\n' || text === 'exit\n') {
		return done();
	}
	var result;
	try {
		result = iota.eval(text);
	} catch (e) {
		result = e.toString();
	}
	try {
		process.stdout.write(transform(result));
	} catch (e) {
		console.log('Error attempting to write ' + result + ' to stdout');
	}
	process.stdout.write('\n' + prompt);
});

function transform (result) {
	if (result === undefined) return 'undefined';
	if (result === null) return 'null';
	return result.toString();
}

function done() {
	process.exit();
}