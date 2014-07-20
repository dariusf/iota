
var escodegen = require('escodegen');
var astTypes = require('ast-types');
var n = astTypes.namedTypes;
var b = astTypes.builders;

var parser = require('./parser');
var pratt = require('./pratt');
var ast = require('./ast');

var options = {};

function setOptions (userOptions) {
	options.wrapWithFunction = userOptions.wrapWithFunction || false;
	options.useProxy = userOptions.useProxy || false;
	options.functionName = userOptions.functionName || 'io';
	options.runtimeLib = userOptions.runtimeLib || '_io';
	options.self = userOptions.self || 'self';
}

function applyMacros (ast) {

	// A sequence is a list of chains -- a b; c d; e
	// A chain is a list of messages -- a b c
	// A message's arguments are a list of sequences -- a b; c d, e f; g h
	// An AST is a sequence

	infixOperatorMacro(ast);
	assignmentOperatorMacro(ast);

	return ast;
}

function findChainsInSequence (sequence) {

	// Performs a post-order traversal of a sequence (usually the AST)
	// and returns a list of references to all chain objects

	var allChains = [];
	function find (sequence) {
		sequence.forEach(function (chain) {
			if (chain instanceof ast.Chain) {
				chain.getMessages().forEach(function (message) {
					message.getArguments().forEach(function (arg) {
						find(arg);
					});
				});
				allChains.push(chain);
			}
		});
	}
	find(sequence);
	return allChains;
}

function assignmentOperatorMacro (astSequence) {

	// Rewrites messages containing assignment operators
	// with setSlot messages

	var chains = findChainsInSequence(astSequence);

	while (chains.length > 0) {
		var chain = chains.pop();

		for (var i=0; i<chain.getMessages().length; i++) {
			var message = chain.getMessages()[i];

			// Find an assignment operator
			if (message.getSymbolValue() !== ":=") continue;

			// Pick the previous two elements in the chain.
			// They are the target and the slot on the target that
			// is being assigned:
			// a b := c

			var target, slotName;

			if (i === 0) {
				// := b
				throw new Error("SyntaxError: no target for assignment operator");
			} else if (i === 1) {
				// a := b

				// target defaults to Lobby
				// TODO: even in method bodies! this has to be
				// done during compilation when scope is known

				target = new ast.Message(new ast.Symbol(new ast.Literal('identifier', 'Lobby'), []));
				slotName = chain.getMessages()[0];
			} else {
				// a b := c
				target = chain.getMessages()[i-2];
				slotName = chain.getMessages()[i-1];
			}

			// Rewrite the chain

			// var current = chain.getMessages()[i];
			// var prevTwo = chain.getMessages().slice(Math.max(i-2,0), i);
			var beforeThose = chain.getMessages().slice(0, Math.max(i-2, 0));
			var after = chain.getMessages().slice(i+1, chain.getMessages().length);

			var rhs = new ast.Chain(after);
			var assignmentSlot = new ast.Chain([
				new ast.Message(
					new ast.Symbol(
						new ast.Literal('string', slotName.getSymbolValue()), [])
					)]);

			var setSlot = new ast.Message(
				new ast.Symbol(
					new ast.Literal('identifier', 'setSlot'),
					[[assignmentSlot], [rhs]]
				));

			chain.setMessages(beforeThose.concat([target, setSlot]));

			// Continue on the newly created chain in case it contains
			// more operators
			chains.push(rhs);

			break;
		
		}
	}
}

function infixOperatorMacro (astSequence) {

	// Rearranges all chains containing operators into properly
	// nested messages based on precedence

	var chains = findChainsInSequence(astSequence).filter(function (chain) {

		// Skip chains that cannot possibly contain operators
		if (chain.getMessages().length <= 1) return false;

		// A chain will be processed if it contains at least one operator
		// message with no arguments (meaning that message hasn't been processed yet)
		var hasAnOperator = chain.getMessages().filter(function (message) {
			return pratt.isOperator(message.getSymbolValue()) && message.getArguments().length === 0;
		}).length > 0;

		return hasAnOperator;
	});

	chains.forEach(function (chain) {
		chain.setMessages(pratt.parse(chain).getMessages());
	});
}

function parse (code) {

	var astSequence = parser.parse(code);

	astSequence = applyMacros(astSequence);

	var generated = astSequence.map(function (chain) {

		var proxy = b.callExpression(
			b.memberExpression(
				libraryIdentifier("Proxy"),
				b.identifier("set"),
				false),
			[b.identifier(options.self)])

		var topLevelContext = options.useProxy ? proxy : libraryIdentifier('Lobby');

		return compile(chain, topLevelContext, topLevelContext);
	});
	
	generated = b.program(generated.map(b.expressionStatement));

	if (options.wrapWithFunction) {
		generated.body[generated.body.length-1] = implicitReturnStatement(generated.body[generated.body.length-1]);
		generated = wrapInFunction(generated);
	}

	return generated;
}

function parseAndEmit (code) {
	return escodegen.generate(parse(code));
}

