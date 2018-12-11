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


"use strict";

/*jshint browser: true*/
/*jshint undef: true, unused: true */


// ----------------------------------- Imports and Global Variables -------------------------------------
const $=require('jquery');
const bisdate=require('bisdate.js');
const idb=require('idb-keyval');
const localforage=require('localforage');
import tools from './images/tools.json';

const clipboard=localforage.createInstance({
    driver : localforage.INDEXEDDB,
    name : "BioImageSuiteWebClipboard",
    version : 1.0,
    storeName : "biswebclipboard",
    description : "BioImageSuite Web Clipboard",
});

let deferredPrompt=null;


let inelectron=false;
if (typeof (window.BISELECTRON) !== "undefined") {
    inelectron=true;
}

// idb-store has a key 'mode' with three values
// online  -- no cache
// offline -- can download
// offline-complete -- has downloaded
const internal = { 
    hasServiceWorker : false,
    modal : null,
    alertDiv : null,
    serviceWorker : null,
    latestVersion : null,
    scope : '',
    disableServiceWorker : false,
};

// ----------------------------------- GUI Utility Functions -------------------------------------
//
// Modal Dialog
// -------------------------------------

let getModal=function() {

    if (internal.modal===null) {
        let m =$(`
       <div class="modal fade">
         <div class="modal-dialog">
           <div class="modal-content">
             <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Modal title</h4>
             </div>
             <div class="modal-body">
             </div>
             <div class="modal-footer">
               <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
             </div>
           </div><!-- /.modal-content -->
         </div><!-- /.modal-dialog -->
       </div><!-- /.modal -->
    `);
        internal.modal= {
            dlg : m,
            title : m.find('.modal-title'),
            body  : m.find('.modal-body'),
            footer : m.find('.modal-footer'),
            firsttime : false,
            show : ( () => {
                $('#mycarousel').carousel('pause');
                m.modal('show');
                if (internal.modal.firsttime) {
                    internal.modal.dlg.modal.on("hidden.bs.modal", function () {
                        $('#mycarousel').carousel('cycle');
                    });
                }
                internal.modal.firsttime=false;
            }),
            hide : ( () => {
                $('#mycarousel').carousel('cycle');
                m.modal('hide');
            }),
        };
        internal.modal.addButton = function(name,type,clb=null) {
            let tp=`type="submit"`;
            if (type==='Close')
                tp="";
                
            let bt=$(`<button class="btn btn-${type}" ${tp}>${name}</button>`);
            this.footer.append(bt);
            bt.click( (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
                if (clb) {
                    setTimeout( () => {
                        clb();
                    },2);
                }
            });
        };

    }

    internal.modal.body.parent().css({ "background-color" : "rgb(28,45,64)"});
    internal.modal.title.empty();
    internal.modal.body.empty();
    internal.modal.footer.empty();
    return internal.modal;
};


// -------------------------------------
// Alert Pill
// -------------------------------------

let showAlert=function(message,type='info') {

    if (internal.alertDiv)
        internal.alertDiv.remove();

    internal.alertDiv = $(`<div class="alert alert-${type} alert-dismissible" role="alert" 
                  style="position:absolute; top:80px; left:20px; z-index: 100">
                  <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${message}</a></div>`);
    $('body').append(internal.alertDiv);
    internal.alertDiv.alert();
};

// ------------------------------------------------------------------------------
// Communication with Service Worker
// ------------------------------------------------------------------------------

let receivedMessageFromServiceWorker = function(msg) {
    
    if (msg.indexOf("Cache Updated")>=0) {
        showAlert(`The application has been updated. <a href="./index.html">Reload this to use the new version.</a>`);

    } else if (msg.indexOf('Downloaded')>=0) {
        showAlert(msg);
    } else if (msg.indexOf('Activate')>=0) {
        setTimeout( () => {

            navigator.serviceWorker.ready.then(function(registration) {
                internal.serviceWorker = registration.active;
                navigator.serviceWorker.addEventListener('message', function(event) {
                    receivedMessageFromServiceWorker(event.data);
                });
            });
        },100);
        checkForLatestVersion();
        /*        idb.get('mode').then( (mode) => {
                  console.log('Mode=',mode);
                  if (mode!=='online') {
                  showAlert(`The application has been automatically updated (as current version is invalid). <a href="./index.html">Reload this to use the new version.</a>`);
                  }*/
    } else if (msg.indexOf('Cleaned')>=0) {
        showAlert('All offline capabilities have been removed. The application will still happily run if you have a network connection. <a href="./index.html">Please restart this page to complete the process.</a>','info');
        navigator.serviceWorker.register(`${internal.scope}bisweb-sw.js`, { scope: internal.scope }).then(function(registration) {
            registration.unregister().then( (m) => {
                console.log('service worker unregistered for good measure ',m);
                internal.disableServiceWorker=true;
            });
        });
    } else if (msg.indexOf('NewSW')>=0 ) {
        showAlert('All offline capabilities have been removed (due to major update). You may re-cache the  application for offline use using Help|Cache.','info');
    } else {
        console.log('other=',msg);
    }
};

