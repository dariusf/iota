
.PHONY: all build test coverage parser browser clean

JISON = ./node_modules/.bin/jison
BROWSERIFY = ./node_modules/.bin/browserify
BABEL = ./node_modules/.bin/babel
FLOW = ./node_modules/.bin/flow --color=always

BROWSER_DEMOS = demos/browser

all: browser build

build: parser
	# $(FLOW)
	$(BABEL) src --out-dir build --source-maps true

test: build
	npm test

parser: build/parser.js

build/parser.js: src/parser.jison
	mkdir -p build
	$(JISON) src/parser.jison -o build/parser.js

browser: build $(BROWSER_DEMOS)/iota-browser.js $(BROWSER_DEMOS)/lib.js iota-browser.js lib.js

$(BROWSER_DEMOS)/iota-browser.js $(BROWSER_DEMOS)/lib.js iota-browser.js lib.js: src/*.js iota.js
	$(BROWSERIFY) -r ./iota.js:iota-compiler -o $(BROWSER_DEMOS)/iota-browser.js
	cp src/lib.js $(BROWSER_DEMOS)/lib.js
	cp src/lib.js .
	cp $(BROWSER_DEMOS)/iota-browser.js .

clean:
	-rm iota-browser.js
	-rm lib.js
	-rm $(BROWSER_DEMOS)/iota-browser.js
	-rm $(BROWSER_DEMOS)lib.js
	-rm -rf build
