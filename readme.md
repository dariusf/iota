Iota
====

Iota is a source-to-source compiler which accepts [Io](http://iolanguage.org/) code and outputs JavaScript. It was written as an experiment for [CodeCombat's parser challenge](http://codecombat.challengepost.com/).

The project is very much still in its infancy (having been started way too late): only a minimal subset of Io is implemented. A number of core constructs and much of the standard library are not yet done.

Try it out [here](http://dariusf.github.io/iota/).

Features
--------

- messages and objects
- prototype chain
- object methods
- global and local contexts
- infix operators (supporting different precedence levels)
- assignment operators
- primitives: strings, numbers, boolean values, functions

Still to come
-------------

- `self`
- primitives: `nil`, lists
- call introspection
- most library functions
- prototype tree
- proper scope chain
- proper lazy argument evaluation
- defining operators of custom precedence
- defining assignment operators

Dependencies
------------

- [node.js](http://nodejs.org/)
- [Jison](http://zaach.github.io/jison/)
- [Browserify](http://browserify.org/)
- [Escodegen](https://github.com/Constellation/escodegen)

The AST constructed by the parser complies with the [Mozilla Parser API](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API) specification.

Installation
------------

- `git clone`
- `npm install`
- `make`

Usage
-----

**node**

```js
var iota = require('iota');
eval(iota.compile('fact := method(n, if (n == 0, 1, n * fact (n - 1))); writeln(fact(5))'));
// => 120
```

**Browser**

A demo of Iota running in a web page can be found in `/demos/browser`. After running `make`, the necessary files will be packaged into `bundle.js`. Simply include it in your web page as in the demo, and you'll be able to use Iota just like in the node example above (complete with `require`, courtesy of Browserify).

**CLI**

```
node iota ./demos/node/demo.io
```

API
---

```js
iota.parse(code);
```
Returns a JavaScript object representing the syntax tree.

```js
iota.compile(code, includeLibrary, boilerplate);
```
Returns a string of compiled JavaScript. If `includeLibrary` is true, the runtime library will be prepended to the output. If `boilerplate` is true, the compiled output will additionally be wrapped in a function for easier interfacing with the outside world.

License
-------
MIT