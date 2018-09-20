/*  LICENSE
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
 
 BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
 
 - you may not use this software except in compliance with the License.
 - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
 
 __Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.__
 
 ENDLICENSE */

/* global  HTMLElement, window,document */

"use strict";


const webutil=require('bis_webutil');
const webfileutil=require('bis_webfileutil');
const $=require('jquery');
const genericio=require('bis_genericio');
const bisdate=require('bisdate.js').date;
import testmodule from '../../test/testdata/display/displaytests.json';
const displaytestlist=testmodule.displaytestlist;


// ------------------------ global Parameters --------------------------

let globalParams = { 
    resdiv : null,
    testDataRootDirectory : '',
    resultImageElement : null,
    goldImageElement: null,
    comparisonTextElement : null,
    application : null,
    currentViewer : null,
};


// ------------------------ load viewer application state -------------

var loadViewerParameters=function(fname)  {


    return new Promise( (resolve,reject) => {
        genericio.read(fname, false).then((contents) => {
            let obj = null;
            try {
                obj=JSON.parse(contents.data);
            } catch(e) {
                globalParams.resdiv.append('<H4>Error</H4><p>Bad application state file '+contents.filename+' probably not a application state file.</p>');
                reject(e);
            }

            console.log('Here setting element state',globalParams.currentViewer,obj);
            globalParams.currentViewer.setElementState(obj);
            
            globalParams.resdiv.append('<p>Viewer param file loaded from '+contents.filename+'</p>');
            resolve("Done");
        }).catch((e) => {
            console.log(e.stack,e);
            webutil.createAlert(`${e}`,true);});
    });

};


var saveStateCallback=function(ind) {

    webfileutil.genericFileCallback(
        { title: 'Save Viewer State',
          save: true,
          suffix : "viewerstate",
          filters : [ { name: 'Application State File', extensions: [ "viewerstate" ]}],
        }
        ,
        ( (fobj) => {
            fobj=genericio.getFixedSaveFileName(fobj,"viewer.state");
            setViewer(ind);
            let state=globalParams.currentViewer.getElementState(false);
            return new Promise(function (resolve, reject) {
                genericio.write(fobj, JSON.stringify(state)).then((f) => {
                    if (!genericio.isSaveDownload())
                        webutil.createAlert('Viewer State saved '+f);
                }).catch((e) => {
                    //                    webutil.createAlert('Failed to save Viewer State '+e);
                    console.log(e,e.stack);
                    reject(e);
                });
            });

        }),
    );
};


var runTest = async function(viewerindex,basestate='',viewerstate='',comparisonpng='') {

    globalParams.goldImageElement.src=comparisonpng;

    try {
        console.log("Reading app state from",basestate);
        globalParams.application.getViewer(0).clearobjectmap();
        await setViewer(2);
        await setViewer(1);
        await globalParams.application.loadApplicationState(basestate);
        await setViewer(viewerindex);
    } catch(e) {
        throw new Error(e);
    }
    
    if (viewerstate!=='') {
        console.log("Reading viewer state from",viewerstate);
        try { 
            await loadViewerParameters(viewerstate);
        } catch(e) {
            throw new Error(e);
        }
    }

    
    let snapshotElement=globalParams.currentViewer.getSnapShotController();
    
    let canvas=await snapshotElement.getTestImage();
    
    let outpng=canvas.toDataURL("image/png");
    globalParams.resultImageElement.attr('src',outpng);

    let resultimg=snapshotElement.createBisWebImageFromCanvas(canvas);
    
    return new Promise( (resolve,reject) => {

        snapshotElement.createBisWebImageFromImageElement(comparisonpng).then( (goldstandard) => {
            setTimeout( () => {
                globalParams.resdiv.append('<p>Reading result from: '+comparisonpng+'</p>');
                console.log(goldstandard.getDescription());
                let tst=resultimg.compareWithOther(goldstandard,"cc",0.98);
                globalParams.resdiv.append(`<p><b>Result</b>: ${JSON.stringify(tst)}</p>`);
                setTimeout( () => {
                    resolve(tst);
                },100);
            },100);
        }).catch( (e) => {
            reject(e);
        });
    });
};