function wrapInFunction (program) {

	var bodyBlockStatement = b.blockStatement([
		b.variableDeclaration("var", [
			b.variableDeclarator(
				b.identifier(options.self),
				b.logicalExpression(
					"||",
					b.thisExpression(),
					b.objectExpression([])))])
		].concat(program.body));

	var propertyAccess = options.functionName.indexOf('.') !== -1;

	if (propertyAccess) {
		return b.expressionStatement(
			b.assignmentExpression(
				"=",
				b.identifier(options.functionName),
				b.functionExpression(null, [], bodyBlockStatement)));
	}
	else {
		return b.program([
			b.functionDeclaration(
				b.identifier(options.functionName),
				[],
				bodyBlockStatement)]);
	}
}

function implicitReturnStatement(expressionStatement) {

	function unwrap(expr) {
		return b.callExpression(
			b.memberExpression(
				b.identifier(options.runtimeLib),
				b.identifier("unwrapIoValue"),
				false),
			[expr]);
	}
	return b.returnStatement(unwrap(expressionStatement.expression));
}

function getEnclosingRange (exprlist) {
	function priority (s, c) {
		// line number must be smaller
		// if line number is tied, column must be smaller
	    return c.line < s.line ? c : (c.line === s.line && c.column < s.column ? c : s);
	};

	var inf = {
	    line: Infinity,
	    column: Infinity
	};

	var locInfo = exprlist
		.map(function(node) {return node.loc;})
		.filter(function(node) {return !!node;});

	if (locInfo.length > 0) {
		var start = locInfo.map(function(node) {return node.start;}).reduce(priority, inf);
		var end = locInfo.map(function(node) {return node.end;}).reduce(priority, inf);

		return {start: start, end: end};
	}

	return null;
}

function compile (node, receiver, localContext) {
	var result = {};

	if (ast.isChain(node)) {
		//  A chain is a series of left-associative messages
		var chain = node;
		var messages = chain.getMessages();

		var current;
		messages.forEach(function (message) {
			// The receiver of a message in a chain is the preceding one
			current = compile(message, receiver, localContext);
			receiver = current;
		});
		return current;
	}
	else if (ast.isMessage(node)) {
		var message = node;
		var symbolValue = message.getSymbolValue();
		var symbolType = message.getSymbolType();

		if (symbolType === 'number') {
			result = b.callExpression(
				libraryIdentifier('IoNumberWrapper'),
				[b.literal(+symbolValue)]);
		}
		else if (symbolType === 'string') {
			result = b.callExpression(
				libraryIdentifier('IoStringWrapper'),
				[b.literal(symbolValue)]);
		}
		else if (symbolType === 'identifier') {
			var jsMessageName = new b.literal(symbolValue);

			// Build the JS expression _io.receiver.send(...args)
			result = b.callExpression(
				b.memberExpression(receiver, b.identifier("send"), false),
				[jsMessageName].concat(message.getArguments().map(function (arg) {
					 // arg is a sequence -- a list of chains of messages.
					 // It gets turned into a ,-delimited JS expression.
					var result = b.sequenceExpression(
						arg.map(function (realarg) {
                            return compile(realarg, localContext, localContext);
                        }));
                    return result;
				})));

			// If the message is a special form, rewrite the resulting JS syntax tree
			if (symbolValue === "method") {

				// Replace the generated arguments
				result.arguments = [jsMessageName].concat(message.getArguments().map(function (arg) {
					// Arguments will have the locals object as context
					// arg is a sequence here also
                    return b.sequenceExpression(arg.map(function (realarg) {
						return compile(realarg, b.identifier("locals"), b.identifier("locals"));
                    }));
				}));

				// Turn all arguments but the last and first to strings;
				// they will be sent as messages to the locals object

				for (var i = 1; i < result.arguments.length - 1; i++) {
					// Each argument is a SequenceExpression
					// Grab the last expression in each sequence; it will be of the form locals.send('messageName')
					// Extract the string 'messageName' and replace the argument with it
					result.arguments[i] = result.arguments[i].expressions[result.arguments[i].expressions.length-1].arguments[0];
				}

				// The last becomes a thunk

				var lastArgument = result.arguments[result.arguments.length - 1];
				var methodBody = lastArgument;

				result.arguments[result.arguments.length - 1] = b.callExpression(
					libraryIdentifier('IoThunk'),
					[
						b.functionExpression(
							null,
							[b.identifier("locals")],
							b.blockStatement([b.returnStatement(methodBody)]))
					]);
			}
			else if (symbolValue === "if") {

				// Convert last two arguments into thunks
				// TODO handle cases where if statements have < 3 arguments

				var conseq = result.arguments[2];
				result.arguments[2] = b.callExpression(
					libraryIdentifier('IoThunk'),
					[b.functionExpression(null, [], b.blockStatement([b.returnStatement(conseq)]))]);

				var alt = result.arguments[3];
				result.arguments[3] = b.callExpression(
					libraryIdentifier('IoThunk'),
					[b.functionExpression(null, [], b.blockStatement([b.returnStatement(alt)]))]);
			}
		}
	} else {
		console.assert(false, 'Unrecognized symbol type: ' + symbolType);
	}

	return result;
}

function libraryIdentifier (id) {
	return b.memberExpression(
		b.identifier(options.runtimeLib),
		b.identifier(id),
		false);
}

module.exports = {
	parse: parse,
	compile: parseAndEmit,
	setOptions: setOptions,
};
