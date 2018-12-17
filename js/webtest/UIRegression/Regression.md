# User Interface Regression Testing

The files contained in this folder will test the interfaces of the viewer applications in BioImage Suite. These are meant to be run with the application [`testcafe`](https://github.com/DevExpress/testcafe). Note that these tests are not entirely comprehensive, but will ensure that all clickable, draggable, and typeable elements will work as intended. 

Screenshots will be saved in a folder named `screenshots` in the folder `testcafe` is run from. After running the tests, please consult these folders to ensure that the output of the tests is as expected, as the regression tests cannot ensure that tasks concerning the viewer are successful automatically.

## Running Testcafe

Testcafe is run from the command line. It is typically invoked using the following format:

    testcafe [browser] [file] --screenshots [folder_name] -T [test_name]

The options are as follows:

* [browser] — The name of the browser to run `testcafe` on. Testcafe is tested primarily on Chrome for BioImage Suite, but can run on [any of these browsers](https://devexpress.github.io/testcafe/documentation/using-testcafe/common-concepts/browsers/browser-support.html).

* [file] — The name of the file to invoke `testcafe` on. This will typically be one of the files contained in is directory (the `UIRegression` directory).

* [folder_name] — The name of the folder that will contain the screenshots. Note that screenshots for each test will be contained in their own folders. If you change the name of this folder between runs of the test, `testcafe` will create multiple folders, but if you keep it the same then `testcafe` will overwrite images for each test. 

* [test_name] — The name of the test within a file to run. This should be specified as a [Regular Expression](https://en.wikipedia.org/wiki/Regular_expression), e.g. if looking for a test called 'Sample Test' within a file, this will match the expression '^Sample Test$'. This flag is optional, if omitted `testcafe` will run every test in the directory.
