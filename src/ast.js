
// var Type = Object.freeze({
// 	"String": {},
// 	"Number": {},
// 	"Identifier": {},
// });

// A chain is a left-associative application of zero or more messages
function Chain (messages) {
	// Preconditions
	assertArray(messages, assertMessage);

	this.type = 'chain'; // TODO remove eventually
	this.value = messages;
}
Chain.prototype.getMessages = function () {
	return this.value;
};
Chain.prototype.setMessages = function (messages) {
	this.value = messages;
};

// A message is a symbol plus arguments

function Message (symbol) {
	// Preconditions
	assertSymbol(symbol);
	// TODO arguments are either messages or chains?

	this.type = 'message'; // TODO remove eventually
	this.value = symbol;
}
Message.prototype.getSymbolValue = function () {
	return this.value.getLiteralValue();
};
Message.prototype.getSymbolType = function () {
	return this.value.getLiteralType();
};
Message.prototype.getArguments = function () {
	return this.value.getArguments();
};

// A symbol is anything that may serve as a literal value:
// a number, string, or idenfitier

function Symbol (literal, arguments) {
	// Preconditions
	assertLiteral(literal);
	assertArray(arguments);
	// TODO arguments are either messages or chains?

	this.type = 'symbol'; // TODO remove eventually
	this.value = literal;
	this.arguments = arguments;
}
Symbol.prototype.getLiteralType = function () {
	return this.value.getType();
}
Symbol.prototype.getLiteralValue = function () {
	return this.value.getValue();
}
Symbol.prototype.getArguments = function () {
	return this.arguments;
}

function Literal (type, value) {
	console.assert(type === 'string' || type === 'number' || type === 'identifier')
	this.type = type;
	this.value = value;
}
Literal.prototype.getType = function () {
	return this.type;
};
Literal.prototype.getValue = function () {
	return this.value;
};

function isChain (node) {
	return node instanceof Chain;
}
function isMessage (node) {
	return node instanceof Message;
}
function isSymbol (node) {
	return node instanceof Symbol;
}
function isLiteral (node) {
	return node instanceof Literal;
}

function assertChain (node) {
	console.assert(isChain(node), node + ' is not a Chain');
}
function assertMessage (node) {
	console.assert(isMessage(node), node + ' is not a Message');
}
function assertSymbol (node) {
	console.assert(isSymbol(node), node + ' is not a Symbol');
}
function assertLiteral (node) {
	console.assert(isLiteral(node), node + ' is not a Literal');
}
function assertArray (node, pred) {
	console.assert(Array.isArray(node), node + ' is not a array');
	if (pred) {
		node.forEach(pred);
	}
}

module.exports = {
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
