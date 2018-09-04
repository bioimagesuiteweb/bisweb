const webutil = require('bis_webutil');
const bisweb_serverregression=require('bisweb_serverregression');

class BiswebTestRunner extends HTMLElement {

    constructor() {
        super();
        console.log("Test runner");
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
                console.log('---------- Cannot continue with tests, stopping -------------');
                console.log('Error:', e);
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

                console.log('--------- succeeded test ---------');
                console.log(currentTest.name);
                index = index + 1;

                if (index < this.testList.length) {
                    runTest(this.testList[index]);
                } else {
                    this.displayResults(successfulTests, failedTests);
                    return;
                }
    
            }).catch( (e) => {
                console.log('------------- failed test -------------');
                console.log(currentTest.name, e);
                failedTests.push(currentTest.name);

                index = index + 1;
                if (index < this.testList.length) {
                    runTest(this.testList[index]);
                } else {
                    this.displayResults(successfulTests, failedTests);
                    return;
                }
    
            });
        };

        runTest(this.testList[0]);

    }

    displayResults(successes, failures) {
        console.log('------------ Successful tests ------------', successes);
        console.log('------------ Failed tests ------------', failures);
    }

    connectedCallback() {

        setTimeout( () => {

            this.setTests(bisweb_serverregression.tests, bisweb_serverregression.pretests);
            this.runPretests();
        },1000);
    }
}


webutil.defineElement('bisweb-testrunner', BiswebTestRunner);
