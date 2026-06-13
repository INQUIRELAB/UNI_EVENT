# UniEvent + Labs — build/test/demo targets. Recipe lines use TABS.
LIVE_URL ?= http://localhost:3000
PY ?= python

.PHONY: help setup test bundles serve demo grade reproduce clean

help:
	@echo "targets: setup test bundles serve demo grade reproduce clean"

setup:            ## editable install (lib + io + dev) and labs deps
	$(PY) -m pip install -e ".[io,dev]"
	cd labs && npm install

test:             ## run the python test suite (0 failures = pass)
	$(PY) -m pytest -q

bundles:          ## bake the static web bundles from the bundled REAL sample
	$(PY) scripts/make_bundles.py labs/public/data
	$(PY) scripts/validate_bundles.py labs/public/data

serve:            ## run the Next.js Labs dev server
	cd labs && npm run dev

demo: bundles serve  ## bake bundles, then serve the Labs

grade:            ## machine-checkable rubric scorecard (nonzero if any FAIL)
	LIVE_URL=$(LIVE_URL) bash scripts/grade.sh

reproduce:        ## clean-clone reproduction: install -> bake -> validate
	bash scripts/reproduce.sh

clean:            ## remove build artifacts and baked bundles
	rm -rf build dist *.egg-info labs/public/data labs/.next labs/out
