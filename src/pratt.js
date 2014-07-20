
var ast = require('./ast');

function Chain (left, op, right) {
	var result = new ast.Chain([left, op]);
	// TODO Should this be a chain instead? .push(new ast.Chain([right]))?
	// should be sorted out when the exact type of the args list is determined
	op.getArguments().push([right]);
	return result;
}

// Parser

var input = [];
var ptr = 0;

function consume () {
	return input[ptr++];
}

function lookahead () {
	return input[ptr];
}

// Token-handling

function parseId (token) {
	return token;
}

// function parsePrefixOp (token) {
// 	var operand = parseExpression(PREFIX);
// 	return Application(token.value, [operand]);
// }

function makeInfixOp (precedence) {
	var parser = function (left, op) {
		var right = parseExpression(precedence);
		return Chain(left, op, right);
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
	// "?": parseMixfixOp
};

function isOperator (token) {
	return !!otherOperators[token];
}

function getPrecedence (token) {
	if (token.type === 'EOF') return 0;

	var opParser = otherOperators[token.getSymbolValue()];
	if (opParser) return opParser.precedence;

	return 0;
}

function parseExpression (precedence) {
	var message = consume();
	
	// var prefixParser = symbol.value.value === "number" ? parseId : prefixOperators[message.value];
	// if (!prefixParser) {
	// 	throw new Error('unrecognized message ' + message.value);
	// }
	var prefixParser = parseId; // Assume there are no prefix operators for now
	var left = prefixParser(message);

	while (precedence < getPrecedence(message = lookahead())) {
		var infixParser = otherOperators[message.getSymbolValue()];

		if (!infixParser) {
			return left;
		}

		consume();

		left = infixParser(left, message);
	}

	return left;
}

module.exports = {
	parse: function (chain) {
		// Don't accept anything but a chain
		if (!(ast.isChain(chain))) return chain;

		// Initialize parser
		ptr = 0;
		input = chain.getMessages().slice();
		input.push({type: 'EOF'});

		return parseExpression(0);
	},
	isOperator: isOperator
};