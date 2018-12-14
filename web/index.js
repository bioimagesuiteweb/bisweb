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
    alertDiv : null,
    serviceWorker : null,
    latestVersion : null,
    scope : '',
    disableServiceWorker : false,
    runningAsDesktopApp : false,
    deferredInstallPrompt : null,
    installButton : null,
    offlineButton : false,
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
                  style="position:absolute; top:65px; left:30px; z-index: 100">
                  <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${message}</a></div>`);
    $('body').append(internal.alertDiv);
    internal.alertDiv.alert();
};

let setEnableDisableMenu=function(enable=true) {

    let w=internal.offlineButton[0].children[0];
    if (enable)
        w.innerHTML='Enable Offline Mode';
    else
        w.innerHTML='Disable Offline Mode';
};

// ------------------------------------------------------------------------------
// Communication with Service Worker
// ------------------------------------------------------------------------------

let receivedMessageFromServiceWorker = function(msg) {
    
    if (msg.indexOf("Cache Updated")>=0) {
        showAlert(`The application cache has been updated. The application can now run in offline mode if there is need.`);
        setEnableDisableMenu(false);
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
    } else if (msg.indexOf('Cleaned')>=0) {
        showAlert('All offline capabilities have been removed. The application will still happily run if you have a network connection.','info');
        setEnableDisableMenu(true);
    } else if (msg.indexOf('NewSW')>=0 ) {
        if (internal.runningAsDesktopApp)
            showAlert('All offline capabilities have been removed (due to major update).','info');
        else
            showAlert('All offline capabilities have been removed due to update.','info');

        setEnableDisableMenu(true);
        
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

let getCacheState=async function() { // jshint ignore:line

    let mode='empty';
    try {
        mode=await idb.get('cache');
    } catch(e) {
        console.log('---- Failed to read mode. Assuming empty');
    }

    return mode;
};// jshint ignore:line

let getOfflineMode=async function() { // jshint ignore:line

    try {
        let n=await idb.get('network');
        if (n==='offline')
            return true;
    } catch(e) {
        console.log('---- Failed to read network. Assuming online');
    }

    return false;
};// jshint ignore:line


let getCachedVersion=async function() { // jshint ignore:line

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

// ------------------------------------------------------------------------

let doesNewVersionExist=async function() { // jshint ignore:line
    
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

let cacheLatestVersion=async function(hasnewversion) { // jshint ignore:line

    let state=await getCacheState();  // jshint ignore:line
    let latestVersion=internal.latestVersion;
    let cacheVersion=await getCachedVersion();
    
    let s='';

    /*    if (internal.hasServiceWorker) {
        s=`<p> BioImage Suite Web is a <a href="https://developers.google.com/web/progressive-web-apps/" target="_blank" rel="nopener"> progressive web application</a> which can download itself into the cache of your Browser for offline use.</p>`;
    }*/
    let dates=`<UL>
