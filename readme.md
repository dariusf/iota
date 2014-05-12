

Io-to-JavaScript compiler


Iota
====

Iota is a source-to-source compiler which accepts [Io](http://iolanguage.org/) code and outputs JavaScript. It was written as an experiment for [CodeCombat's parser challenge](http://codecombat.challengepost.com/).

The project is very much still in its infancy (having been started way too late): only a minimal subset of Io is implemented. A number of core constructs and much of the standard library are not yet done.

Features
--------

- messages and objects
- prototype chain
- object methods
- global and local contexts
- infix operators (supporting different precedence levels)
- assignment operators
- primitives: strings, numbers, boolean values, functions

Dependencies
------------

- [node.js](http://nodejs.org/)
- [Jison](http://zaach.github.io/jison/)
- [Escodegen](https://github.com/Constellation/escodegen)

The AST constructed by the parser complies with the [Mozilla Parser API](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API) specification.

Installation
------------

- `git clone asdasdasdsadadsasddasasadsassd`
- `npm install`
- `make`

Usage
-----

```js
var iota = require('iota-compiler');

eval(iota.parse('fact := method(n, if (n == 0, 1, n * fact (n - 1))); writeln(fact(5))'));
// => 120
```

Todo
----

- `self`
- primitives: `nil`, lists
- call introspection
- most library functions
- prototype tree
- proper scope chain
- proper lazy argument evaluation
- defining operators of custom precedence
- defining assignment operators
