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

const $=require('jquery');
const bisdate=require('bisdate.js');
import tools from './images/tools.json';

const modal_text=`
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
    `;


// Create a dialog box for later
let modal=null;
let serviceWorker=null;
let alertDiv=null;

let getModal=function() {

    if (modal===null) {
        let m = $(modal_text);
        modal= {
            dlg : m,
            title : m.find('.modal-title'),
            body  : m.find('.modal-body'),
            footer : m.find('.modal-footer'),
            show : ( () => { m.modal('show'); }),
            hide : ( () => { m.modal('hide'); }),
        };
        modal.addButton = function(name,type,clb=null) {
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
    };

    modal.title.empty();
    modal.body.empty();
    modal.footer.empty();
    return modal;
}


let showAlert=function(message,type='info') {

    if (alertDiv)
        alertDiv.remove();

    alertDiv = $(`<div class="alert alert-${type} alert-dismissible" role="alert" 
		  style="position:absolute; top:80px; left:20px; z-index: 100">
		  <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${message}</a><\div>`);
	$('body').append(alertDiv);
    alertDiv.alert();
};

let receivedMessage = function(msg) {
    
    if (msg.indexOf("Cache Updated")>=0) {
        showAlert(`The application has been updated. <a href="./index.html">Reload this webpage to use the new version.</a>`);

    } else if (msg.indexOf('Downloaded')>=0) {
        showAlert(msg);
    } else {
        console.log('Worker says',msg);
    }
};

let updateApplication=function() {

    // Find worker
    navigator.serviceWorker.ready.then(function(registration) {
        serviceWorker = registration.active;
        navigator.serviceWorker.addEventListener('message', function(event) {
            receivedMessage(event.data);
        });
        console.log('Re found this ... service worker');
        serviceWorker.postMessage(JSON.stringify( {name : 'updateCache',
                                                   data : 'userInput'
                                                  }));
    });
}

let simpleAbout=function(offline) {

    let m=getModal();
    m.title.text('About this Application');
    let s=`<p>This is the main page of BioImage Suite Web ( current build= ${bisdate.date}, ${bisdate.time}).</p>`;
    if (typeof (window.BISELECTRON) === "undefined") {
        if (offline)
            s+=`<p>This application is running in offline mode.</p>`;
        s+=`<p>BioImage Suite Web is a <a href="https://developers.google.com/web/progressive-web-apps/" target="_blank" rel="nopener"> progressive web application</a> which downloads itself into the cache of your Browser for offline use.</p>`;
    }
    m.body.append($(s));
    m.addButton('Close','default');
    m.show();
};

let getLatestVersion=async function(mode='normal') { 

    // mode is 'force' (force update), 'silent' (if nothing new keep quiet), 'normal' (bring about box);

    let force=false;
    if (mode==='force')
        force=true;
    let quiet=false;
    if (mode==='quiet')
        quiet=true;

    try  {
        let t= new Date().getTime()
        const fetchResult=await fetch(`./bisdate.json?time=${t}`);
        const response=await fetchResult;
        const latestVersion= await response.json();

        let onlinetime=latestVersion['absolutetime'];
        let mytime=bisdate['absolutetime'];
        
        let diff=onlinetime-mytime;
        let newversion=(diff>1000);
        
        if (newversion || force == true) {
            let m=getModal();
            if (newversion) 
                m.title.text('There is an updated version online');
            else
                m.title.text('This is the latest version');
            let s=`<p> BioImage Suite Web is a <a href="https://developers.google.com/web/progressive-web-apps/" target="_blank" rel="nopener"> progressive web application</a> which downloads itself into the cache of your Broswer for offline use.</p>
                <UL><LI>The version you are using is: ${bisdate.date}, ${bisdate.time}</LI>
                <LI> The latest version is: ${latestVersion.date}, ${latestVersion.time}.</LI></UL>`;
            if (newversion) 
                s+=`<p> If you would like to update (recommended), press <EM>Update</EM> below.</p>`;
            else
                s+=`<p> If you would like to reload all files, press <EM>Reinstall</EM> below.</p>`;
            m.body.append($(s));

            let fn = ( () => { updateApplication(newversion); });
            if (newversion) 
                m.addButton('Update','danger',fn)
            else
                m.addButton('Reinstall','info',fn)
            m.addButton('Close','default');

            m.show();
        } else if (force) {
            updateApplication();
        } else if (!quiet) {
            simpleAbout(false);
        }
    } catch(e) {
        console.log('Must be offline, failed to get latest version',e);
        if (force)  {
            showAlert(`We can not connect to the server right now. Please try again later.`,'danger');
        } else if (quiet) {
            showAlert(`In offline mode. Everything should still work (other than regression testing.)`);
        } else {
            simpleAbout(true);
        }
    }
};


let inelectron=false;
if (typeof (window.BISELECTRON) !== "undefined") {
    inelectron=true;
}



let createIndex=function(obj) {
    
    let menu=$("#bismenuparent");
    let container=$("#bisslides");
    let indicators=$(".carousel-indicators");
    let topmenu=$("#topappmenu");

    
    let keys=Object.keys(obj);
    let max=keys.length;

    let imagestring="";
    let menustring="";
    let indstring="";
    
    for (let i=0;i<max;i++) {
        let elem=obj[keys[i]];
        let title=elem.title;
        let url='./'+elem.url+'.html';
        let description=elem.description;
        let picture=elem.picture;
        let electrononly=elem.electrononly || false;
        
        if ( inelectron === true ||
             (inelectron === false && electrononly===false)) {
            
            let cname="";
            if (i===0)
                cname=" active";
            
            let a=`<div class="item${cname}"><a href="${url}" target="_blank"><img src="${picture}" alt="${title}"><div class="carousel-caption">${i+1}. ${description}</div></div>`;
            imagestring+=a;
            
            menustring+=`<li><a  href="${url}" target="_blank" role="button">${title}</a></li>`;

            let b='<li data-target="#mycarousel" data-slide-to="'+i+'"';
            if (i===0)
                b+='class="active"';
            b+="></li>";
            indstring+=b;
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

    let extra="main page ";
    let extra2="";
    let url=window.document.URL;
    if  (url.indexOf('/unstable')>0) {
        extra="testing page (unstable version)"
        extra2="Unstable";
    }

    
    let newitem2 = $(`<li><a href="#">About Application</a></li>`);
    $("#othermenu").append(newitem2);
    newitem2.click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            getLatestVersion();
        },10);
    });

    if (typeof (window.BISELECTRON) === "undefined") {
        $("#othermenu").append($(`<li class="divider"></li>`));
        let newitem = $(`<li><a href="#">Update Application (Cache)</a></li>`);
        $("#othermenu").append(newitem);
        
        newitem.click( (e) => {
            setTimeout( () => {
                e.preventDefault();
                e.stopPropagation();
                getLatestVersion('force');
            },10);
        });


        let s=window.document.URL;
        let index=s.lastIndexOf("/");
        let urlbase=s.substr(0,index);
        let url=`${urlbase}/overlayviewer.html?load=${urlbase}/images/sample.json`;

        $("#othermenu").append($(`<li class="divider"></li>`));
        $("#othermenu").append($(`<li><a href="${url}" target="_blank">Example Image Overlay</a></li>`));
    }

    
    
        
    let bb=$(`<div align="center" style="padding:15px;  right:5.5vw; top:570px; border-radius:30px;background-color:#221100; z-index:5000; position: absolute; color:#ffffff">
             Version: ${extra2} ${bisdate.date}</div>`);
    $('body').append(bb);
    console.log('bisdate=',JSON.stringify(bisdate));

};