let sendCommandToServiceWorker=function(cmd='updateCache') {
    

    // Find worker
    try {
        
        internal.serviceWorker.postMessage(JSON.stringify( {name : cmd,
                                                            data : 'userInput'
                                                           }));
    } catch(e) {
        showAlert('You got the application mid-update. Please <a href="./index.html">reload this page and try again.</a>','warning');
        navigator.serviceWorker.ready.then(function(registration) {
            internal.serviceWorker = registration.active;
            navigator.serviceWorker.addEventListener('message', function(event) {
                receivedMessageFromServiceWorker(event.data);
            });
        });
    }
};

// ------------------------------------------------------------------------------
//
// Inform the User about Offline/Online Status
//
// Scenaria
//
//  start application -- if offline enabled check for new version and prompt for download
//
//  user selects 'Help|About' -- if offline not enabled simple call simpleAbout, else check for new version and it is new offer to download
//  user selects 'Help Install' -- if no
//
//
// ------------------------------------------------------------------------------

// ---------------------
// Initial Check
// ---------------------
let getLatestVersion=async function() { // jshint ignore:line

    let extra=".";
    if (typeof (window.BIS) !== "undefined") {
        extra="/build/web";
    }
        
    try {
        let t= new Date().getTime();
        let a=`${extra}/bisdate.json?time=${t}`;
        console.log(a);
        const fetchResult=await fetch(a); // jshint ignore:line
        const response=await fetchResult;  // jshint ignore:line
        internal.latestVersion= await response.json(); // jshint ignore:line
        return internal.latestVersion['absolutetime'];
    } catch(e) {
        console.log(e,e.stack);
        // We must be offline
        internal.latestVersion=null;
        return -1;
    }

}; // jshint ignore:line

let getMode=async function() { // jshint ignore:line

    let mode='online';
    try {
        mode=idb.get('mode');
    } catch(e) {
        mode='online';
    }
    return mode;
};// jshint ignore:line

let doesNewVersionExist=async function() { // jshint ignore:line
    
    // Check if we are in offline mode else return;
    let mode=await getMode();  // jshint ignore:line
    if (mode!=='offline-complete') {
        return false;
    }

    let latest=await getLatestVersion();  // jshint ignore:line
    if (latest<0) {
        console.log('latest=',latest);
        // we are offline (in the network sense)
        return false;
    }

    internal.onlinetime=latest;
    
    let mytime=bisdate['absolutetime'];
    let diff=internal.onlinetime-mytime;
    let newversion=(diff>1000);
    return newversion;
}; // jshint ignore:line

let downloadLatestVersion=async function(hasnewversion) { // jshint ignore:line

    let idbmode=await getMode();  // jshint ignore:line
    let latestVersion=internal.latestVersion;

    let s='';

    if (internal.hasServiceWorker) {
        s=`<p> BioImage Suite Web is a <a href="https://developers.google.com/web/progressive-web-apps/" target="_blank" rel="nopener"> progressive web application</a> which can download itself into the cache of your Browser for offline use.</p>`;
    }
    let dates=`<UL>
<LI>The version you are using is: ${bisdate.date} (${bisdate.time})</LI>
<LI> The latest version is: ${latestVersion.date} (${latestVersion.time})</LI></UL>`;

    let fn = ( () => { sendCommandToServiceWorker('updateCache'); });
    
    let m=getModal();
    if (hasnewversion) {
        m.title.text('There is an updated version online');
        s+=dates+`<p> If you would like to update (recommended), press <EM>Update</EM> below.</p>`;
        m.addButton('Update','danger',fn);
    }  else if (idbmode==='online') {
        m.title.text('You can cache this application offline');
        s+=`<p> If you would like to download all files in the browser cache to enable offline mode (recommended), press <EM>Cache</EM> below.</p>`;
        m.addButton('Cache','success',fn);
    } else if (internal.disableServiceWorker==false) {
        m.title.text('This is the latest version (and is already stored offline)');
        s+=dates+`<p> If you would like to reload all files, press <EM>Re-cache</EM> below.</p>`;
        m.addButton('Re-cache','info',fn);
    } else {
        s+=dates;
    }
    m.body.append($(s));
    m.addButton('Close','default');
    m.show();
}; // jshint ignore:line


