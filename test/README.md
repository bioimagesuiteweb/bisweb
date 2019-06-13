This directory contains the test scripts for BisWeb.

The files test_module.js and test_module.py run the module tests (defined in
[module_tests.json](module_tests.json).).

The remaining files run unit tests.

To run a unit test in JS type:

    mocha test_optimizer.js
    
For python type

    python3 -m unittest test_optimizer.py

These tests are also invoked using `make test` in both `build/wasm` (JS) and
`build/native` (Python).

---

Module tests JS and Python. To run type something like:

    mocha test_module.js --input local --testname smoothImage
    
or
  
    mocha test_module.js --input local --first 2 --last 20

or (syntax is same other than for the `--input local` part)

    python3 test_module.py  --testname smoothImage
    
Not all tests work in python. To get a list of the tests

    mocha tet_module.js --input local --list

---

To add

computeroi -- storecentroids