let initialize=function() {

    createIndex(tools.tools);
    $('.carousel').carousel({   interval : 1000,    wrap : true  });
    
    let parent = $("#bisslides");
    let msg=`These applications are still in 'beta' (development) stage. Use with care.`;
    let w = $(`<div class="alert alert-warning alert-dismissible" role="alert"  style="position:absolute; top:80px; left:20px; z-index:100">
          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${msg}
          </div>`);
    parent.append(w);
    w.alert();

};

var createserviceworker=function() {

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
    console.log('Scope for registering = ',scope);
    
    // service worker registered
    
    navigator.serviceWorker.register(`${scope}bisweb-sw.js`, { scope: scope }).then(function(registration) {
            serviceWorker = registration.active;
            console.log(`____ bisweb -- service worker registered ${scope}`);
        });
    
    
    // service worker ready
    navigator.serviceWorker.ready.then(function(registration) {
        serviceWorker = registration.active;
        navigator.serviceWorker.addEventListener('message', function(event) {
            receivedMessage(event.data);
        });
        getLatestVersion('quiet');
    });
}

window.onload = (() => {
    initialize();
    // Only launch a web app if this is a /webapp and service
    if (typeof (window.BISELECTRON) === "undefined") {
        if ('serviceWorker' in navigator) {

            if (typeof (window.BIS) === "undefined") {
                createserviceworker();
            } else {
                console.log('---- not creating service worker ... in development mode');
            }
        }
    }
});




