
JISON = ./node_modules/.bin/jison

src/parser.js: src/parser.jison
	$(JISON) src/parser.jison -o src/parser.js

browser: demos/bundle.js

demos/bundle.js: src/parser.js
	browserify -r ./src/iota.js:iota -o demos/bundle.js
