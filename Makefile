SHELL = /bin/bash
MAKEFLAGS += --no-print-directory --silent
export PATH := ./node_modules/.bin/:$(PATH):./bin/

setup:
	npm install --quiet > /dev/null; true

default: ci

lint: setup
	standard icepick.js icepick.test.js

dev: test

watch: dev

test: setup
	tap icepick.test.js -R spec --100

coverage: test

pre-commit: lint

ci: lint test

.PHONY: release-patch release-minor release-major
release-patch release-minor release-major: ci
	git push
	npm version $(@:release-%=%)
	npm publish

.PHONY: ci clean dev doc help lint release setup test
