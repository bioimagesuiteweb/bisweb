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
