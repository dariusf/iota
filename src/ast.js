// @flow

// var Type = Object.freeze({
// 	"String": {},
// 	"Number": {},
// 	"Identifier": {},
// });

class Expr {
}

// A chain is a left-associative application of zero or
// more messages
class Chain extends Expr {

	type: string; // TODO remove eventually
	messages: Array<Message>;

	constructor(messages: Array<Message>) {
		super();
		this.type = 'chain';
		this.messages = messages;
	}
}

// A message is a symbol plus arguments
class Message extends Expr {

	type: string; // TODO remove eventually
	value: Symbol;

	constructor(symbol: Symbol) {
		super();
		// Preconditions
		assertSymbol(symbol);
		// TODO arguments are either messages or chains?

		this.type = 'message'; // TODO remove eventually
		this.value = symbol;
	}

	getSymbolValue() {
		return this.value.getLiteralValue();
	}

	getSymbolType() {
		return this.value.getLiteralType();
	}

	getArguments() {
		return this.value.getArguments();
	}
}

// A symbol is anything that may serve as a literal value:
// a number, string, or idenfitier

class Symbol extends Expr {
	type: string;
	value: Literal;
	args: Array<Expr>;

	constructor(literal: Literal, args: Array<Expr>) {
		super();
		// Preconditions
		assertLiteral(literal);
		assertArray(args);
		// TODO arguments are either messages or chains?

		this.type = 'symbol'; // TODO remove eventually
		this.value = literal;
		this.args = args;
	}

	getLiteralType() {
		return this.value.getType();
	}

	getLiteralValue() {
		return this.value.getValue();
	}

	getArguments() {
		return this.args;
	}
}

function Literal (type: 'string' | 'number' | 'identifier', value: string | number) {
	this.type = type;
	this.value = value;
}
Literal.prototype.getType = function () {
	return this.type;
};
Literal.prototype.getValue = function () {
	return this.value;
};

function isChain (node: Chain) {
	return node instanceof Chain;
}
function isMessage (node: Message) {
	return node instanceof Message;
}
function isSymbol (node: Symbol) {
	return node instanceof Symbol;
}
function isLiteral (node: Literal) {
	return node instanceof Literal;
}

function assertChain (node: Chain) {
	console.assert(isChain(node), node.toString() + ' is not a Chain');
}

function assertMessage (node: Message) {
	console.assert(isMessage(node), node.toString() + ' is not a Message');
}

function assertSymbol (node: Symbol) {
	console.assert(isSymbol(node), node.toString() + ' is not a Symbol');
}

function assertLiteral (node: Literal) {
	console.assert(isLiteral(node), node.toString() + ' is not a Literal');
}

function assertArray (node: Array<Expr>, pred?: Object => bool) {
	console.assert(Array.isArray(node), node.toString() + ' is not a array');
	if (pred) {
		node.forEach(pred);
	}
}

module.exports = {
	Expr,
	Chain: Chain,
	Message: Message,
	Symbol: Symbol,
	Literal: Literal,
	
	isChain: isChain,
	isMessage: isMessage,
	isSymbol: isSymbol,
	isLiteral: isLiteral,

	assertChain: assertChain,
	assertMessage: assertMessage,
	assertSymbol: assertSymbol,
	assertLiteral: assertLiteral,
	assertArray: assertArray,
};
