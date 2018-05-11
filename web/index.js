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
const bisdate=require('bisdate.js').date;
import tools from './images/tools.json';

let serviceWorker=null;

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
        

    

    let bb=$(`<div align="center" style="padding:15px;  right:5.5vw; top:570px; border-radius:30px;background-color:#221100; z-index:5000; position: absolute; color:#ffffff">
             Version: ${bisdate}</div>`);
    $('body').append(bb);

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
        if (typeof window.BIS !=='undefined')
            scope="/web/";
        
        // service worker registered
        navigator.serviceWorker.register(`${scope}bisweb-sw.js`, { scope: scope })
            .then(function(registration) {
                serviceWorker = registration.active;
                console.log(`____ bisweb -- service worker registered ${scope}`);
            });

        navigator.serviceWorker.addEventListener('message', function(event) {
            console.log('Service worker says:',event.data);
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
        });
    }
});




