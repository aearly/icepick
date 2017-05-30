SHELL = /bin/bash
MAKEFLAGS += --no-print-directory --silent
export PATH := ./node_modules/.bin/:$(PATH):./bin/

setup:
	npm install --quiet > /dev/null; true

default: ci

lint: setup
	standard

dev:
	mocha --watch icepick.test.js --growl

watch: dev

test: setup
	mocha icepick.test.js

coverage:
	nyc mocha icepick.test.js

pre-commit: lint

ci: lint test

.PHONY: release-patch release-minor release-major
release-patch release-minor release-major: ci
	git push
	npm version $(@:release-%=%)
	npm publish

.PHONY: ci clean dev doc help lint release setup test
