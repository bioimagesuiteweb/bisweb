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


// Remember to turn
// chrome://flags/#enable-desktop-pwas-link-capturing
// to on
// ----------------------------------- Imports and Global Variables -------------------------------------
const $=require('jquery');
const bisdate=require('bisdate.js');
const idb=require('idb-keyval');
const localforage=require('localforage');
const webcss=require('bisweb_css');
const userPreferences = require('bisweb_userpreferences.js');
const bisdbase = require('bisweb_dbase');

import tools from './images/tools.json';

const clipboard=localforage.createInstance({
    driver : localforage.INDEXEDDB,
    name : "BioImageSuiteWebClipboard",
    version : 1.0,
    storeName : "biswebclipboard",
    description : "BioImageSuite Web Clipboard",
});


let inelectron=false;
if (typeof (window.BISELECTRON) !== "undefined") {
    inelectron=true;
}

// idb-store has a key 'mode' with three values
// online  -- no cache
// offline -- can download
// offline-complete -- has downloaded
const internal = {
    unstable : false,
    hasServiceWorker : false,
    modal : null,
    serviceWorker : null,
    latestVersion : null,
    scope : '',
    disableServiceWorker : false,
    runningAsDesktopPWA : false,
    installingDesktopPWA : false,
    deferredInstallPrompt : null,
    installButton : null,
    enableOfflineButton : false,
    debug : false,
};

// ------------------------------------------------------------------------------
let toggleColor=function() {
    console.log('Toggling');
    webcss.toggleColorMode().then( (m) => {
        userPreferences.setItem('darkmode', m,true);
    }).catch( (e) => {
        console.log('Error',e);
    });
};

// ----------------------------------- GUI Utility Functions -------------------------------------
//
// Modal Dialog
// -------------------------------------

var getModal=function() {

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
                $('.modal-backdrop').remove();
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

    internal.modal.body.parent().addClass('biswebindexbg');
    internal.modal.title.empty();
    internal.modal.body.empty();
    internal.modal.footer.empty();
    return internal.modal;
};


// -------------------------------------
// Alert Pill
// -------------------------------------

var showAlert=function(message,type='info') {

    $(".alert").remove();
    let alertDiv = $(`<div class="alert alert-${type} alert-dismissible" role="alert" 
                  style="position:absolute; top:65px; left:30px; z-index: 20">
                  <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${message}</a></div>`);
    $('body').append(alertDiv);
    alertDiv.alert();
};


let setEnableDisableMenu=function(enable=true) {
 
    if (!internal.hasServiceWorker) 
        return;

    let w=internal.enableOfflineButton[0].children[0];
    let but1=$("#onlinebut");
    let but2=$("#offlinebut");

    if (enable) {
        w.innerHTML='Enable Offline Mode';
        but1.css({ "visibility" : "hidden"});
        but2.css({ "visibility" : "hidden"});
    } else {
        w.innerHTML='Disable Offline Mode';
        but1.css({ "visibility" : "visible"});
        but2.css({ "visibility" : "visible"});
    }
};


// ------------------------------------------------------------------------------
// Communication with Service Worker
// ------------------------------------------------------------------------------

var receivedMessageFromServiceWorker = function(msg) {

    if (internal.debug)
        console.log('.... Received',msg);
    
    if (msg.indexOf("Cache Updated")>=0) {
        setEnableDisableMenu(false);
        if (internal.installingDesktopPWA || internal.runningAsDesktopPWA) {
            setOfflineMode(true);
            showAlert(`The application has been installed and running in offline mode.`);
            internal.installingDesktopPWA=false;
        } else {
            showAlert(`The application cache has been updated. The application can now run in offline mode if there is need.`);
        }
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
            setEnableDisableMenu(true);
        },100);
        checkForLatestVersion();
    } else if (msg.indexOf('Cleaned')>=0) {
        showAlert('All offline capabilities have been removed. The application will still happily run if you have a network connection.','info');
        setEnableDisableMenu(true);
    } else if (msg.indexOf('NewSW')>=0 ) {
        if (internal.runningAsDesktopPWA)
            showAlert('All offline capabilities have been removed (due to major update).','info');
        else
            showAlert('All offline capabilities have been removed due to update.','info');
        setEnableDisableMenu(true);
        
    } else if (msg.indexOf('Going')>=0) {

        let online=false;
        if (msg.indexOf('Online')>0) {
            online=true;
        }
        setOfflineMode(!online,false);
        if (msg.indexOf('empty cache')>0) {
            console.log('Msg=',msg);
            cacheLatestVersion(false);
        } else if (msg.indexOf('No network connection')>=0 && online===false) {
            showAlert(`Operating in offline mode. There is no network connection.`);
        }
    } 

};

