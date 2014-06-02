
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
	result = (options.boilerplate ? boilerplateBefore(options) : "") + result + (options.boilerplate ? boilerplateAfter : "");

	return result.trim();
}

function parse(input) {
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

function boilerplateBefore (options) {
	name = options.functionName || "plan";
	var prefix = options.omitLobbyPrefix ? "_" : "_io."

	return "function " + name + " () {\n" +
	"	var obj = this || {};\n" +
	"\n" +
	"	var localsProxy = _io.IoProxy(" + prefix + "Lobby, function (message) {\n" +
	"		if (obj.hasOwnProperty(message)) {\n" +
	"			this.stopPrototypePropagation();\n" +
	"			var args = Array.prototype.slice.call(arguments, 1);\n" +
	"			args = args.map(_io.unwrapIoValue);\n" +
	"			return _io.wrapJSValue(obj[message].apply(obj, args));\n" +
	"		}\n" +
	"	});\n" +
	"\n" +
	"	var playerProxy = _io.IoProxy(" + prefix + "Lobby, function (message) {\n" +
	"		if (message === 'chooseAction') {\n" +
	"			this.stopPrototypePropagation();\n" +
	"			var slot = this.findSlot(message);\n" +
	"			slot.activate.locals = localsProxy;\n" +
	"			return slot.activate.apply(slot);\n" +
	"		}\n" +
	"	});\n" +
	"\n" +
	"	" + prefix + "Lobby.slots['player'] = playerProxy;\n\n";
}

var boilerplateAfter = "\n\n}";
