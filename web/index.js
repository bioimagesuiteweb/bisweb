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

let inelectron=false;
if (typeof (window.BISELECTRON) !== "undefined") {
    inelectron=true;
}


let createIndex=function(obj) {
    
    let menu=$("#bismenuparent");
    let container=$("#bisslides");
    let indicators=$(".carousel-indicators");
    let topmenu=$("#topappmenu");

    menu.empty();

    let bb=$(`<div align="center" style="padding:15px;  right:5.5vw; top:570px; border-radius:30px;background-color:#221100; z-index:5000; position: absolute; color:#ffffff">
         Version: ${bisdate}</div>`);

    $('body').append(bb);
    container.empty();
    indicators.empty();
    
    let keys=Object.keys(obj);
    let max=keys.length;
    
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
            
            let a='<div class="item'+cname+'">'+
                '<a href="'+url+'" target="_blank"><img src="'+picture+'">'+
                '<div class="carousel-caption">'+description+
                '</div>'+
                '</div>';
            container.append($(a));
            
            //            menu.append($('<li><a  href="'+url+'" target="_blank" role="button"><B>'+
            //                        title+'</B></a></li>'));

            topmenu.append($('<li><a  href="'+url+'" target="_blank" role="button">'+
                             title+'</a></li>'));

            let b='<li data-target="#mycarousel" data-slide-to="'+i+'"';
            if (i===0)
                b+='class="active"';
            b+="></li>";
            indicators.append($(b));
        }
    }

    if (typeof window.BIS !=='undefined')
        $("#devmenu").append(`<li><a href="../test/biswebtest.html" target="_blank">Run Regression Tests</a></li>`);
    else
        $("#devmenu").append(`<li><a href="./test/biswebtest.html" target="_blank">Run Regression Tests</a></li>`);

};

let parsejson = function(text) {
    
    let obj;
    try {
        obj=JSON.parse(text);
    } catch(e) {
        obj=null;
        console.log('Failed to parse JSON');
        return;
    }
    
    if (obj!==null) {
        createIndex(obj.tools);
    }

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
    
    
    $('.carousel').carousel({
        interval : 4000,
        wrap : true
    });
    //  $('.carousel').carousel('cycle');
    $('body').css({"background-color":"rgb(28,45,64)"});
};

let readtextdata = function (url, loadedcallback, errorcallback) {

    let xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'text';

    xhr.onload = function () {
        if (this.status == 200) {
            loadedcallback(xhr.response, url);
        } else {
            errorcallback('failed toread ' + url);
        }
        return false;
    };

    xhr.onerror = function () {
        errorcallback('Failed to get url=' + url);
    };

    xhr.send();
    return false;

};

class ApplicationSelectorElement extends HTMLElement {


    
    connectedCallback() {
        readtextdata('images/tools.json',parsejson,console.log);
    }
}

window.customElements.define('bisweb-applicationselector', ApplicationSelectorElement);


