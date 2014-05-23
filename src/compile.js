
var escodegen = require('escodegen');

var parser = require('./parser');
var pratt = require('./pratt');

function applyMacros (ast) {

	// An AST is a list of chains
	// A chain is a list of messages
	// A message can have arguments which are messages or chains

	infixOperatorMacro(ast);
	assignmentOperatorMacro(ast);

	return ast;
}

function findChainsInAST (nodelist) {

	// Performs a post-order traversal of an AST and returns
	// a list of references to all chain objects

	var allChains = [];
	function helper (nodelist) {
		nodelist.forEach(function (node) {
			if (node.type === 'chain') {
				node.value.forEach(function (message) {
					message.value.arguments.forEach(function (arg) {
						helper(arg);
					});
				});
				allChains.push(node);
			}
		});
	}
	helper(nodelist);
	return allChains;
}

function assignmentOperatorMacro (ast) {

	// Rewrites messages containing assignment operators
	// with setSlot messages

	var chains = findChainsInAST(ast);

	while (chains.length > 0) {
		var chain = chains.pop();

		for (var i=0; i<chain.value.length; i++) {
			var message = chain.value[i];

			// Find an assignment operator
			if (message.value.value.value !== ":=") continue;

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

				target = {
					type: 'message',
					value: {
						type: 'symbol',
						value: {
							type: 'identifier',
							value: 'Lobby'
						},
						arguments: []
					}
				};
				slotName = chain.value[0];
			} else {
				// a b := c
				target = chain.value[i-2];
				slotName = chain.value[i-1];
			}

			// rewrite the chain

			// var current = chain.value[i];
			// var prevtwo = chain.value.slice(Math.max(i-2,0), i);
			var beforethose = chain.value.slice(0, Math.max(i-2, 0));
			var after = chain.value.slice(i+1, chain.value.length);

			var rhs = {type: 'chain', value: after};
			var message = {
				type: 'chain',
				value: [{
					type: 'message',
					value: {
						type: 'symbol',
						value: {
							type: 'string',
							value: slotName.value.value.value
						},
						arguments: []
					}
				}]
			};
			var setSlot = {
				type: 'message',
				value: {
					type: 'symbol',
					value: {
						type: 'identifier',
						value: 'setSlot'
					},
					arguments: [[message], [rhs]]
				}
			};

			chain.value = beforethose.concat([target, setSlot]);

			// Recurse on the newly created chain in case it contains
			// more operators
			chains.push(rhs);

			break;
		
		}
	}
}

function infixOperatorMacro (ast) {

	// Rearranges all chains containing operators into properly
	// nested messages based on precedence

	var chains = findChainsInAST(ast).filter(function (chain) {

		// Skip chains that cannot possibly contain operators
		if (chain.value.length <= 1) return false;

		// A chain will be processed if it contains at least one operator
		// message with no arguments (meaning it has not been processed yet)
		var hasAnOperator = chain.value.filter(function (message) {
			return pratt.isOperator(message.value.value.value) && message.value.arguments.length === 0;
		}).length > 0;

		return hasAnOperator;
	});

	chains.forEach(function (chain) {
		chain.value = pratt.parse(chain).value;
	});
}

function parse (code) {

	var ast = parser.parse(code);

	ast = applyMacros(ast);

	var generated = [];
	ast.forEach(function (chain) {
		chain = compile(chain, astIdentifier('Lobby'), astIdentifier('Lobby'));
		generated.push(chain);
	});
	
	// TODO make this a sequence statement?
	generated = {
		type: "Program",
		body: generated.map(function (expr) {
			return {
				type: "ExpressionStatement",
				expression: expr
			};
		})
	};

	return generated;
}