<LI>The version you have cached is: ${cacheVersion.date} (${cacheVersion.time})</LI>
<LI> The latest version is: ${latestVersion.date} (${latestVersion.time})</LI></UL>`;

    let fn = ( () => { sendCommandToServiceWorker('updateCache'); });
    
    let m=getModal();
    if (hasnewversion) {
        m.title.text('The cached version (for offline use) is out of date');
        s+=dates+`<p> If you would like to update this (recommended), press <EM>Update</EM> below.</p>`;
        m.addButton('Update','danger',fn);
    }  else if (state==='empty') {
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
        cacheLatestVersion(true);
};// jshint ignore:line

// ---------------------------------------------
// Called Help|About
// ---------------------------------------------
let aboutApplication=async function() {// jshint ignore:line

    let dosimple=true;
    let offline=false;
    let mode='empty';
    let cachedate='';
    let electron=true;
    
    if (typeof (window.BISELECTRON) === "undefined") {
        electron=false;
        
        offline=await getOfflineMode();
        if (offline) {
            showAlert(`In offline mode. Everything should still work (other than regression testing.)`);
            return;
        }
        
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
    
    if (dosimple)  {
        let m=getModal();
        m.title.text('About this Application');
        let s=`<p>This is the main page of BioImage Suite Web ${tools.version} ( current build= ${bisdate.version}, ${bisdate.date}, ${bisdate.time}).</p>`;
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

let createApplicationSelector=async function(externalobj) {
    
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
            
            if (internal.runningAsDesktopApp) {
                imagestring+=`<div class="item${cname}"><a href="#" id="L${url}" target="${target}"><img src="${picture}" alt="${title}" style="height:400px"><div class="carousel-caption">${count}. ${description}</div></div>`;
                menustring+=`<li><a href="#" id="W${elem.url}" role="button">${title}</a></li>`;
                urllist.push({
                    name : elem.url,
                    url  : url
                });
            } else {
                imagestring+=`<div class="item${cname}"><a href="${url}" target="${target}"><img src="${picture}" alt="${title}" style="height:400px"><div class="carousel-caption">${count}. ${description}</div></div>`;
                menustring+=`<li><a href="${url}" role="button">${title}</a></li>`;
            }
                
            let b=`<li data-target="#mycarousel" data-slide-to="${i+2}"></li>\n`;
            indstring+=b;
        }
    }

    container.append($(imagestring));
    topmenu.empty();
    topmenu.append($(menustring));
    indicators.append($(indstring));

    if (internal.runningAsDesktopApp) {
        console.log('List=',urllist);
        let scale=window.devicePixelRatio || 1.0;
        for (let i=0;i<urllist.length;i++) {
            let elem=urllist[i];
            let url=elem.url;
            let name=elem.name;
            
            let wd=Math.round(scale * (tools.tools[name].width || 800));
            let ht=Math.round(scale*  (tools.tools[name].height || 600));
            
            $(`#W${name}`).click( (e) => {
                e.preventDefault();
                window.open(url,'BioImageSuite Web '+name,`height=${ht},width=${wd}`);
            });
            $(`#L${name}`).click( (e) => {
                e.preventDefault();
                window.open(url,'BioImageSuite Web '+name,`height=${ht},width=${wd}`);
            });
        }
        let slist=$('.bislink');
        for (let i=0;i<2;i++) {
            let link=slist[i].href;
            slist[i].click( (e) => {
                e.preventDefault();
                console.log('Link was',link);
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

        let cache=await getCacheState();
        internal.offlineButton = $(`<li><a href="#">Offline Mode</a></li>`);
        setEnableDisableMenu(cache === 'empty');
        $("#othermenu").append(internal.offlineButton);
            
        internal.offlineButton.click( (e) => {
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
                let newsep=null;
                
                evt.preventDefault();
                // Stash the event so it can be triggered later.
                internal.deferredInstallPrompt=evt;
                
                internal.deferredInstallPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        sendCommandToServiceWorker('updateCache');
                        newsep.remove();
                        internal.installButton.remove();
                        internal.installButton=null;
                        internal.deferredInstallPrompt = null;
                    }
                });
                
                
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                console.log('.... Before Install Fired');
                newsep=$(`<li class="divider"></li>`);
                $("#othermenu").append(newsep);
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

let createVersionBoxes=async function() {


    let extra="";
    
    let color="#ffffff";
    if (tools.version.indexOf("a")>1 || tools.version.indexOf("b")>1) {
        internal.unstable=true;
        extra=`, ${bisdate.time}`;
        color="#ff2222";
    }

    let bb=$(`<div align="right" style="right:5.5vw; top:624px;  z-index:5000; position: absolute; color:${color}">
             Version:  ${tools.version} (${bisdate.date}${extra})</div>`);
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
        msg+=" <B> Running in offline mode -- no network connection.</B>";
        cmode="info";
    }

    if (msg.length>1) {
        let w = $(`<div class="alert alert-${cmode} alert-dismissible" role="alert"  style="position:absolute; top:65px; left:20px; z-index:5000">
          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${msg}
          </div>`);
        $('body').append(w);
        w.alert();
    }
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
        getCacheState().then( (m) => {
            if (m===('full')) {
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
            internal.runningAsDesktopApp=true;
    } catch (e) {
        console.log('Error ',e);
    }

    if (window.navigator.standalone === true) {
        internal.runningAsDesktopApp=true;
    }
    console.log('.... Running as Desktop app=',internal.runningAsDesktopApp);

    createApplicationSelector(tools.tools);
    createVersionBoxes();

    

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



window.biswebdebug=function(f) {
    if (f) {
        sendCommandToServiceWorker("debugon");
    } else {
        sendCommandToServiceWorker("debugoff");
    }
};
    
window.doesNewVersionExist=doesNewVersionExist;
