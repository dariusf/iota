
var compile = require('./src/compile');
var lib = require('./src/lib');
var _io = lib;

function compileCode(input, options) {
	options = options || {};
	compile.setOptions(options);
	var result = compile.compile(input);
	return result.trim();
}

function parse(input, options) {
	options = options || {};
	compile.setOptions(options);
	return compile.parse(input);
}

function evaluate (code) {
	if (code === '') return null;
	var context = {};
	eval(compileCode(code, {
		wrapWithFunction: true,
		functionName: 'context.run'
	}));
	return context.run();
}

module.exports = {
	compile: compileCode,
	parse: parse,
	lib: lib,
	eval: evaluate,
};
