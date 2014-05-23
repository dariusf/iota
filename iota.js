
var fs = require('fs');
var path = require('path');

var compile = require('./src/compile');
var lib = require('./src/lib');

var args = process.argv.slice(2);
var filename = args[0];

function compileCode(input, boilerplate) {
	var result = compile.compile(input);

	result = (boilerplate ? boilerplateBefore : "") + result + (boilerplate ? boilerplateAfter : "");

	return result.trim();
}

function parse(input) {
	return compile.parse(input);
}

if (filename) {
	var code = fs.readFileSync(path.resolve(__dirname, filename));
	console.log(JSON.stringify(parse(code)));
}

module.exports = {
	compile: compileCode,
	parse: parse,
	lib: lib
};

var boilerplateBefore =
	"function execute () {\n" +
	"	var obj = this;\n" +
	"\n" +
	"	var localsProxy = new IoProxy(IoRootObject, function (message) {\n" +
	"		if (obj.hasOwnProperty(message)) {\n" +
	"			this.stopPrototypePropagation();\n" +
	"			var args = Array.prototype.slice.call(arguments, 1);\n" +
	"			return obj[message].apply(obj, args);\n" +
	"		}\n" +
	"	});\n" +
	"\n" +
	"	var playerProxy = new IoProxy(IoRootObject, function (message) {\n" +
	"		if (message === 'chooseAction') {\n" +
	"\n" +
	"			this.stopPrototypePropagation();\n" +
	"\n" +
	"			var args = Array.prototype.slice.call(arguments, 1);\n" +
	"			var slot = this.findSlot(message);\n" +
	"			slot.activate.locals = localsProxy;\n" +
	"\n" +
	"			// unwrap arguments\n" +
	"			args = args.map(function (arg) {\n" +
	"				if (arg.type === 'Block') {\n" +
	"					// IoMethod\n" +
	"					return function () {\n" +
	"						return arg.activate.apply(arg, arguments);\n" +
	"					};\n" +
	"				} else {\n" +
	"					// IoStringWrapper / IoNumberWrapper / IoBooleanWrapper\n" +
	"					return arg.slots.value;\n" +
	"				}\n" +
	"			});\n" +
	"\n" +
	"			return slot.activate.apply(slot, [IoRootObject].concat(args));\n" +
	"		}\n" +
	"	});\n" +
	"\n" +
	"	Lobby.slots['player'] = playerProxy;\n" +
	"\n" +
	"\n";

var boilerplateAfter = "\n\n}";
