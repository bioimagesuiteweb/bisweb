const webutil = require('bis_webutil');

class BiswebTestRunner extends HTMLElement {

    constructor() {
        super();

        /*let sampleTests = [
            {
                'name' : 'Test 1',
                'test' : () => {
                    return new Promise( (resolve) => {
                        console.log('Test 1');
                        resolve();
                    });
                }
            },
            {
                'name' : 'Test 2',
                'test' : () => {
                    return new Promise( (resolve, reject) => {
                        console.log('Test 2');
                        reject();
                    });
                }
            },
            {
                'name' : 'Test 3',
                'test' : () => {
                    return new Promise( (resolve) => {
                        console.log('Test 3');
                        resolve();
                    });
                }
            },
            {
                'name' : 'Test 4',
                'test' : () => {
                    return new Promise( (resolve) => {
                        console.log('Test 4');
                        resolve();
                    });
                }
            }
        ];

        this.setTests(sampleTests);
        this.runTests();*/
    }

    setTests(tests, pretests) {
        this.testList = tests;
        this.pretests = pretests;
    }

    runPretests() {
        let index = 0;

        let runPretest = (currentTest) => {
            currentTest.test().then( () => {
                index = index + 1;
                if (index < this.pretests.length) {
                    runPretest(this.pretests[index]);
                } else {
                    console.log('---------- Pretest tasks complete, starting tests ---------------');
                    this.runTests();
                }
            }).catch( (e) => {
                console.log('An error occured running pretest', currentTest.name);
                console.log('Cannot continue with tests, stopping');
                return;
            });
        };

        runPretest(this.pretests[0]);
    }

    runTests() {
        let successfulTests = [];
        let failedTests = [];

        let index = 0;

        let runTest = (currentTest) => {
            currentTest.test().then( () => {
                successfulTests.push(currentTest.name);

                console.log('succeded test', currentTest.name);
                index = index + 1;

                if (index < this.testList.length) {
                    runTest(this.testList[index]);
                } else {
                    this.displayResults(successfulTests, failedTests);
                    return;
                }
    
            }).catch( (e) => {
                console.log('test failed name', currentTest.name, e);
                failedTests.push(currentTest.name);

                index = index + 1;
                if (index < this.testList.length) {
                    runTest(this.testList[index]);
                } else {
                    this.displayResults(successfulTests, failedTests);
                    return;
                }
    
            });
        }

        runTest(this.testList[0]);

    }

    displayResults(successes, failures) {
        console.log('------------ Successful tests ------------', successes);
        console.log('------------ Failed tests ------------', failures);
    }
}


webutil.defineElement('bisweb-testrunner', BiswebTestRunner);