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
const gettestdata=require('./bis_gettestdata');
import testmodule from '../../test/webtestdata/displaytests.json';
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



// TODO: Fix Paths for web-based test file distribution

let globalImage=new BisWebImage();
globalImage.createImage({ "dimensions" : [ 2,2,2] ,
                          "numframes" : 2,
                          "type": 'float' });
globalImage.getImageData()[4]=2.0;

// ---------------------- run Test -------------------------------------

var runTest = async function(testindex,viewerindex,basestate='',viewerstate='',
                             comparisonpng='',isconnviewer=false) {

    userPreferences.setImageOrientationOnLoad('None');

    if (!isconnviewer)
        globalParams.application.getViewer(0).setimage(globalImage);
    
    try {
        console.log("Reading app state from",basestate);
        globalParams.resdiv.append('<p>Reading app state from '+basestate+'</p>');
        await globalParams.application.loadApplicationState(basestate);
        console.log('App state read from ',basestate);
        if (viewerstate) {
            await globalParams.application.loadApplicationState(viewerstate);
            console.log('Viewer  state read from ',viewerstate);
        }
        if (!isconnviewer) {
            globalParams.currentViewer=globalParams.application.getViewer(globalParams.application.getVisibleTab()-1);
        } else {
            globalParams.currentViewer=globalParams.application.getViewer(0);
        }
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

    console.log('Snapshot created');
    
    return new Promise( (resolve,reject) => {
        
        let loadfn=() => {
            console.log("Image Loaded ... ");
            $('#goldtd').empty();
            $('#goldtd').append('Gold '+(testindex));
            globalParams.goldImageElement.removeEventListener('load',loadfn);
            
            snapshotElement.createBisWebImageFromURL(comparisonpng).then( (goldstandard) => {
                setTimeout( () => {
                    globalParams.resdiv.append('<p>Read result from: '+comparisonpng+'</p>');
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
                },500);
            }).catch( (e) => {
                reject(e);
            });
        };
        globalParams.goldImageElement.addEventListener('load', loadfn);
        setTimeout( () => {
            comparisonpng=comparisonpng+"?time=" + new Date().getTime();
            console.log('Loading comparison from ',comparisonpng);
            globalParams.goldImageElement.src=comparisonpng;
        },100);
    });
};

// ---------------------- run tests -------------------------------------

var enableButtons=function(state=true) {

    let bt= [  $('#compute'), $('#computesingle') ];
    for (let i=0;i<bt.length;i++) {
        if (state) 
            bt[i].removeAttr('disabled');
        else
            bt[i].attr('disabled', 'disabled');
    }
};

var runTests= async function(multiple=false,isconnviewer=false) {

    let forcegithub= $('#usegithub').is(":checked") || false;
    globalParams.testDataRootDirectory=gettestdata.getbase(forcegithub,true);
    console.log('++++ Test Data Directory=',globalParams.testDataRootDirectory);
    
    enableButtons(false);
    
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
            globalParams.testDataRootDirectory+'/'+displaytestlist[test]['comparison'],
            isconnviewer
        );


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

        
        webconsole.append(`<p>Tests for version=${bisdate}: completed=${run}/${numtests}, passed=${good}/${numtests}, failed=${bad}/${numtests}.&nbsp;&nbsp;&nbsp; <EM>D e t a i l s :</EM> Passed=${ps}, Failed=${fail}, Intentionally Failed=${ifail}</p>`);

    }

    webutil.createAlert("Tests Completed");
    if (multiple===false)  {
        let newfirst=first+1;
        if (newfirst<displaytestlist.length)
            $('#first').val(newfirst);
        else
            $('#first').val(0);
    }
    enableButtons(true);
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

    constructor() {

        super();
        webutil.setAlertTop(920);
    }
        
    
    // Fires when an instance of the element is created.
    connectedCallback() {

        if (gettestdata.islocal()) {
            console.log('Islocal');
            $("#githubdiv").css({"visibility" : "visible"});
        }  else {
            $("#usegithublab").text('');
        }
        
        let numviewers = parseInt(this.getAttribute('bis-numviewers') || 1);

        globalParams.tabset = this.getAttribute('bis-tabset') || null;
        
        globalParams.viewerid=[];
        globalParams.tabid=[];
        for (let i=1;i<=numviewers;i++) {
            globalParams.viewerid.push(this.getAttribute('bis-viewerid'+i));
            globalParams.tabid.push(this.getAttribute('bis-tab'+i));
        }

        
        let name=this.getAttribute('bis-testlist') || 'overlay';
        displaytestlist=testmodule[name];

        let isconnviewer=false;
        
        webutil.runAfterAllLoaded( () => {

            console.log('Name = ',name);
            
            if (name==="overlay") {
                webutil.setAlertTop(920);
            } else {
                webutil.setAlertTop(870);
                isconnviewer=true;
            }
            
            globalParams.application = document.querySelector(this.getAttribute("bis-application"));
            globalParams.resdiv=$('#displayresults');
            globalParams.resultImageElement=$('#imgoutput');
            globalParams.goldImageElement=document.querySelector('#imggold');
            globalParams.comparisonTextElement=$('#comparison');
            initialize(displaytestlist);

            $('#compute').click( (e) => {
                e.preventDefault(); // cancel default behavior
                runTests(true,isconnviewer);
            });

            $('#computesingle').click( (e) => {
                e.preventDefault(); // cancel default behavior
                runTests(false,isconnviewer);
            });

        });
    }
}

webutil.defineElement('bisweb-displayregressionelement', DisplayRegressionElement);


