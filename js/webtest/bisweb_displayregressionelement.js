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

const bis_webfileutil=require('bis_webfileutil');
const webutil=require('bis_webutil');
const $=require('jquery');
const bisdate=require('bisdate.js').date;
const BisWebImage=require('bisweb_image');
const userPreferences = require('bisweb_userpreferences.js');
import testmodule from '../../web/images/testdata/displaytests.json';
let displaytestlist=null;



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

let globalImage=new BisWebImage();
globalImage.createImage({ "dimensions" : [ 2,2,2] ,
                          "numframes" : 2,
                          "type": 'float' });
globalImage.getImageData()[4]=2.0;

// ---------------------- run Test -------------------------------------

var runTest = async function(testindex,viewerindex,basestate='',viewerstate='',comparisonpng='') {

    userPreferences.setImageOrientationOnLoad('None');


    globalParams.application.getViewer(0).setimage(globalImage);
    
    try {
        console.log("Reading app state from",basestate);
        //        globalParams.application.getViewer(0).clearobjectmap();
        globalParams.resdiv.append('<p>Reading app state from '+basestate+'</p>');
        await globalParams.application.loadApplicationState(basestate);
        if (viewerstate)
            await globalParams.application.loadApplicationState(viewerstate);
        globalParams.currentViewer=globalParams.application.getViewer(globalParams.application.getVisibleTab()-1);
    } catch(e) {
        throw new Error(e);
    }

    let snapshotElement=globalParams.currentViewer.getSnapShotController();
    
    let canvas=await snapshotElement.getTestImage();
    
    let outpng=canvas.toDataURL("image/png");
    globalParams.resultImageElement.attr('src',outpng);
    $('#resulttd').empty();
    $('#resulttd').append('Result '+(testindex));
    
    let resultimg=snapshotElement.createBisWebImageFromCanvas(canvas);
    
    return new Promise( (resolve,reject) => {
        
        let loadfn=() => {
            $('#goldtd').empty();
            $('#goldtd').append('Gold '+(testindex));
            globalParams.goldImageElement.removeEventListener('load',loadfn);
            
            snapshotElement.createBisWebImageFromImageElement(comparisonpng).then( (goldstandard) => {
                setTimeout( () => {
                    globalParams.resdiv.append('<p>Reading result from: '+comparisonpng+'</p>');
                    console.log(goldstandard.getDescription());
                    let tst = null;
                    let dim=goldstandard.getDimensions();
                    
                    try {
                        tst=resultimg.compareWithOther(goldstandard,"cc",0.94);
                        tst.dim=`${dim[0]},${dim[1]}`;
                    } catch(e) {
                        console.log('failed ...'+e);
                    }
                    if (tst==null) {
                        let canvas = document.createElement("canvas");
                        let image_element=globalParams.resultImageElement[0];
                      
                        canvas.height=dim[1];
                        canvas.width=dim[0];
                        console.log('Canvas=',canvas);
                        canvas.getContext("2d").drawImage(image_element,0,0,dim[0],dim[1]);
                        let newimg=snapshotElement.createBisWebImageFromCanvas(canvas);
                        console.log('newimg=',newimg.getDescription());
                        console.log('gold=',goldstandard.getDescription());
                        try {
                            tst=newimg.compareWithOther(goldstandard,"cc",0.9);
                        } catch(e) {
                            console.log('failed ...'+e);
                            tst={ testresult : false, value : -1.0 };
                        }
                        tst.dim=`<EM>(resized)</EM> ${dim[0]},${dim[1]}`;
                    } 
                      
                    globalParams.resdiv.append(`<p><b>Result</b>: ${JSON.stringify(tst)}</p>`);
                    resolve(tst);
                },2000);
            }).catch( (e) => {
                reject(e);
            });
        };
        globalParams.goldImageElement.addEventListener('load', loadfn);
        globalParams.goldImageElement.src=comparisonpng;
    });
};

// ---------------------- run tests -------------------------------------

var runTests= async function(multiple=false) {

    bis_webfileutil.setMode('local',false);
    
    globalParams.resdiv.empty();
    
    let first=parseInt($("#first").val())||0;
    let last=parseInt($("#last").val()) || 0;

    if (multiple===false) 
        last=first;
    
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
            test,
            displaytestlist[test]['viewer'] || 1,
            globalParams.testDataRootDirectory+'/'+displaytestlist[test]['base'],
            statefile,
            globalParams.testDataRootDirectory+'/'+displaytestlist[test]['comparison']);


        globalParams.comparisonTextElement.empty();

        let a="";
        if (!desired)
            a=' (intentiona fail!)';
        let b="<b>F A I L E D "+a+"</b>";
        if (result.testresult)
            b="P A S S E D "+a;
        globalParams.comparisonTextElement.append('<p>Test:'+test+' cc='+Number.parseFloat(result.value).toFixed(3)+' '+b+'</p>');
        globalParams.resdiv.append('<p>Test:'+test+' cc='+Number.parseFloat(result.value).toFixed(3)+' '+b+'</p>');

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

        let ps="(none)";
        if (goodlist.length>0)
            ps="["+goodlist.join(',')+"]";
        let ifail="(none)";
        if (intentionalfail.length>0)
            ifail="["+intentionalfail.join(',')+"]";
        let fail="(none)";
        if (badlist.length>0)
            fail="["+badlist.join(',')+"]";

        
        webconsole.append(`Tests for version=${bisdate}: completed=${run}/${numtests}, passed=${good}/${numtests}, failed=${bad}/${numtests}.&nbsp;&nbsp;&nbsp; <EM>D e t a i l s :</EM> Passed=${ps}, Failed=${fail}, Intentionally Failed=${ifail}`);

    }

    webutil.createAlert("Tests Completed");
    if (multiple===false)  {
        let newfirst=first+1;
        if (newfirst<displaytestlist.length)
            $('#first').val(newfirst);
        else
            $('#first').val(0);
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
        
        globalParams.testDataRootDirectory="images/testdata";

        let name=this.getAttribute('bis-testlist') || 'overlay';
        displaytestlist=testmodule[name];


        
        webutil.runAfterAllLoaded( () => {


            
            if (name==="overlay")
                webutil.setAlertTop(920);
            else
                webutil.setAlertTop(870);
            
            globalParams.application = document.querySelector(this.getAttribute("bis-application"));
            globalParams.resdiv=$('#displayresults');
            globalParams.resultImageElement=$('#imgoutput');
            globalParams.goldImageElement=document.querySelector('#imggold');
            globalParams.comparisonTextElement=$('#comparison');
            initialize(displaytestlist);

            $('#compute').click( (e) => {
                e.preventDefault(); // cancel default behavior
                runTests(true);
            });

            $('#computesingle').click( (e) => {
                e.preventDefault(); // cancel default behavior
                runTests(false);
            });

        });
    }
}

webutil.defineElement('bisweb-displayregressionelement', DisplayRegressionElement);