var sendCommandToServiceWorker=function(cmd='updateCache') {
    

    // Find worker
    try {
        internal.serviceWorker.postMessage(JSON.stringify( {name : cmd,
                                                            data : 'userInput'
                                                           }));
    } catch(e) {
        showAlert('You got the application mid-update. Please <a href="./index.html">reload this page and try again.</a>','danger');
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
var getLatestVersion=async function() { // jshint ignore:line

    let extra=".";
    if (typeof (window.BIS) !== "undefined") {
        extra="/build/web";
    }

    try {
        let t= new Date().getTime();
        let a=`${extra}/bisdate.json?time=${t}`;
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

var getCacheState=async function() { // jshint ignore:line

    let mode='empty';
    try {
        mode=await idb.get('cache');
    } catch(e) {
        console.log('---- Failed to read mode. Assuming empty');
    }

    return mode;
};// jshint ignore:line

var getOfflineMode=async function() { // jshint ignore:line

    try {
        let s=await idb.get('mode');
        if (s==='offline')
            return true;
    } catch(e) {
        console.log('---- Failed to read network. Assuming online');
    }

    return false;
};// jshint ignore:line


var getCachedVersion=async function() { // jshint ignore:line

    let dt= {
        "date" : "0000/00/00",
        "time" : "00:00:00",
        "absolutetime" : 0 ,
        "version": "0.0.0"
    };

    try {
        dt=await idb.get('cachedate');
    } catch(e) {
        console.log('---- Failed to read cachedate. Assuming past');
    }

    return dt;
};// jshint ignore:line


var setOfflineMode=function(mode,updateserviceworker=true) {

    let but1=$("#onlinebut");
    let but2=$("#offlinebut");

    let good=but1,bad=but2;
    if (mode) {
        good=but2;
        bad=but1;
    }
    good.addClass("active");
    good.addClass("btn-danger");
    good.removeClass("btn-default");
    bad.removeClass("btn-danger");
    bad.removeClass("active");
    bad.addClass("btn-default");
    

    if (updateserviceworker) {
        if (mode)
            sendCommandToServiceWorker('goOffline');
        else
            sendCommandToServiceWorker('goOnline');
    }
};

// ------------------------------------------------------------------------

var doesNewVersionExist=async function() { // jshint ignore:line
    
    // Check if we are in offline mode else return;
    let mode=await getCacheState();  // jshint ignore:line
    if (mode!=='full') {
        return false;
    }

    let latest=await getLatestVersion();  // jshint ignore:line
    if (latest<0) {
        console.log('latest=',latest);
        // we are offline (in the network sense)
        return false;
    }

    internal.onlinetime=latest;

    let myversion=await getCachedVersion();
    let mytime=myversion['absolutetime'];
    let diff=internal.onlinetime-mytime;
    let newversion=(diff>1000);
    return newversion;
}; // jshint ignore:line

var cacheLatestVersion=async function(check=true) { // jshint ignore:line


    let fn = ( () => { sendCommandToServiceWorker('updateCache'); });
    let fn2 = ( () => { sendCommandToServiceWorker('clearCache'); });
    
    let m=getModal();
    let s='';
    
    let state=await getCacheState();  // jshint ignore:line
    if (state==='empty')
        check=false;
    
    if (check) {
        let latestVersion=internal.latestVersion;
        let cacheVersion=await getCachedVersion();
        let dates='';
        dates=`<UL>
<LI>The version you have cached is: ${cacheVersion.date} (${cacheVersion.time})</LI>
<LI>The latest version is: ${latestVersion.date} (${latestVersion.time})</LI></UL>`;

        m.title.text('The cached version (for offline use) is out of date');
        s+=dates+`<p> If you would like to update this (recommended), press <EM>Update</EM> below.</p>`;
        m.addButton('Update','danger',fn);
        m.addButton('Disable Offline Mode','warning',fn2);
    }  else {
        m.title.text('Enable Offline Use');
        s+=`<p> If you would like to download all files in the browser cache to enable offline mode (recommended), press <EM>Store</EM> below.</p>`;
        m.addButton('Store','success',fn);
    }
    m.body.append($(s));
    m.addButton('Close','default');
    m.show();
}; // jshint ignore:line


var showHelpVideo=function() {

    let m=getModal();
    m.title.text('BioImage Suite Web Introductory Video');
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
        cacheLatestVersion();
};// jshint ignore:line

// ---------------------------------------------
// Called Help|About
// ---------------------------------------------
var aboutApplication=async function() {// jshint ignore:line

    let dosimple=true;
    let offline=false;
    let mode='empty';
    let cachedate='';
    let electron=true;
    
    if (typeof (window.BISELECTRON) === "undefined") {
        electron=false;
        
        offline=await getOfflineMode();
        mode= await getCacheState(); // jshint ignore:line
        if (mode === 'full') {
            let dt=await getCachedVersion();
            cachedate=` (<EM>Cached Version=${dt.version}, ${dt.date}, ${dt.time}</EM>)`;
        }
        
        if (internal.disableServiceWorker===true) {
            dosimple=true;
        } else if (mode!=='empty') {
            let m=await doesNewVersionExist(); // jshint ignore:line
            if (m)
                dosimple=false;
        }
    }

    console.log('This far ');
    
    if (dosimple)  {
        let m=getModal();
        m.title.text('About this Application');
        let s=`<p>This is the main page of BioImage Suite Web ${bisdate.version} ( current build= ${bisdate.version}, ${bisdate.date}, ${bisdate.time}).</p>`;
        if (internal.hasServiceWorker) {
            if (offline)
                s+=`<p>This application is running in offline mode.</p>`;
            else if (mode === 'full')
                s+=`<p><B>Note:</B> This application has been cached in your Browser's cache to enable running in offline mode.${cachedate}</p>`;
            else if (electron===false)
                s+=`<p>This application has not been cached in your Browser's cache. Hence it can not run in offline mode. You may enable this under the Help menu </p>`;
        }
        m.body.append($(s));
        m.addButton('Close','default');
        m.show();
    } else {
        cacheLatestVersion(true);
    }

}; // jshint ignore:line


// ------------------------------------------------------------------------------
//
// Create the Main GUI
//
// ------------------------------------------------------------------------------

var createApplicationSelector=async function(externalobj) {
    
    let container=$("#bisslides");
    let indicators=$(".carousel-indicators");
    let topmenu=$("#topappmenu");


    /*    let hardcorded = {
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
    };*/

    let imagestring="";
    let menustring="";
    let indstring="";
    let count=0;

    let target="_blank";
    let urllist = [];
    
    let keys=Object.keys(externalobj);
    let max=keys.length;
        
    for (let i=0;i<max;i++) {
            
        let elem=externalobj[keys[i]];
        let title=elem.title;
        let url='';
        
        if (elem.url.indexOf('http')===0) {
            url=elem.url;
        } else {
            url=internal.scope+elem.url+'.html';
        }
        
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
            
            if (internal.runningAsDesktopPWA) {
                imagestring+=`<div class="item${cname}"><a href="#" id="L${url}" target="${target}"><img src="${picture}" alt="${title}" style="height:400px"><div class="carousel-caption">${count}. ${description}</div></div>`;
                menustring+=`<li><a href="#" id="W${elem.url}" role="button">${title}</a></li>`;
                urllist.push({
                    name : elem.url,
                    url  : url
                });
            } else {
                imagestring+=`<div class="item${cname}"><a href="${url}" target="${target}"><img src="${picture}" alt="${title}" style="height:400px"><div class="carousel-caption">${count}. ${description}</div></div>`;
                menustring+=`<li><a href="${url}" role="button" target="${target}">${title}</a></li>`;
            }
                
            let b=`<li data-target="#mycarousel" data-slide-to="${i+2}"></li>\n`;
            indstring+=b;
        }
    }

    container.append($(imagestring));
    topmenu.empty();
    topmenu.append($(menustring));
    indicators.append($(indstring));

    if (internal.runningAsDesktopPWA) {
        console.log('List=',urllist);
        let scale=window.devicePixelRatio || 1.0;

        for (let i=0;i<urllist.length;i++) {
            let elem=urllist[i];
            let url=elem.url;
            let name=elem.name;
            
            let wd=Math.round(scale * (tools.tools[name].width || 700));
            let ht=Math.round(scale*  (tools.tools[name].height || 625));
            
            $(`#W${name}`).click( (e) => {
                e.preventDefault();
                window.open(url,'BioImageSuite Web '+name,`height=${ht},width=${wd}`);
            });
            $(`#L${name}`).click( (e) => {
                e.preventDefault();
                window.open(url,'BioImageSuite Web '+name,`height=${ht},width=${wd}`);
            });
        }
    }



    $("#aboutapp").click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            aboutApplication();
        },10);
    });

    $("#togglecolor").click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            toggleColor();
        },10);
    });

    $("#showvideo").click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            showHelpVideo();
        },10);
    });

    let s=window.document.URL;
    let index=s.lastIndexOf("/");
    let urlbase=s.substr(0,index);
    let urlbase2=urlbase+'/images';
    if (inelectron)
        urlbase2='images/';
    let newurl=`${urlbase}/overlayviewer.html?load=${urlbase2}/viewer.biswebstate`;
    
    $("#othermenu").append($(`<li><a href="${newurl}" target="${target}">Example Image Overlay</a></li>`));

    
    console.log('.... Creating Service Worker Menu Items='+internal.hasServiceWorker);

    if (internal.hasServiceWorker) {

        $("#othermenu").append($(`<li class="divider"></li>`));
        let but = $(`<li><a href="#">Disable Offline Mode</a></li>`);
        $("#othermenu").append(but);

        internal.enableOfflineButton = but;
        let cache=await getCacheState();
        setEnableDisableMenu(cache === 'empty');
            
        but.click( (e) => {
            e.preventDefault();

            setTimeout( () => {
                getCacheState().then( (m) => {
                    if (m==='full') {
                        sendCommandToServiceWorker('clearCache');
                    } else {
                        sendCommandToServiceWorker('updateCache');
                     }
                });
            },100);
        });
        
        window.addEventListener('beforeinstallprompt', (evt) => {
            
            evt.preventDefault();
            
            if (internal.installButton===null) {

                
                evt.preventDefault();
                // Stash the event so it can be triggered later.
                internal.deferredInstallPrompt=evt;
                
                internal.deferredInstallPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        internal.installingDesktopPWA=true;
                        sendCommandToServiceWorker('updateCache');
                        internal.installButton.remove();
                        internal.installButton=null;
                        internal.deferredInstallPrompt = null;
                    }
                });
                
                
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                console.log('.... Before Install Fired');
                internal.installButton = $(`<li><a href="#">Install as Desktop-"like" Application</a></li>`);
                $("#othermenu").append(internal.installButton);
                
                internal.installButton.click('click', () => {
                    internal.deferredInstallPrompt.prompt(); 
                });
            } else {
                internal.deferredInstallPrompt=evt;
            }
        });
    }


    $("#applicationstext").click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            $(".dropdown").removeClass("open");//this will remove the active class from  
            $('#appmenu').addClass('open');
        },10);
    });
        


};

