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



let serviceWorker=null;

let receivedMessage = function(msg) {
    console.log('Worker says',msg);
    if (msg.indexOf("Cache Updated")>=0) {
        console.log('here');
        let w = $(`<div class="alert alert-success alert-dismissible" role="alert" 
		  style="position:absolute; top:80px; left:20px; z-index: 100">
		  <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>The application has been updated. Reload this webpage to use the new version<div>`);
	$('body').append(w);
	w.alert();
    }
};

let updateApplication=function() {
    serviceWorker.postMessage(JSON.stringify( {name : 'updateCache',
                                               data : 'userInput'
                                              }));
}

let getLatestVersion=async function() { 

    try  {
        const fetchResult=await fetch('./bisdate.json');
        const response=await fetchResult;
        const latestVersion= await response.json();

        console.log('latest Version=',latestVersion);
        let onlinetime=latestVersion['absolutetime'];
        let mytime=bisdate['absolutetime'];
        console.log('mytime=',mytime,typeof mytime);
        console.log('onlinetime=',onlinetime,typeof onlinetime);
        
        if (mytime<onlinetime) {
            console.log('There is a newer version online');
            let m=$(modal_text);
            m.find('.modal-title').text('There is an updated version online');
            let s=`<p> BioImage Suite Web is a <a href="https://developers.google.com/web/progressive-web-apps/" target="_blank" rel="nopener"> progressive web application</a> which downloads itself into the cache of your Broswer for offline use.</p>
                <UL><LI>The version you are using is dated : ${bisdate.date}, ${bisdate.time}</LI>
                <LI> The latest version is dated ${bisdate.date}, ${bisdate.time}.</LI></UL>
                <p> If you would like to update, press <EM>Update</EM> below.</p>`;
            m.find('.modal-body').append($(s));

            let bt=$(`<button class="btn btn-danger" type="submit" id="compute">Update</button>`);
            m.find('.modal-footer').append(bt)
            m.modal('show');
            bt.click( (e) => {
                e.preventDefault();
                e.stopPropagation();
                m.modal('hide');
                setTimeout( () => {
                    updateApplication();
                },2);
            });

        }
    } catch(e) {
        console.log('Must be offline, failed to get latest version',e);
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


    if (typeof window.BIS !=='undefined')
        $("#devmenu").append(`<li><a href="./biswebtest.html" target="_blank">Run Regression Tests</a></li>`);
    else
        $("#devmenu").append(`<li><a href="./test/biswebtest.html" target="_blank">Run Regression Tests</a></li>`);

    let newitem = $(`<li><a href="#">Update Application (Cache)</a></li>`);
    $("#othermenu").append(newitem);
    
    newitem.click( (e) => {
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();
            if (serviceWorker)
                serviceWorker.postMessage(JSON.stringify( {name : 'updateCache',
                                                           data : 'userInput'
                                                          }));
        },10);
    });
        
    let newitem2 = $(`<li><a href="#">About Application</a></li>`);
    $("#othermenu").append(newitem2);
    newitem2.click( (e) => {
        console.log('In About');
        setTimeout( () => {
            e.preventDefault();
            e.stopPropagation();

            let fn=async function() { 

                let response=null;
                try  {
                    const fetchResult=await fetch('./bisdate.json');
                    console.log(fetchResult);
                    const r=await fetchResult;
                    response= await r.json();
                    console.log(response.date);
                } catch(e) {
                    console.log(e);
                    response='none';
                }
                console.log('Response=',response);
                let m=$(modal_text);
                m.find('.modal-title').text('About this Application');
                let s=`<p>This is the main page of BioImage Suite Web ( current build= ${bisdate.date}, ${bisdate.time}).</p> <p> BioImage Suite Web is a <a href="https://developers.google.com/web/progressive-web-apps/" target="_blank" rel="nopener"> progressive web application</a> which downloads itself into the cache of your Broswer for offline use.</p> The latest version =${response}`;
                m.find('.modal-body').append($(s));
                m.modal('show');
            }
            fn();
        },10);
    });
        

    

    let bb=$(`<div align="center" style="padding:15px;  right:5.5vw; top:570px; border-radius:30px;background-color:#221100; z-index:5000; position: absolute; color:#ffffff">
             Version: ${bisdate.date}</div>`);
    $('body').append(bb);
    console.log('bisdate=',JSON.stringify(bisdate));

};


let initialize=function() {

    setTimeout( () => {
        createIndex(tools.tools);
        $('.carousel').carousel({   interval : 1000,    wrap : true  });
    }, 10);

    // Remove all previous alerts -- only one is needed
    
    let parent = $("#bisslides");
    let msg=`These applications are still in 'beta' (development) stage. Use with care.`;
    
    let w = $(`<div class="alert alert-info alert-dismissible" role="alert"  style="position:absolute; top:30px; left:20px; z-index:100">
          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${msg}
          </div>`);
    parent.append(w);
    w.alert();
    setTimeout(function () {
        $('.alert-info').remove();
    }, 20000);
    
    

};

var createserviceworker=function() {

    return new Promise( (resolve,reject) => {
        
        let scope='/webapp/';
        
        // service worker registered
        navigator.serviceWorker.register(`${scope}bisweb-sw.js`, { scope: scope })
            .then(function(registration) {
                serviceWorker = registration.active;
                console.log(`____ bisweb -- service worker registered ${scope}`);
            });
        
        navigator.serviceWorker.addEventListener('message', function(event) {
            receivedMessage(event.data);
        });
        
        // service worker ready
        navigator.serviceWorker.ready.then(function(registration) {
            serviceWorker = registration.active;
            console.log(`____ bisweb -- service worker ready, ${serviceWorker}`);
            resolve();
        }).catch( (e) => { reject(e) ; });
    });
}

window.onload = (() => {
    $('body').css({"background-color":"rgb(28,45,64)"});
    initialize();
    if (typeof (window.BISELECTRON) === "undefined" && ('serviceWorker' in navigator)) {
        createserviceworker().then( () => {
            console.log('Sending message');
            serviceWorker.postMessage( JSON.stringify({
                'name' : 'hello',
                'data' : 'xenios',
            }));
            getLatestVersion();
        });
    }

});




