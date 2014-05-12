
// AST nodes

// function Expression (e) {
// 	return {
// 		type: "expression",
// 		e: e
// 	};
// }

// function Application (op) {
// 	var args = Array.prototype.slice.call(arguments, 1);
// 	return {
// 		type: "application",
// 		op: op,
// 		operands: args
// 	};
// }

function Message (value) {
	return {
		type: 'message',
		value: value
	};
}

function Chain (left, op, right) {
	// var args = Array.prototype.slice.call(arguments);
	var result = [];
	// args.forEach(function(message) {
	// 	result.value.push(message);
	// });
	result.push(left);
	result.push(op);
	op.value.arguments.push({type: 'chain', value: right});
	return result;
}

// Tokens

// function Id (i) {
// 	return {type: "identifier", value: i};
// }
// function Operator (i) {
// 	return {type: "operator", value: i};
// }
var input = [];//[Id('a'), Operator('+'), Id('b')];
var ptr = 0;

// function lex (str) {
// 	var allowed = /\b[0-9a-zA-Z]+\b|[-+/()~!*?:]/g;
// 	var ops = /[-+/()~!*?:]/;

// 	var match;
// 	var results = [];

// 	while (match = allowed.exec(str)) {
// 		var text = match[0];
// 		if (ops.test(text)) {
// 			results.push(Operator(text));
// 		} else {
// 			results.push(Id(text));
// 		}
// 	}
// 	results.push({type: 'EOF'});

// 	return results;
// }

function consume () {
	return input[ptr++];
}

function lookahead () {
	return input[ptr];
}

// Parser

function parseId (token) {
	return token;
}

// function parsePrefixOp (token) {
// 	var operand = parseExpression(PREFIX);
// 	return Application(token.value, [operand]);
// }

function makeInfixOp (precedence) {
	var parser = function (left, token) {
		var right = parseExpression(precedence);
		token.value.arguments.push(right);
		return {type: 'chain', value: [left, token]};
	};
	parser.precedence = precedence;
	return parser;
}

// function parsePostfixOp (left, token) {
// 	return Application(token.value, [left]);
// }

// function parseMixfixOp (left, token) {
// 	var conseq = parseExpression(CONDITIONAL);
// 	consume();
// 	var alt = parseExpression(CONDITIONAL);
// 	consume();
// 	return Application(token.value, [left, conseq, alt]);
// }

// var prefixOperators = {
// 	"+": parsePrefixOp,
// 	"-": parsePrefixOp,
// 	"~": parsePrefixOp,
// 	"!": parsePrefixOp
// };

// var ASSIGNMENT = 1;
// var CONDITIONAL = 2;
var BOOLEAN = 2;
var COMPARISON = 3;
var SUM = 4;
var PRODUCT = 5;
// var EXPONENT = 6;
// var PREFIX = 7;
// var POSTFIX = 8;
// var CALL = 9;

var otherOperators = {
	"+": makeInfixOp(SUM),
	"-": makeInfixOp(SUM),
	"*": makeInfixOp(PRODUCT),
	"==": makeInfixOp(COMPARISON),
	"and": makeInfixOp(BOOLEAN),
	// "/": makeInfixOp(PRODUCT),
//brackets
	// "?": parseMixfixOp
};

function isOperator (token) {
	return !!otherOperators[token];
}

function getPrecedence (token) {
	if (token.type === 'EOF') return 0;
	if (otherOperators[token.value.value.value]) return otherOperators[token.value.value.value].precedence;
	return 0;
}

function parseExpression (precedence) {
	var token = consume();
	
	// {
	// 	type: 'message',
	// 	value: {
	// 		type: 'symbol',
	// 		value: {
	// 			type: 'number',
	// 			value: '2'
	// 		},
	// 		arguments: []
	// 	}
	// }

	// assume there are no nested chains inside. those can be parsed with a recursive call

	var symbol = token.value;
	// var prefixParser = symbol.value.value === "number" ? parseId : prefixOperators[token.value];

	// if (!prefixParser) {
	// 	throw new Error('unrecognized token ' + token.value);
	// }

	var prefixParser = parseId; // assume there are no prefix operators for now...

	var left = prefixParser(token);

	while (precedence < getPrecedence(token = lookahead())) {
		var infixParser = otherOperators[token.value.value.value];

		if (!infixParser) {
			return left;
		}

		consume();

		left = infixParser(left, token);
		// console.log('left');
		// print(left);
	}

	return left;
}

// entry point

// var str = "+-!a";
// var str = "a + b * c";
// var str = "a * b + c";
// input = lex(str);
// console.log(input);
// console.log(JSON.stringify(parseExpression(0)));

var util = require('util');
function print (obj) {
	console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

module.exports = {
	parse: function (chain) {
		input = [];
		ptr = 0;

		if (chain.type !== 'chain') return chain;
		input = chain.value.slice();
		input.push({type: 'EOF'});
		var result = parseExpression(0);
		// console.log("=>");
		// print(result);

		return result;
		// return {type: 'chain', value: [result]};
	},
	isOperator: isOperator
};