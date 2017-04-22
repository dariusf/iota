// @flow

var escodegen = require('escodegen');
var astTypes = require('ast-types');
var n = astTypes.namedTypes;
var b = astTypes.builders;

var parser = require('./parser');
var pratt = require('./pratt');
var ast = require('./ast');

// import { Expr } from './ast';

type Options = {
	wrapWithFunction: boolean,
	useProxy: boolean,
	functionName: string,
	runtimeLib: string,
	self: string,
};

type JSAST = Object;

type AST = Array<ast.Expr>;

var defaultOptions: Options = {
    wrapWithFunction: false,
	useProxy: false,
	functionName: 'io',
	runtimeLib: '_io',
	self: 'self',
};

function useDefaultOptions(options: Options) {
  options = options || {};
  return {
    ... defaultOptions,
    ... options
  };
}

function applyMacros(ast: AST) {

	// A sequence is a list of chains -- a b; c d; e
	// A chain is a list of messages -- a b c
	// A message's arguments are a list of sequences -- a b; c d, e f; g h
	// An AST is a sequence

	infixOperatorMacro(ast);
	assignmentOperatorMacro(ast);

	return ast;
}

function findChainsInSequence(sequence: AST) {

	// Performs a post-order traversal of a sequence (usually the AST)
	// and returns a list of references to all chain objects

	var allChains = [];
	function find (sequence: AST) {
		sequence.forEach(function (chain: ast.Expr) {
			if (chain instanceof ast.Chain) {
				chain.messages.forEach(function (message) {
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

function assignmentOperatorMacro(astSequence: AST) {

	// Rewrites messages containing assignment operators
	// with setSlot messages

	var chains = findChainsInSequence(astSequence);

	while (chains.length > 0) {
		var chain = chains.pop();

		for (var i=0; i<chain.messages.length; i++) {
			var message = chain.messages[i];

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
				slotName = chain.messages[0];
			} else {
				// a b := c
				target = chain.messages[i-2];
				slotName = chain.messages[i-1];
			}

			// Rewrite the chain

			// var current = chain.messages[i];
			// var prevTwo = chain.messages.slice(Math.max(i-2,0), i);
			var beforeThose = chain.messages.slice(0, Math.max(i-2, 0));
			var after = chain.messages.slice(i+1, chain.messages.length);

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

			chain.messages = beforeThose.concat([target, setSlot]);

			// Continue on the newly created chain in case it contains
			// more operators
			chains.push(rhs);

			break;
		
		}
	}
}

function infixOperatorMacro(astSequence: AST) {

	// Rearranges all chains containing operators into properly
	// nested messages based on precedence

	var chains = findChainsInSequence(astSequence).filter(function (chain) {

		// Skip chains that cannot possibly contain operators
		if (chain.messages.length <= 1) return false;

		// A chain will be processed if it contains at least one operator
		// message with no arguments (meaning that message hasn't been processed yet)
		var hasAnOperator = chain.messages.filter(function (message) {
			return pratt.isOperator(message.getSymbolValue()) && message.getArguments().length === 0;
		}).length > 0;

		return hasAnOperator;
	});

	chains.forEach(function (chain) {
		chain.messages = pratt.parse(chain).messages;
	});
}

function parse(code: string, options: Options) {

  options = useDefaultOptions(options);

	var astSequence = parser.parse(code);

  // console.log(astSequence);

	astSequence = applyMacros(astSequence);

	var generated = astSequence.map(function (chain) {

		var proxy = b.callExpression(
			b.memberExpression(
				libraryIdentifier(options, "Proxy"),
				b.identifier("set"),
				false),
			[b.identifier(options.self)])

		var topLevelContext = options.useProxy ? proxy : libraryIdentifier(options, 'Lobby');

		return compile(options, chain, topLevelContext, topLevelContext);
	});
	
	generated = b.program(generated.map(b.expressionStatement));

	if (options.wrapWithFunction) {
		generated.body[generated.body.length-1] = implicitReturnStatement(options, generated.body[generated.body.length-1]);
		generated = wrapInFunction(options, generated);
	}

	return generated;
}

function parseAndEmit(code: string, options: Options) {
	return escodegen.generate(parse(code, useDefaultOptions(options)));
}

function wrapInFunction(options, program) {

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

function implicitReturnStatement(options, expressionStatement) {

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

function getEnclosingRange(exprlist) {
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

function compile(options: Options, node, receiver: JSAST, localContext: JSAST) {
	var result = {};

	if (ast.isChain(node)) {
		//  A chain is a series of left-associative messages
		var chain = node;
		var messages = chain.messages;

		var current;
		messages.forEach(function (message) {
			// The receiver of a message in a chain is the preceding one
			current = compile(options, message, receiver, localContext);
			receiver = current;
		});
		return current;
	}
	else if (ast.isMessage(node)) {
		result = compileMessage(options, node, receiver, localContext);
	} else {
		console.assert(false, 'Unrecognized expression type: ' + node.type);
	}

	return result;
}

function compileMessage(options: Options, node: Message, receiver: JSAST, localContext: JSAST) {

	var message = node;
	var symbolValue = message.getSymbolValue();
	var symbolType = message.getSymbolType();

	let result;
	switch (symbolType) {
    case 'number': {
      result = b.callExpression(
          libraryIdentifier(options, 'IoNumberWrapper'),
          [b.literal(+symbolValue)]);
    }
    break;
    case 'string': {
      result = b.callExpression(
          libraryIdentifier(options, 'IoStringWrapper'),
          [b.literal(symbolValue)]);
    }
    break;
    case 'identifier': {
      var jsMessageName = new b.literal(symbolValue);

      // Build the JS expression _io.receiver.send(...args)
      result = b.callExpression(
          b.memberExpression(receiver, b.identifier("send"), false),
          [jsMessageName].concat(message.getArguments().map(function (arg) {
               // arg is a sequence -- a list of chains of messages.
               // It gets turned into a ,-delimited JS expression.
              var result = b.sequenceExpression(
                  arg.map(function (realarg) {
                      return compile(options, realarg, localContext, localContext);
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
                  return compile(options, realarg, b.identifier("locals"), b.identifier("locals"));
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
              libraryIdentifier(options, 'IoThunk'),
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
              libraryIdentifier(options, 'IoThunk'),
              [b.functionExpression(null, [], b.blockStatement([b.returnStatement(conseq)]))]);

          var alt = result.arguments[3];
          result.arguments[3] = b.callExpression(
              libraryIdentifier(options, 'IoThunk'),
              [b.functionExpression(null, [], b.blockStatement([b.returnStatement(alt)]))]);
      }
    }
    break;
	}
	return result;
}

function libraryIdentifier(options, id) {
	return b.memberExpression(
		b.identifier(options.runtimeLib),
		b.identifier(id),
		false);
}

module.exports = {
	parse: parse,
	compile: parseAndEmit,
};