var setViewer=function(n) {

    return new Promise( (resolve) => {
        console.log("Setting visible tab",n);
        globalParams.application.setVisibleTab(n);
        globalParams.currentViewer=globalParams.application.getViewer(n-1);
        setTimeout( () => {
            resolve();
        },100);
    });
};

var runTests= async function() {


    globalParams.firsttime=true;
    
    let first=parseInt($("#first").val())||0;
    let last=parseInt($("#last").val()) || 0;


    let good=0;
    let bad=0;
    let goodlist=[];
    let intentionalfail=[];
    let badlist=[];

    for (let test=first;test<=last;test++) {

        globalParams.resdiv.append('<HR><p>Starting Test '+test+'</p>');
        
        
        let statefile = displaytestlist[test]['state'];
        if (statefile.length>0) {
            statefile=globalParams.testDataRootDirectory+'/'+statefile;
        }

        
        let desired=displaytestlist[test]['result'];
        
        let result=await runTest(
            displaytestlist[test]['viewer'] || 1,
            globalParams.testDataRootDirectory+'/'+displaytestlist[test]['base'],
            statefile,
            globalParams.testDataRootDirectory+'/'+displaytestlist[test]['comparison']);


        globalParams.comparisonTextElement.empty();
        globalParams.comparisonTextElement.append('<p>'+result.value+'</p>');

        globalParams.resdiv[0].scrollTop = globalParams.resdiv[0].scrollHeight-50;

        
        if (result.testresult === desired)  {
            good+=1;
            if (result.testresult===false)
                intentionalfail.push(test);
            else
                goodlist.push(test);
        } else {
            bad+=1;
            badlist.push(test);
        }
        
        const webconsole=$('#results');
        webconsole.empty();
        let numtests=last-first+1;
        let run=test-first+1;
        webconsole.append(`Tests for version=${bisdate}: completed=${run}/${numtests}, passed=${good}/${numtests}, failed=${bad}/${numtests}`);

    }
    
};

var initialize=function(testlist) {

    var fixRange=function(targetname) {
        
        let target=$(targetname);
        let val=target.val();
        if (val<0)
            val=0;
        if (val>=testlist.length)
            val=testlist.length-1;
        target.val(val);
        
    };
    
    $('#first').change( (e) => {
        e.preventDefault();
        fixRange("#first");
    });

    $('#last').change( (e) => {
        e.preventDefault();
        fixRange("#last");
    });

    $('#first').val(0);
    $('#last').val(testlist.length-1);

};


// -----------------------------------------------------------------
/**
 * A web element that runs the regression testing in conjuction with biswebtest.html
 */
class DisplayRegressionElement extends HTMLElement {
    
    // Fires when an instance of the element is created.
    connectedCallback() {
        let numviewers = parseInt(this.getAttribute('bis-numviewers') || 1);

        globalParams.tabset = this.getAttribute('bis-tabset') || null;
        
        globalParams.viewerid=[];
        globalParams.tabid=[];
        for (let i=1;i<=numviewers;i++) {
            globalParams.viewerid.push(this.getAttribute('bis-viewerid'+i));
            globalParams.tabid.push(this.getAttribute('bis-tab'+i));
        }
        
        if (typeof window.BIS !=='undefined') 
            globalParams.testDataRootDirectory="../test/testdata/display";
        else 
            globalParams.testDataRootDirectory="./test/testdata/display";

        webutil.runAfterAllLoaded( () => {

            
            globalParams.application = document.querySelector(this.getAttribute("bis-application"));
            globalParams.resdiv=$('#displayresults');
            globalParams.resultImageElement=$('#imgoutput');
            globalParams.goldImageElement=document.querySelector('#imggold');
            globalParams.comparisonTextElement=$('#comparison');
            initialize(displaytestlist);

            globalParams.application.setVisibleTab(2);
            setTimeout( () => {
                globalParams.application.setVisibleTab(1);
            },1000);

            $('#compute').click( (e) => {
                e.preventDefault(); // cancel default behavior
                runTests();
            });
            
        });
    }
}

webutil.defineElement('bisweb-displayregressionelement', DisplayRegressionElement);


