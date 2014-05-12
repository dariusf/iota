
JISON = ./node_modules/.bin/jison
BROWSERIFY = ./node_modules/.bin/browserify

all: src/parser.js

src/parser.js: src/parser.jison
	$(JISON) src/parser.jison -o src/parser.js

browser: demos/bundle.js

demos/bundle.js: src/*.js
	$(BROWSERIFY) -r ./src/iota.js:iota -o demos/bundle.js
	cp src/lib.js demos