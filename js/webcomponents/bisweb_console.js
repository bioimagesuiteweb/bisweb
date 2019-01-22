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

const $=require('jquery');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');
const BisWebDialogElement=require('bisweb_dialogelement');


const systemprint=console.log;
let   replacing=false;


/**
 *
 * A web element that creates a console that optionally captures console.log messages
 * By default this creates an invisible dialog. Call the show method to make it appear
 *
 * @example
 *    <bisweb-console
 *      id="console"
 *    </bisweb-console>
 */
class ConsoleElement extends BisWebDialogElement {

    constructor() {

        super();
        this.consoletext=null;

        this.create("Console",500,350,100,60,1000,true);
        
        const console_html=`<pre class="bisconsoletext" style="margin-left:5px; margin-right:5px; margin-top:5px; overflow-y: auto; position:relative; color:#fefefe; width:99%; height:99%; background-color:#000000;"></pre>`;

        

        this.hide();
        
        let elem=$(console_html);
        this.widget.append(elem[0]);
        this.consoletext=this.widget.find(".bisconsoletext");
        const self=this;

        let clearcb=function(e) {
            e.preventDefault();
            self.clearalltext();
        };

        this.widget.css({"overflow-y": "hidden" });
        this.removeCloseButton();
        
        webutil.createbutton({ type : "primary",
                               name : "Clear",
                               css : { "margin-left" : "50px" },
                               position : "bottom",
                               parent : this.footer,
                               callback :  clearcb,
                             });

        let savecb=function(e) {
            e.preventDefault();
            self.savetext();
        };

        webutil.createbutton({ type : "primary",
                               name : "Save",
                               css : { "margin-left" : "50px" },
                               position : "bottom",
                               parent : this.footer,
                               callback :  savecb,
                             });


    }

    clearalltext() {
        this.consoletext.empty();
    }

    addtext(a) {
        this.consoletext.append(a+"\n");
    }

    savetext() {

        let outstring=this.consoletext.text();
        var savesuccess = function(msg) {
            if (msg!=='')
                webutil.createAlert('Log saved in '+msg+')');
        };
        
        var savefailure = function(msg) {
            webutil.createAlert('Failed to save log ('+msg+')');
        };

        bisgenericio.write({
            filename : 'bislog.txt',
            title    : 'Select file to export console in',
            filters  : [ { name: 'Text Files', extensions: ['txt' ]}],
        },outstring).then( () => {
            savesuccess();
        }).catch( (e) => {
            savefailure(e);
        });
        
    }

    
    show(capture=true) {
        if (this.dialog===null)
            return;
        super.show();
        this.replacesystemprint(capture);
    }
    
    hide() {
        if (this.dialog===null)
            return;
        super.hide();
        this.replacesystemprint(false);
    }

    addtomenu(menu) {
        const self=this;
        webutil.createMenuItem(menu,'Show Console',function() {  
            self.show();
        });
    }

    addtomenubar(menubar) {
        var hmenu=webutil.createTopMenuBarMenu("Help",menubar);
        this.addtomenu(hmenu);
    }
    
    replacesystemprint(doreplace=true) {

        const self=this;
        if (doreplace===true && replacing===false) {
            console.log('Replacing console.log');
            const oldLog = console.log;
            replacing=true;
            console.log = function () {
                // DO MESSAGE HERE.
                let keys=Object.keys(arguments);
                let s='';
                for(let i=0;i<keys.length;i++) {
                    let v=arguments[keys[i]];
                    s+=JSON.stringify(v)+' ';
                }
                self.addtext(s);
                oldLog.apply(console, arguments);
            };
        }

        if (doreplace===false && replacing===true) {
            console.log=systemprint;
            replacing=false;
        }
    }
    
}


webutil.defineElement('bisweb-console', ConsoleElement);
module.exports=ConsoleElement;
