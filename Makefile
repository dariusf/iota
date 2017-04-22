
.PHONY: all build test coverage parser browser clean

JISON = ./node_modules/.bin/jison
BROWSERIFY = ./node_modules/.bin/browserify
BABEL = ./node_modules/.bin/babel
FLOW = ./node_modules/.bin/flow --color=always

BROWSER_DEMOS = demos/browser

all: build browser

build: parser
	$(FLOW)
	$(BABEL) src --out-dir build --source-maps true

test: build
	npm test

parser: build/parser.js

build/parser.js: src/parser.jison
	mkdir -p build
	$(JISON) src/parser.jison -o build/parser.js

browser: build $(BROWSER_DEMOS)/iota-browser.js $(BROWSER_DEMOS)/lib.js

$(BROWSER_DEMOS)/iota-browser.js $(BROWSER_DEMOS)/lib.js: build/*.js iota.js
	$(BROWSERIFY) -r ./iota.js:iota-compiler -o build/iota-browser.js
	cp build/lib.js $(BROWSER_DEMOS)/lib.js
	cp build/iota-browser.js $(BROWSER_DEMOS)/iota-browser.js

clean:
	-rm $(BROWSER_DEMOS)/iota-browser.js
	-rm $(BROWSER_DEMOS)lib.js
	-rm -rf build
