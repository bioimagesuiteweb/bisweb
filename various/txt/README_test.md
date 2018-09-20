# JavaScript Tests (if test_module.js is present)

## Setup

To run the module tests, first install mocha as follows

    sudo npm install -g mocha    (linux, macos)

or
    npm install -g mocha (windows)


## To run all the tests

Type

    mocha test_module.js

to run all the regression tests.

## To run a subset of the tests

If you would like to run a subset of tests type (e.g. to run tests 22 -> 30)

    mocha test_module.js --first 22 --last 30
    
To run tests for a specific module type

    mocha test_module.js --testname cropImage
    
Please look at the file module_tests.json to get a listing of all the tests and the
module names used.

# Python Tests (if test_module.py is present)

## To run all the tests

Type

    python3 test_module.py

to run all the regression tests. To run a subset of the tests see the syntax
for the JS version above (e.g. python3 test_module.py --last 4)
