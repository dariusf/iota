
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
	compile: function (input, includeLibrary, boilerplate) {
		// never include the library when running in the browser
		includeLibrary = runningInNode && includeLibrary;
		
		var result = compile.compile(input);
		return includeLibrary ? (runtimeLibCode + '\n\n' + (boilerplate ? before + "\n\n" : "") + result + (boilerplate ? "\n" + after : "")).trim() : result.trim();
	},
	parse: function (input) {
		return compile.parse(input);
	}
};

var before =
	"function execute () {\n"
	+ "	var obj = this;\n"
	+ "\n"
	+ "	var localsProxy = new IoProxy(IoRootObject, function (message) {\n"
	+ "		if (obj.hasOwnProperty(message)) {\n"
	+ "			this.stopPrototypePropagation();\n"
	+ "			var args = Array.prototype.slice.call(arguments, 1);\n"
	+ "			return obj[message].apply(obj, args);\n"
	+ "		}\n"
	+ "	});\n"
	+ "\n"
	+ "	var playerProxy = new IoProxy(IoRootObject, function (message) {\n"
	+ "		if (message === 'chooseAction') {\n"
	+ "\n"
	+ "			this.stopPrototypePropagation();\n"
	+ "\n"
	+ "			var args = Array.prototype.slice.call(arguments, 1);\n"
	+ "			var slot = this.findSlot(message);\n"
	+ "			slot.activate.locals = localsProxy;\n"
	+ "\n"
	+ "			// unwrap arguments\n"
	+ "			args = args.map(function (arg) {\n"
	+ "				if (arg.type === 'Block') {\n"
	+ "					// IoMethod\n"
	+ "					return function () {\n"
	+ "						return arg.activate.apply(arg, arguments);\n"
	+ "					};\n"
	+ "				} else {\n"
	+ "					// IoStringWrapper / IoNumberWrapper / IoBooleanWrapper\n"
	+ "					return arg.slots.value;\n"
	+ "				}\n"
	+ "			});\n"
	+ "\n"
	+ "			return slot.activate.apply(slot, [IoRootObject].concat(args));\n"
	+ "		}\n"
	+ "	});\n"
	+ "\n"
	+ "	Lobby.slots['player'] = playerProxy;";

var after = "\n}";
