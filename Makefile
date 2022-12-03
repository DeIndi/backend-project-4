lint:
	npx eslint .
install:
	npm ci
test:
	npx jest
test-coverage:
	npm test -s -- --coverage --coverageProvider=v8
link:
	npm link
