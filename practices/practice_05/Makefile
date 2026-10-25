PROJECT := ../practice_04/looksmax

.PHONY: test build run

test:
	@cd $(PROJECT) && sh scripts/check.sh

build:
	@cd $(PROJECT) && npm --prefix web run build

run: build
	@cd $(PROJECT) && .venv/bin/python serve.py
