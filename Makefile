
JISON = ./node_modules/.bin/jison
BROWSERIFY = ./node_modules/.bin/browserify
BABEL = ./node_modules/.bin/babel
FLOW = ./node_modules/.bin/flow --color=always

BROWSER_DEMOS = demos/browser

all: parser browser build

build:
	$(FLOW)
	$(BABEL) src --out-dir=build

test: build
	$(FLOW) | less -R
	npm test

parser: src/parser.js

src/parser.js: src/parser.jison
	$(JISON) src/parser.jison -o src/parser.js

browser: $(BROWSER_DEMOS)/iota-browser.js $(BROWSER_DEMOS)/lib.js iota-browser.js lib.js

$(BROWSER_DEMOS)/iota-browser.js $(BROWSER_DEMOS)/lib.js iota-browser.js lib.js: src/*.js iota.js
	$(BROWSERIFY) -r ./iota.js:iota-compiler -o $(BROWSER_DEMOS)/iota-browser.js
	cp src/lib.js $(BROWSER_DEMOS)/lib.js
	cp src/lib.js .
	cp $(BROWSER_DEMOS)/iota-browser.js .
