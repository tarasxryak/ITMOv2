.PHONY: install test run evidence model-before model-after judge

install:
	@$(MAKE) -s -C lab install

test:
	@$(MAKE) -s -C lab test
	@python3 tools/verify_evidence.py

run:
	@$(MAKE) -s -C lab run

evidence:
	python3 tools/replay_attacks.py --source evidence/before/service.py.txt --output evidence/before
	python3 tools/replay_attacks.py --output evidence/after
	python3 tools/verify_evidence.py

model-before:
	python3 tools/run_models.py --phase before

model-after:
	python3 tools/run_models.py --phase after

judge:
	python3 tools/build_judge_input.py
	python3 tools/run_models.py --phase after --judge
