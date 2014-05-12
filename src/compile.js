
var escodegen = require('escodegen');

var parser = require('./parser');

function preprocessor (code) {
	code = code.replace(/Object/g, 'IoRootObject');
	code = code.replace(/(\r?\n)+/g, '\n').trim();
	return code;
}

var pratt = require('./pratt');
function applyMacros (ast) {
	// an ast is a list of chains
	// a chain is a list of messages
	// a messages can have arguments which are messages or chains

	// infix op macros
	// walk every chain and rearrange it into proper chains based on precedence

	// performs a post-order traversal of the AST and selects all the chains
	function findChains (nodelist) {
		var allChains = [];
		function helper (nodelist) {
			nodelist.forEach(function (node) {
				if (node.type === 'chain') {
					node.value.forEach(function (message) {
						helper(message.value.arguments);
					});
					allChains.push(node);
				}
			});
		}
		helper(nodelist);
		return allChains;
	}
	var chains = findChains(ast).filter(function (chain) {
		if (chain.value.length <= 1) return false;
		var hasAnOperator = chain.value.filter(function (msg) {
			return pratt.isOperator(msg.value.value.value) && msg.value.arguments.length === 0;
		}).length > 0;

		return hasAnOperator;
	});


	chains.forEach(function (chain) {
		chain.value = pratt.parse(chain).value;
	});

	// assignment operator macros

	var chains = findChains(ast);
	while (chains.length > 0) {
		var chain = chains.pop();

		for (var i=0; i<chain.value.length; i++) {
			var message = chain.value[i];
			if (message.value.value.value === ":=") {

				// pick the previous two elements

				var receiver, slotName;
				if (i === 0) {
					throw new Error("SyntaxError: no receiver for assignment operator");
				} else if (i === 1) {
					receiver = {
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
					receiver = chain.value[i-2];
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
						arguments: [message, rhs]
					}
				};

				chain.value = beforethose.concat([receiver, setSlot]);

				// push the newly created one into the queue
				chains.push(rhs);

				break;
			}
		}

	}
	return ast;

// 	function modifyChains (node) {
// 		if (node.type === "chain") {
// 			console.log("=>");
// 			print(node);
// 			print(r);
			
// 			// r.value
// 			// r.value = r.value.map(modifyChains);
// var r = node;
// 			// for each message in the chain
// 			console.log('done procssing chain', JSON.stringify(node) === JSON.stringify(r));

// 			var r = {
// 				type: 'chain',
// 				value: r.value.map(function(msg) {
// 					// if (msg.type === 'message') {

// 					// }
// 					return {
// 						type: 'message',
// 						value: {
// 							type: 'symbol',
// 							value: msg.value.value,
// 							arguments: msg.value.arguments.map(function (arg) {
// 								console.log('======ARG=======');
// 								print(arg);
// 								return modifyChains(arg);
// 								// return arg.type === 'chain';
// 							})
// 						}
// 					};
// 				})
// 			};

// 			var r = pratt.parse(node);

// 			return r;
// 		// } else if (node.type === "message") {
// 		// 	// var r = node.value.arguments.map(modifyChains);
// 		// 	// node.value.arguments = r;
// 		// 	// dont mutate
// 		// 	return {type: 'message', value: node.value};
// 		} else {
// 			console.log('macros: unrecognized ast type ', node.type);
// 		}
// 	}


	// ast = ast.map(modifyChains);
	// ast[0] = pratt.parse(ast[0]);
	// assignment op macros
}


// function parseWithRuntime (code) {
// 	return runtimeLibCode + "\n\n" + parse(code) + ";";
// }

function parse (code) {
	code = preprocessor(code);
	var ast = parser.parse(code);

	// console.log("-------before macro--------\n");
	// print(ast);

	ast = applyMacros(ast);

	// console.log("-------after macro--------\n");
	// print(ast);

	var generated = [];
	for (var i=0; i<ast.length; i++) {
		ast[i] = compile(ast[i], "Lobby", false);
		generated.push(escodegen.generate(ast[i]));
	}
	
	// console.log("-------parsed--------\n");
	// print(ast);
	// console.log(ast);
	//print(ast);

	// var generated = emit(ast);
	generated = generated.join(';\n');
	// console.log("\n" + generated);


// 	console.log(escodegen.generate({
//   type: 'BinaryExpression',
//   operator: '+',
//   left: { type: 'Literal', value: 40 },
//   right: { type: 'Literal', value: 2 }
// }));;

	return generated;
}

function compile (ast, receiver, localContext) {

	var result = {};

	if (ast.type === 'chain') {
		//  a chain is a series of left-associative messages
		var chain = ast.value;
		var current;
		receiver = receiver === 'locals' || localContext ? 'locals' : 'Lobby'; // when starting a chain, start from the beginning

		for (var i=0; i<chain.length; i++) {
			// the receiver of a message in a chain is the preceding one
			current = chain[i];
			current = compile(current, receiver, localContext);
			receiver = escodegen.generate(current);
		}
		return current;
	} else if (ast.type === 'message') {
		// the symbol is the name of the message
		var symbol = ast.value;

		var symbolValue;
		if (symbol.value.type === 'number') {
			result = {
				type: "CallExpression",
				callee: {
					type: "Identifier",
					name: "IoNumberWrapper"
				},
				arguments: [{type: "Literal", value: +symbol.value.value}]
			};
		}
		else if (symbol.value.type === 'string') {
			result = {
				type: "CallExpression",
				callee: {
					type: "Identifier",
					name: "IoStringWrapper"
				},
				arguments: [{type: "Literal", value: symbol.value.value}]
			};
		}
		else if (symbol.value.type === 'identifier') {
			symbolValue = {type: "Literal", value: symbol.value.value};
	
			// a.b(args);
			result = {
				type: "CallExpression",
				callee: {
				    type: "MemberExpression",
				    object: {
				    	type: "Identifier",
				    	name: receiver // a
				    },
				    property: {
		                type: "Identifier",
		                name: "send" // b
		            },
				    computed: false,
				},
				arguments: [symbolValue].concat(symbol.arguments.map(function (arg) {
					// arguments should just use lobby as context, not the current one
					// unless it's a method argument
					return compile(arg, receiver === "locals" || localContext ? "locals" : "Lobby", localContext);
				}))
			};

			if (symbolValue.value === "method") {

				// use local context
				result.arguments = [symbolValue].concat(symbol.arguments.map(function (arg) {
					return compile(arg, "locals", true);
				}));

				// turn all arguments but the last to strings instead
				for (var i = 1; i < result.arguments.length - 1; i++) {
					result.arguments[i] = result.arguments[1].arguments[0];
				}

				// the last becomes a thunk
				var methodBody = result.arguments[result.arguments.length - 1];
				result.arguments[result.arguments.length - 1] = {
					type: "CallExpression",
					callee: {
						type: "Identifier",
						name: "IoThunk"
					},
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
			} else if (symbolValue.value === "if") {

				// convert last two arguments into thunks

				var conseq = result.arguments[2];
				result.arguments[2] = {
					type: "CallExpression",
					callee: {
						type: "Identifier",
						name: "IoThunk"
					},
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
					callee: {
						type: "Identifier",
						name: "IoThunk"
					},
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
		console.log('unrecognized ast type', ast.type);
	}

	return result;
}

function emit (ast) {
	return escodegen.generate(ast);
}

module.exports = {
	parse: parse
};
