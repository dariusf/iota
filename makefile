
JISON = ./node_modules/.bin/jison
BROWSERIFY = ./node_modules/.bin/browserify

BROWSER_DEMOS = demos/browser

all: parser browser

parser: src/parser.js

src/parser.js: src/parser.jison
	$(JISON) src/parser.jison -o src/parser.js

browser: $(BROWSER_DEMOS)/bundle.js $(BROWSER_DEMOS)/lib.js

$(BROWSER_DEMOS)/bundle.js $(BROWSER_DEMOS)/lib.js: src/*.js iota.js
	$(BROWSERIFY) -r ./iota.js:iota -o $(BROWSER_DEMOS)/bundle.js
	cp src/lib.js $(BROWSER_DEMOS)

update-pages:
	git checkout gh-pages
	git merge -s subtree master
	git checkout master