var createVersionBoxes=async function() {


    let extra="";
    
    let color="#ffffff";
    if (bisdate.version.indexOf("a")>1 || bisdate.version.indexOf("b")>1) {
        internal.unstable=true;
        extra=`, ${bisdate.time}`;
        color="#ff2222";
    }

    let bb=$(`<div align="right" style="right:5.5vw; top:624px;  z-index:50; position: absolute; color:${color}">
             Version:  ${bisdate.version} (${bisdate.date}${extra})</div>`);
    $('body').append(bb);


    let offline=await getOfflineMode();
    let state=await getCacheState();
    console.log('.... Initializing cache-state=',state,' offline=',offline);

    let msg="";
    let cmode="warning";    
    if (internal.unstable) {
        msg=`These applications are under active development. Use with care.`;
    }
    if (offline) {
        msg+=" <B> Running in offline mode.</B>";
        cmode="info";
    }

    if (msg.length>1) {
        let w = $(`<div class="alert alert-${cmode} alert-dismissible" role="alert"  style="position:absolute; top:65px; left:20px; z-index:50">
          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${msg}
          </div>`);
        $('body').append(w);
        w.alert();
    }
};


// ------------------------------------------------------------------------------
var mapOnlineOfflineButtons=async function() {

    let but1=$("#onlinebut");
    let but2=$("#offlinebut");

    but1.click( (e) => {
        e.preventDefault();
        setOfflineMode(false);
    });

    but2.click( (e) => {
        e.preventDefault();
        setOfflineMode(true);
    });

    let offline=await getOfflineMode();
    setOfflineMode(offline,false);
    
};

