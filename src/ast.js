

// var Type = Object.freeze({
// 	"String": {},
// 	"Number": {},
// 	"Identifier": {},
// });

// A chain is a left-associative application of zero or more messages

function Chain (messages) {
	// Preconditions
	console.assert(Array.isArray(messages));
	messages.forEach(function (msg) {
		console.assert(msg.type === 'message');
		// console.assert(msg instanceof Message);
	});

	this.type = 'chain'; // get rid of this eventually
	this.value = messages;
}
Chain.prototype.getMessages = function () {
	return this.value;
};

// A message is a symbol plus arguments

function Message (symbol) {
	// Preconditions
	console.assert(symbol instanceof Symbol);
	// console.assert(Array.isArray(arguments));
	// TODO arguments are either messages or chains?

	this.type = 'message'; // get rid of this eventually
	// this.symbol = symbol;
	// this.arguments = arguments;
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
	// console.assert(type === Type.String || type === Type.Number || type === Type.Identifier);
	// console.assert(type === 'string' || type === 'number' || type === 'identifier');
	console.assert(literal instanceof Literal);
	console.assert(Array.isArray(arguments));
	// console.assert(Array.isArray(arguments));
	// TODO arguments are either messages or chains?

	this.type = 'symbol';
	this.value = literal;
	this.arguments = arguments;
}
Symbol.prototype.getLiteralType = function () {
	return this.value.getValue();
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

module.exports = {
	Chain: Chain,
	Message: Message,
	Symbol: Symbol,
	Literal: Literal,
};
