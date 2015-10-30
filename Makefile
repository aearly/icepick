export APP_NAME = configure-3-js
export REPO_NAME = configure-3-js

SHELL = /bin/bash
MAKEFLAGS += --no-print-directory --silent
export PATH := ./node_modules/.bin/:$(PATH):./bin/

setup:
	npm install --quiet > /dev/null; true

# The default action will lint the code and run all the tests
default: ci

# Lints the code
lint: setup
	jshint --config .jshintrc $(wildcard icepick*.js Gruntfile.js)
	jscs icepick*.js Gruntfile.js


# Dev mode for continuous testing
dev:
	mocha --watch icepick.test.js --growl

# Alias for dev. Uses the testem watcher.
watch: dev

# Runs the tests on Node.js and local browsers
# using the bundled testem runner
test: setup
	mocha icepick.test.js

# This make task will be executed before the code is committed
pre-commit: lint

# Continuous Integration Test Runner
ci: lint test

release: ci
	git push
	grunt release$(RELEASEFLAGS)

# Releases updating only the patch number 0.0.#
release-patch:
	RELEASEFLAGS=":patch" make release

# Releases updating the minor number 0.#.0 and setting the patch to 0
release-minor:
	RELEASEFLAGS=":minor" make release

# Releases updating the major number #.0.0 and setting the minor and patch to 0
release-major:
	RELEASEFLAGS=":major" make release

.PHONY: ci clean dev doc help lint release setup test