function parseAndEmit (code) {
	return escodegen.generate(parse(code));
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

function compile (ast, receiver, localContext) {
	var result = {};

	if (ast.type === 'chain') {
		//  A chain is a series of left-associative messages
		var chain = ast.value;
		var current;

		for (var i=0; i<chain.length; i++) {
			// The receiver of a message in a chain is the preceding one
			current = chain[i];
			current = compile(current, receiver, localContext);
			receiver = current;
		}
		return current;
	}
	else if (ast.type === 'message') {
		// The symbol is the name of the message
		var symbol = ast.value;

		if (symbol.value.type === 'number') {
			result = {
				// loc: symbol.loc,
				type: "CallExpression",
				callee: astIdentifier('IoNumberWrapper'),// symbol.loc),
				arguments: [{type: "Literal", value: +symbol.value.value}]//, loc: symbol.loc}]
			};
		}
		else if (symbol.value.type === 'string') {
			result = {
				// loc: symbol.loc,
				type: "CallExpression",
				callee: astIdentifier('IoStringWrapper'),// symbol.loc),
				arguments: [{type: "Literal", value: symbol.value.value}]//, loc: symbol.loc}]
			};
		}
		else if (symbol.value.type === 'identifier') {
			var symbolValue = {type: "Literal", value: symbol.value.value};
	
			// a.b(args);
			result = {
				// loc: symbol.loc,
				type: "CallExpression",
				callee: {
					// loc: symbol.loc,
				    type: "MemberExpression",
				    object: receiver, // a
				    property: {
				    	// loc: symbol.loc,
		                type: "Identifier",
		                name: "send" // b
		            },
				    computed: false,
				},
				arguments: [symbolValue].concat(symbol.arguments.map(function (arg) {
					 // arg is a list of exprs delimted by ;
                    var result = {
                        type: "SequenceExpression",
                        expressions: arg.map(function (realarg) {
                            return compile(realarg, localContext, localContext);
                        })
                    };

                    // var loc = getEnclosingRange(result.expressions);
                    // if (loc !== null) result.loc = loc;

                    return result;
				}))
			};

			if (symbolValue.value === "method") {

				result.arguments = [symbolValue].concat(symbol.arguments.map(function (arg) {
					// Arguments will have the locals object as context
					// arg is also a list of expressions here
                    return {
                        type: "SequenceExpression",
                        expressions: arg.map(function (realarg) {
							return compile(realarg, {type: "Identifier", name: "locals"}, {type: "Identifier", name: "locals"});
                        })
                    };
				}));

				// Turn all arguments but the last to strings instead;
				// they will be sent as messages to the locals object

				for (var i = 1; i < result.arguments.length - 1; i++) {
					// Each argument is a SequenceExpression
					// Grab the last expression in each sequence and turn it into a string
					result.arguments[i] = result.arguments[i].expressions[result.arguments[i].expressions.length-1].arguments[0];
				}

				// The last becomes a thunk

				var lastArgument = result.arguments[result.arguments.length - 1];
				var methodBody = lastArgument;

				result.arguments[result.arguments.length - 1] = {
					type: "CallExpression",
					callee: astIdentifier('IoThunk'),
					arguments: [{
						type: "FunctionExpression",
						id: null,
						params: [{
							type: "Identifier",
							name: "locals"
						}],
						body: {
							type: "BlockStatement",
							body: [{
								type: "ReturnStatement",
								argument: methodBody
							}]
						}
					}]
				}
			}
			else if (symbolValue.value === "if") {

				// Convert last two arguments into thunks
				// TODO handle cases where if statements have < 3 arguments

				var conseq = result.arguments[2];
				result.arguments[2] = {
					type: "CallExpression",
					callee: astIdentifier('IoThunk'),
					arguments: [{
						type: "FunctionExpression",
						id: null,
						params: [],
						body: {
							type: "BlockStatement",
							body: [{
								type: "ReturnStatement",
								argument: conseq
							}]
						}
					}]
				};

				var alt = result.arguments[3];
				result.arguments[3] = {
					type: "CallExpression",
					callee: astIdentifier('IoThunk'),
					arguments: [{
						type: "FunctionExpression",
						id: null,
						params: [],
						body: {
							type: "BlockStatement",
							body: [{
								type: "ReturnStatement",
								argument: alt
							}]
						}
					}]
				};
			}
		}
	} else {
		throw new Error('CompileError: unrecognized AST type: ' + ast.type);
	}

	return result;
}

function astIdentifier (id) {//, loc) {
	return {
	    // "loc": loc,
	    "type": "MemberExpression",
	    "computed": false,
	    "object": {
	        "type": "Identifier",
	    	// "loc": loc,
	        "name": "_io"
	    },
	    "property": {
	    	// "loc": loc,
	        "type": "Identifier",
	        "name": id
	    }
	};
}

module.exports = {
	parse: parse,
	compile: parseAndEmit
};