// ------------------------------------------------------------------------------
//
// Create the service worker
//
// ------------------------------------------------------------------------------
var createServiceWorker=function() {

    internal.hasServiceWorker=true;
    let scope=window.document.URL;
    
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
        console.log(`.... bisweb -- service worker registered ${scope}`);
    });
    
    
    // service worker ready
    // Find this and add event listener
    navigator.serviceWorker.ready.then(function(registration) {
        internal.serviceWorker = registration.active;
        navigator.serviceWorker.addEventListener('message', function(event) {
            receivedMessageFromServiceWorker(event.data);
        });
        setTimeout( () => {
            getCacheState().then( (m) => {
                if (m===('full')) {
                    checkForLatestVersion();
                }
            });
        },2000);
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
        $('body').removeClass('biswebactive');
        showAlert('Failed to read file from '+url,'danger');
        return;
    };
    
    reader.onload = function (e) {
        $('body').removeClass('biswebactive');
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

    webcss.setAutoColorMode();
    $('body').addClass('biswebindexbg');
    
    // Only register if not in electron and not in development mode
    if (typeof (window.BIS) === "undefined") {
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
    }

    try {
        if (window.matchMedia('(display-mode: standalone)').matches)
            internal.runningAsDesktopPWA=true;
    } catch (e) {
        console.log('Error ',e);
    }
    
    if (window.navigator.standalone === true) {
        internal.runningAsDesktopPWA=true;
    }
    console.log('.... Running as Desktop pwa=',internal.runningAsDesktopPWA);

    createApplicationSelector(tools.tools);
    createVersionBoxes();
    mapOnlineOfflineButtons();
    

    $('#mycarousel').carousel(
        {
            interval: 3000,
            wrap : true,
        });
    $('#mycarousel').carousel('cycle');

    /*setTimeout( ()=> {
        $(".dropdown").removeClass("open");//this will remove the active class from  
        $('#appmenu').addClass('open');
    },50);*/

    window.addEventListener("dragover", (e) => {
        e.stopPropagation();
        e.preventDefault();
        $('#appmenu').removeClass('open');
        $('body').addClass('biswebactive');
        
    },false);
    
    window.addEventListener("dragleave", (e) => {
        e.stopPropagation();
        e.preventDefault();
        $('body').removeClass('biswebactive');
    },false);

    window.addEventListener("drop", (e) => {
        $('body').removeClass('biswebactive');
        e.stopPropagation();
        e.preventDefault();
        fileSelectHandler(e);
    },false);


    userPreferences.initialize(bisdbase).then( () => {
        userPreferences.safeGetItem('darkmode').then( (m) => {
            let s=webcss.isDark();
            if (m!==s) 
                toggleColor();
        });
    });
});



window.biswebdebug=function(f) {
    if (f) {
        sendCommandToServiceWorker("debugon");
        internal.debug=true;
    } else {
        sendCommandToServiceWorker("debugoff");
        internal.debug=false;
    }
};



