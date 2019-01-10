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
    

## To get a list of  all the modules and tests

Type

    mocha test_module.js --list

The tests use data from [https://bioimagesuiteweb.github.io/test/](https://bioimagesuiteweb.github.io/test/). Take a look
at the test list file
[https://bioimagesuiteweb.github.io/test/module_tests.json](https://bioimagesuiteweb.github.io/test/module_tests.json)
to see the list of all tests.