let showHelpVideo=function() {

    let m=getModal();
    m.title.text('BioImage Suite Web Introductory Video');
    m.body.parent().css({ "background-color" : "#202020"});
    m.body.append(`<iframe width="550" height="310" src="https://www.youtube.com/embed/CnbdaQ0O52k?rel=0;&autoplay=1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
    m.addButton('Close','default');
    m.show();
};


// ---------------------------------------------
// Called on start
// ---------------------------------------------

var checkForLatestVersion=async function() {// jshint ignore:line

    let m =await doesNewVersionExist();  // jshint ignore:line
    if (m)
        downloadLatestVersion(true);
};// jshint ignore:line

// ---------------------------------------------
// Called Help|About
// ---------------------------------------------
let aboutApplication=async function() {// jshint ignore:line

    let dosimple=true;
    let offline=false;
    
    if (typeof (window.BISELECTRON) === "undefined") {
    
        
        let latest=await getLatestVersion(); // jshint ignore:line
        if (latest<0) {
            offline=true;
            showAlert(`In offline mode. Everything should still work (other than regression testing.)`);
            return;
        }
        
        let mode= await getMode(); // jshint ignore:line

        if (internal.disableServiceWorker===true) {
            dosimple=true;
        } else if (mode!=='online') {
            let m=await doesNewVersionExist(); // jshint ignore:line
            if (m)
                dosimple=false;
        }
    }
    
    if (dosimple)  {
        let m=getModal();
        m.title.text('About this Application');
        let s=`<p>This is the main page of BioImage Suite Web ${tools.version} ( current build= ${bisdate.version}, ${bisdate.date}, ${bisdate.time}).</p>`;
        if (internal.hasServiceWorker) {
            if (offline)
                s+=`<p>This application is running in offline mode.</p>`;
            s+=`<p>BioImage Suite Web is a <a href="https://developers.google.com/web/progressive-web-apps/" target="_blank" rel="nopener"> progressive web application</a> which can download itself into the cache of your Browser for offline use.</p>`;
        }
        m.body.append($(s));
        m.addButton('Close','default');
        m.show();
    } else {
        downloadLatestVersion(true);
    }

}; // jshint ignore:line

// ---------------------------------------------
// Called under Help | Install
// ---------------------------------------------
let cacheLatestVersion=async function() {// jshint ignore:line

    if (internal.disableServiceWorker===true) {
        showAlert('Please reload <a href="./index.html">this page</a> and try again.','info');
        return;
    }
    
    let latest=await getLatestVersion(); // jshint ignore:line
    if (latest<0) {
        showAlert(`We can not connect to the server right now. Please try again later.`,'info');
        return false;
    } 
    
    //console.log('bisdate=',bisdate,'latest=',internal.latestVersion);
    
    let mytime=bisdate['absolutetime'];
    let diff=internal.latestVersion['absolutetime']-mytime;
    let newversion=(diff>1000);
    downloadLatestVersion(newversion);
    
};// jshint ignore:line

// ------------------------------------------------------------------------------
//
// Create the Main GUI
//
// ------------------------------------------------------------------------------

let createApplicationSelector=function(externalobj) {
    
    let container=$("#bisslides");
    let indicators=$(".carousel-indicators");
    let topmenu=$("#topappmenu");


    let hardcorded = {
        "youtube" : {
            "title" : "You Tube Channel",
            "url"   : "https://www.youtube.com/channel/UCizfR_ryJ0E-2uZspjwYtwg",
            "description" : "The BioImage Suite Web YouTube Channel",
            "picture" : "images/youtube.png"
        },
        "manual" : {
            "title" : "BioImage Suite Web Manual",
            "url" : "https://bioimagesuiteweb.github.io/bisweb-manual/",
            "description" : "The BioImage Suite Web Online Manual",
            "picture" : "images/manual.png",
        }
    };

    let objlist = [ hardcorded,externalobj ];
    let imagestring="";
    let menustring="";
    let indstring="";
    let count=0;
    
    for (let kk=0;kk<objlist.length;kk++) {

        let obj=objlist[kk];
        let keys=Object.keys(obj);
        let max=keys.length;
        
        for (let i=0;i<max;i++) {
            
            let elem=obj[keys[i]];
            let title=elem.title;
            let url='';
            if (elem.url.indexOf('http')===0)
                url=elem.url;
            else
                url='./'+elem.url+'.html';
            
            let description=elem.description;
            let picture=elem.picture;
            let electrononly=elem.electrononly || false;
            let hide=elem.hide || false;
            
            if ( hide===false && (inelectron === true || 
                                  (inelectron === false && electrononly===false))) {

                count=count+1;
                
                let cname="";
                if (count===1)
                    cname=" active";
                
                let a=`<div class="item${cname}"><a href="${url}" target="_blank"><img src="${picture}" alt="${title}" style="height:400px"><div class="carousel-caption">${count}. ${description}</div></div>`;
                imagestring+=a;

                if (kk>0)
                    menustring+=`<li><a  href="${url}" target="_blank" role="button">${title}</a></li>`;
                
                let b='<li data-target="#mycarousel" data-slide-to="'+i+'"';
                if (count===1)
                    b+='class="active"';
                b+="></li>";
                indstring+=b;
            }
        }
    }

    container.empty();
    container.append($(imagestring));
    topmenu.empty();
    topmenu.append($(menustring));

    indicators.empty();
    indicators.append($(indstring));

    let othermenu=$(`<li class='dropdown'>
            <a href='#' class='dropdown-toggle'  data-toggle='dropdown'
               role='button' aria-expanded='false'>Help<span class='caret'></span></a>
            <ul class='dropdown-menu' role='menu' id="othermenu">
            </ul>
          </li>`);
    $('#bismenuparent0').append(othermenu);

    let extra2="";
    let extra3="";
    let url=window.document.URL;
    if  (url.indexOf('/unstable')>0 ||
         url.indexOf('/build')>0 ||
         url.indexOf('/biswebtest')>0 
        ) {
        extra2="Unstable ";
        extra3=`, ${bisdate.time}`;
    }

    
    let newitem2 = $(`<li><a href="#">About Application</a></li>`);
    $("#othermenu").append(newitem2);
    newitem2.click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            aboutApplication();
        },10);
    });

    let newitem3 = $(`<li><a href="#">Show Introductory Video</a></li>`);
    $("#othermenu").append(newitem3);
    newitem3.click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            showHelpVideo();
        },10);
    });

    $("#othermenu").append($(`<li class="divider"></li>`));

    

    console.log('.... Creating Service Worker Menu Items='+internal.hasServiceWorker);
    
    if (internal.hasServiceWorker) {
        let newitem0 = $(`<li><a href="#">Remove Application (from Cache)</a></li>`);
        $("#othermenu").append(newitem0);
        newitem0.click( (e) => {
            setTimeout( () => {
                e.preventDefault();
                e.stopPropagation();
                sendCommandToServiceWorker('clearCache');
            },10);
        });

        
        let newitem = $(`<li><a href="#">Cache Application for Offline Use</a></li>`);
        $("#othermenu").append(newitem);
        
        newitem.click( (e) => {
            setTimeout( () => {
                e.preventDefault();
                e.stopPropagation();
                cacheLatestVersion();
            },10);
        });
        let sep=$(`<li class="divider"></li>`);
        $("#othermenu").append(sep);

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            deferredPrompt=e;
            console.log('Before Install Fired');

            let newsep=$(`<li class="divider"></li>`);
            $("#othermenu").append(newsep);
            let btnToAdd = $(`<li><a href="#">Install as Desktop Application</a></li>`);
            $("#othermenu").append(btnToAdd);
            
            btnToAdd.click('click', () => {

                console.log('Clicked');
        
                // hide our user interface that shows our A2HS button
                newsep.remove();
                btnToAdd.remove();
                // Show the prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                deferredPrompt.userChoice
                    .then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the A2HS prompt');
                            sendCommandToServiceWorker('updateCache'); 
                        } else {
                            console.log('User dismissed the A2HS prompt');
                        }
                        deferredPrompt = null;
                    });
            });
        });
    }

    let s=window.document.URL;
    let index=s.lastIndexOf("/");
    let urlbase=s.substr(0,index);
    let urlbase2=urlbase+'/images';
    if (inelectron)
        urlbase2='images/';
    let newurl=`${urlbase}/overlayviewer.html?load=${urlbase2}/viewer.biswebstate`;
    
    $("#othermenu").append($(`<li><a href="${newurl}" target="_blank">Example Image Overlay</a></li>`));


    $("#applicationstext").click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            $(".dropdown").removeClass("open");//this will remove the active class from  
            $('#appmenu').addClass('open');
        },10);
    });
        
    let bb=$(`<div align="center" style="padding:15px;  right:5.5vw; top:570px; border-radius:30px;background-color:#221100; z-index:5000; position: absolute; color:#ffffff">
             Version:  ${tools.version} (${extra2}${bisdate.date}${extra3})</div>`);
    $('body').append(bb);
    //    console.log('bisdate=',JSON.stringify(bisdate));

};

// ------------------------------------------------------------------------------
//
// Create the service worker
//
// ------------------------------------------------------------------------------
var createServiceWorker=function() {

    internal.hasServiceWorker=true;
    let scope=window.document.URL;
    console.log('scope=',scope);
    let index=scope.indexOf(".html");
    if (index>0) {
        index=scope.lastIndexOf("/");
        scope=scope.substr(0,index+1);
    } else {
        let index=scope.indexOf("#");
        if (index>0) {
            index=scope.lastIndexOf("/");
            scope=scope.substr(0,index+1);
        }
    }


    internal.scope=scope;


    
    // register service worker if needed
    navigator.serviceWorker.register(`${scope}bisweb-sw.js`, { scope: scope }).then(function(registration) {
        internal.serviceWorker = registration.active;
        console.log(`____ bisweb -- service worker registered ${scope}`);
    });
    
    
    // service worker ready
    // Find this and add event listener
    navigator.serviceWorker.ready.then(function(registration) {
        internal.serviceWorker = registration.active;
        navigator.serviceWorker.addEventListener('message', function(event) {
            receivedMessageFromServiceWorker(event.data);
        });
        idb.get('mode').then( (m) => {
            if (m===('offline-complete')) {
                checkForLatestVersion();
            } 
        });
    });
};

const fileSelectHandler=function(e) {

    let files = e.target.files || e.dataTransfer.files || null;
    if (!files)
        return;

    if (files.length<1)
        return;

    let reader = new FileReader();
    let url = files[0].name;

    reader.onerror = function () {
        $('#appmenu').removeClass('open');
        showAlert('Failed to read file from '+url,'danger');
        $('body').css({'background-color' : 'rgb(28,45,64)'});
        return;
    };
    
    reader.onload = function (e) {
        $('body').css({'background-color' : 'rgb(28,45,64)'});
        let obj=null;
        try {
            obj=JSON.parse(e.target.result);
        } catch(e) {
            $('#appmenu').removeClass('open');
            showAlert('Bad application state file '+url+'.','danger');
            return;
        }

        if (!obj.app) {
            $('#appmenu').removeClass('open');
            showAlert('Bad application state file '+url+'.','danger');
            return;
        }
        
        clipboard.setItem('lastappstate',obj).then( () => {
            let newurl=`./${obj.app}.html?restorestate=${url}`;
            window.open(newurl,'_self');

            //          showAlert(`This state file was created using ${obj.app}</EM>. Click <a href="./${obj.app}.html?restorestate=${url}">here to open it`);
        }).catch( (e) => { console.log(e); });
        return;
    };
    
    console.log(files);
    reader.readAsText(files[0]);
    return false;
};


// ------------------------------------------------------------------------------
//
// M a i n  F u n c t i o n
//
// ------------------------------------------------------------------------------

window.onload = (() => {

    // Only register if not in electron and not in development mode
    if (!inelectron) {
        if ('serviceWorker' in navigator) {

            let scope=window.document.URL;
            if (scope.indexOf('https')===0 || scope.indexOf('localhost')) {
                console.log('---- creating service worker ... ',scope);
                createServiceWorker();
            } else {
                console.log('---- not creating service worker ... not https',scope);
            }
        }
    }

    createApplicationSelector(tools.tools);

    let url=window.document.URL;
    if  (url.indexOf('/unstable')>0) {
        let msg=`These applications are under active development. Use with care.`;
        let w = $(`<div class="alert alert-warning alert-dismissible" role="alert"  style="position:absolute; top:570px; left:5.5vw; z-index:5000">
          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${msg}
          </div>`);
        $('body').append(w);
        w.alert();
    }



    $('#mycarousel').carousel(
        {
            interval: 3000,
            wrap : true,
        });
    $('#mycarousel').carousel('cycle');

    /*setTimeout( ()=> {
        $(".dropdown").removeClass("open");//this will remove the active class from  
        $('#appmenu').addClass('open');
    },5000);*/


    window.addEventListener("dragover", (e) => {
        e.stopPropagation();
        e.preventDefault();
        $('#appmenu').removeClass('open');
        $('body').css({'background-color' : 'rgb(28,45,128)'});

    },false);
    
    window.addEventListener("dragleave", (e) => {
        e.stopPropagation();
        e.preventDefault();
        $('body').css({'background-color' : 'rgb(28,45,64)'});
    },false);

    window.addEventListener("drop", (e) => {
        e.stopPropagation();
        e.preventDefault();
        fileSelectHandler(e);
    },false);

});



