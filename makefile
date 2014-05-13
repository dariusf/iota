
BROWSER = demos/browser

update:
	git checkout master $(BROWSER)/index.html $(BROWSER)/style.css
	cp $(BROWSER)/index.html index.html -f
	cp $(BROWSER)/style.css style.css -f
	rm -rf demos