
var compile = require('./build/compile');
var lib = require('./build/lib');
var _io = lib;

function compileCode(input, options) {
	return compile.compile(input, options).trim();
}

function parse(input, options) {
	return compile.parse(input, options);
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
