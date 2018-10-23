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

/* global window,document,setTimeout */
"use strict";

/**
 * @file A Broswer module. Contains {@link WebUtl}.
 * @author Xenios Papademetris
 * @version 1.0
 */


const bisweb_templates = `
      <!-- panel template -->

      <template id="bispanel">
      <!-- Begin Panel -->
      <div class="panel panel-default">
      <div class="panel-heading" role="tab" id="heading">
      <h4 class="panel-title">
      <a data-toggle="collapse" data-parent="#parent" href="#contents" aria-expanded="false" aria-controls="contents">
      Collapsible Group Item #1
</a>
    </h4>
    </div>
    <div id="contents" class="panel-collapse collapse" role="tabpanel" aria-labelledby="heading">
    <div class="panel-body">
    Hello
</div>
    </div>
    </div>
    <!-- End Panel -->
    </template>

    <template id="bismodal">
    <!-- Begin Modal -->
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
    <!-- End Modal -->
    </template>


    <template id="bisdialog">
    <!-- Begin Non Modal -->
  <div class="modal-dialog">
    <div class="modal-content">
       <div class="modal-header">

          <button type="button" class="bistoggle"><span class="glyphicon glyphicon-remove"></span></button>
              <h4 class="modal-title">Modal title</h4>
       </div>
       <div class="modal-body">
       </div>
       <div class="modal-footer">
          <button type="button" class="btn btn-sm btn-default" data-dismiss="modal">Close</button>
       </div>
    </div><!-- /.modal-content -->
  </div>
    <!-- End Non Modal -->
    </template>

    <!-- Scrollable table -->

    <template id="bisscrolltable">
    <div style="margin: 0px">
    <div class="table-responsive" style="margin: 1px">
    <table class="table table-striped table-hover table-condensed" style="margin: 0px">
    <thead class="bisthead">
    <td>Title 1</td>
    <td>Title 2</td>
    <td>Title 3</td>
    </thead>
    </table>
    </div>
    <div class="table-responsive bistscroll" style="padding: 0px; margin:0 px">
    <table class="table table-hover table-striped table-condensed table-scrollable">
    <tbody class="bistbody">
    <tr>
    <td>Help 1</td>
    <td>Help 2</td>
    <td>Help 3</td>
    </tr>
    <tr>
    <td>Help 11</td>
    <td>Help 12</td>
    </tr>
    <tr>
    <td>Help 21</td>
    <td>Help 22</td>
    </tr>
    <tr>
    <td>Help 31</td>
    <td>Help 32</td>
    </tr>
    </tbody>
    </table>
    </div>
    </div>
    </template>`;


const $ = require('jquery');
const bootbox=require('bootbox');
const biswrap = require('libbiswasm_wrapper');
const genericio= require('bis_genericio');

const names = ["default", "primary", "success", "info", "warning", "danger", "link"];
const directions = ["top", "bottom", "left", "right"];

let tools=require('../../web/images/tools.json');

/** A JQuery object that is a wrapper around the DOM objects. 
 * See: {@link http://learn.jquery.com/using-jquery-core/jquery-object/}.
 * @typedef JQueryElement
 */


const internal = {
    idcounter: 0,
    templates: null,
    alertcount: 0,
    alerttimeout: 8000,
    alerttop: 70,
};


/**
 * Deletes a modal dialog by removing it from the DOM.
 * @param {HTMLElement} modal - The modal dialog to remove 
 */
let deleteModal = (modal) => {
    let modalDiv = modal.dialog[0].parentNode;
    modalDiv.parentNode.removeChild(modalDiv);
};

const webutil = {

    /** set alert top 
     * @alias WebUtil.setAlertTop
     * @param {number} offset -- value in pixels
     */
    setAlertTop : function(v) {
        internal.alerttop=v;
    },


    /** getfont size
     * alias WebUtil.getfontsize
     * @param {Canvas} canvas -- the canvas to draw on (needed for width)
     * @param {boolean} large -- if true base is 14px instead of 12px
     * returns{number} -- font size
     */
    getfontsize: function (canvas, large) {
        large = large || false;
        var dw = canvas.width || 600.0;
        if (dw > 900)
            dw = 900;
        var out;
        if (large)
            out = Math.round(14 * dw / 600);
        else
            out = Math.round(12 * dw / 600);
        return out;
    },

    // ----------------------------------------------------------------
    // Bootstrap/JQuery GUI Stuff
    // ----------------------------------------------------------------

    /** returns a unique id 
        @alias WebUtil.getuniqueid
        @param {string} prefix - optional prefix
        @returns {string} id
    */
    getuniqueid: function (prefix) {
        prefix = prefix || '';
        internal.idcounter = internal.idcounter + 1;
        if (prefix !== '')
            return prefix + '_B_' + internal.idcounter;
        return `B_${internal.idcounter}`;
    },


    /** replaces ids,for's and name with unique versions for use with templates
        @alias WebUtil.fixDomTree
        @param {Element} root - root element to rename all children from
        @param {string} prefix - prefix for id's
        @returns {string} uniqueid - uniqueid prefix added to all children's existing ids,names and fors
    */
    fixDomTree: function (root, prefix) {

        var nid = webutil.getuniqueid(prefix);
        $(root).find('*').each(function (i, e) {
            ['for', 'id', 'name', 'aria-controls', 'href', 'aria-labeledby'].forEach(function (attrname) {
                var attr = $(e).attr(attrname) || '';
                if (attr !== '') {
                    $(e).attr(attrname, attr + nid);
                }
            });
        });
        return nid;
    },

    /** activate template .. the inputs are essentially something like this
     * @alias WebUtil.createWithTemplate
     * @param {Element} template - the template element
     * @param {JQueryElement} parent   - the parent 'div' or something to add it to -- we make a new div and add everything inside and then add this to parent
     * @param {string} prefix - prefix to create new id's, fors and names
     * @returns {string} idprefix - id prefix added to all elements
     */
    createWithTemplate: function (template, parent, prefix) {

        var clone = document.importNode(template.content, true);
        var div = webutil.creatediv({ parent: parent });
        div[0].appendChild(clone);
        var n = '';
        if (prefix !== 'none')
            n = webutil.fixDomTree(div, prefix);
        else
            n = this.getuniqueid();
        div.attr('id', n);
        return n;
    },


    /** 
     * function to remove all children from a widget
     * @alias WebUtil.removeallchildren
     * @param {JQueryElement} element - the Jquery Element (e.g. div)
     */
    removeallchildren : function(elem) {

        let frame=$(elem)[0];
        
        while (frame.firstChild) {
            frame.removeChild(frame.firstChild);
        }
    },

    /** 
     * function that adds a tooltip to Jquery element (using bootstrap)
     * @alias WebUtil.addtooltip
     * @param {JQueryElement} bt - the Jquery Element (e.g. button)
     * @param {object} opts - the options object
     * @param {string} opts.tooltip - string to use for tooltip
     * @param {string} opts.position - position of tooltip (one of top,bottom,left,right)
     */
    addtooltip: function (bt, opts) {

        if ((bt || null) === null ||
            (opts || null) === null)
            return bt;

        var tooltip = opts.tooltip || false;
        var position = opts.position || "top";

        if (tooltip === false)
            return bt;

        var ind = directions.indexOf(position);
        if (ind < 0)
            ind = 0;

        bt.attr({
            "data-toggle": "tooltip",
            "data-placement": directions[ind],
            "title": tooltip
        });
        return bt;
    },


    /** 
     * function that enables or disables a Jquery element 
     * @alias WebUtil.enablebutton
     * @param {JQueryElement} bt - the Jquery Element (e.g. button)
     * @param {boolean} doenable - if true enable else disable
     */
    enablebutton: function (bt, doenable) {

        doenable = doenable || false;
        if (doenable)
            bt.removeAttr('disabled');
        else
            bt.attr('disabled', 'disabled');
    },


    /** 
     * function that creates button using Jquery/Bootstrap (for styling)
     * @alias WebUtil.createbutton
     * @param {object} opts - the options object.
     * @param {string} opts.name - the name of the button.
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {object} opts.css - if specified set additional css styling info (Jquery .css command, object)
     * @param {string} opts.type - type of button (for bootstrap styling). One of "default", "primary", "success", "info", "warning", "danger", "link"
     * @param {boolean} opts.large - if true use large button else small (default)
     * @param {function} opts.callback - if specified adds this is a callback ``on click''. The event (e) is passed as argument.
     * @param {string} opts.tooltip - string to use for tooltip
     * @param {string} opts.position - position of tooltip (one of top,bottom,left,right)
     * @returns {JQueryElement} 
     */
    createbutton: function (opts) {

        if ((opts || null) === null)
            return null;

        var name = opts.name || "name";
        var type = opts.type || "info";
        var parent = opts.parent || null;
        var css = opts.css || null;
        var attr = opts.attr || null;
        var ind = names.indexOf(type);
        var callback = opts.callback;
        var large = opts.large || false;

        var classname = "";
        if (ind < 0)
            classname = "btn " + type;
        else
            classname = "btn btn-" + names[ind];

        if (!large)
            classname=classname+ " btn-sm";
        var bt = $("<button type=\"button\" class=\"" + classname + "\">" + name + "</button>");

        if (attr !== null)
            bt.attr('bis', attr);

        if (css !== null)
            bt.css(css);

        if (callback !== undefined && callback!==null) {
            if (typeof callback !== "function")
                throw (new Error(callback + ' is not a function in creating button' + name));

            bt.click(function (e) {
                e.preventDefault(); // cancel default behavior
                callback(e);
            });
        }

        this.disableDrag(bt);
        
        if (parent !== null)
            parent.append(bt);

        if ((opts.tooltip || null) === null)
            return bt;
        return this.addtooltip(bt, opts);
    },

    /**
     * function that creates a label using Jquery/Bootstrap (for styling)
     * @alias WebUtil.createlabel
     * @param {object} opts - the options object.
     * @param {string} opts.name - the name (text) of the element
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {object} opts.css - if specified set additional css styling info (Jquery .css command, object)
     * @param {string} opts.type - type of button (for bootstrap styling). One of "default", "primary", "success", "info", "warning", "danger", "link"
     * @param {string} opts.tooltip - string to use for tooltip
     * @param {string} opts.position - position of tooltip (one of top,bottom,left,right)
     * @returns {JQueryElement} 
     */
    createlabel: function (opts) {

        opts = opts || {};
        var name = opts.name || "name";
        var type = opts.type || "info";
        var parent = opts.parent || null;
        var css = opts.css || null;
        var ind = names.indexOf(type);
        var tooltip = opts.tooltip || null;
        if (ind < 0)
            ind = 0;
        var classname = "label label-" + names[ind];

        var bt = $("<span class=\"" + classname + "\">" + name + "</span>");
        if (parent !== null)
            parent.append(bt);

        if (css !== null) {
            bt.css(css);
        }

        if (tooltip === null)
            return bt;
        return this.addtooltip(bt, opts);
    },

    /** creates a bootstrap button-grp styled div
     * @alias WebUtil.createbuttonbar
     * @param {object} opts - the options object.
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {object} opts.css - if specified set additional css styling info (Jquery .css command, object)
     * @returns {JQueryElement} 
     */
    createbuttonbar: function (opts) {

        opts = opts || {};

        var parent = opts.parent || null;
        var css = opts.css || null;

        var bbar = $("<div class=\"btn-group\" role=\"group\" aria-label=\"...\">");
        if (css !== null)
            bbar.css(css);
        if (parent !== null)
            parent.append(bbar);
        return bbar;
    },

    /** creates a div
     * @alias WebUtil.creatediv
     * @param {object} opts - the options object.
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {object} opts.css - if specified set additional css styling info (Jquery .css command, object)
     * @param {string} opts.classname - if specified set the css classname 
     * @returns {JQueryElement} 
     */
    creatediv: function (opts) {

        opts = opts || {};
        var parent = opts.parent || null;
        var css = opts.css || null;
        var classname = opts.classname || null;

        var bbar;
        if (classname === null)
            bbar = $("<div></div>");
        else
            bbar = $("<div class=\"" + classname + "\"></div>");

        if (css !== null)
            bbar.css(css);
        if (parent !== null)
            parent.append(bbar);

        return bbar;
    },


    /** creates a bootstrap banel group (a div with class=panel_group and a unique id)
     * @alias WebUtil.createpanelgroup
     * @param {element} parent - the parent element. If specified the new button will be appended to it.
     * @param {number} offset - if specified (else 1) something to add to the id
     * @returns {JQueryElement}
     */
    createpanelgroup: function (parent, offset) {

        offset = offset || 1;
        parent = parent || null;

        var cid = webutil.getuniqueid('core') + offset;
        var panel = $("<div class=\"panel-group\" id=\"" + cid + "\" role=\"tablist\" aria-multiselectable=\"false\"></div>");
        if (parent !== null)
            parent.append(panel);
        return panel;
    },

    
    /** 
     * function that creates a checkbox using Jquery/Bootstrap (for styling)
     * @alias WebUtil.createcheckbox
     * @param {object} opts - the options object.
     * @param {string} opts.name - the name (text) of the element
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {object} opts.css - if specified set the value of the `bis' attribute to this
     * @param {string} opts.type - type of button (for bootstrap styling). One of "default", "primary", "success", "info", "warning", "danger", "link". This is used for the label that is part of the checkbox.
     * @param {string} opts.tooltip - string to use for tooltip
     * @param {string} opts.position - position of tooltip (one of top,bottom,left,right)
     * @param {function} opts.callback - if specified adds this is a callback ``on change''. The event (e) is passed as argument.
     * @returns {JQueryElement} 
     */
    createcheckbox: function (opts) {

        opts = opts || {};
        var name = opts.name || ["none"];
        var type = opts.type || "info";
        var parent = opts.parent || null;
        var css = opts.css || null;
        var checked = opts.checked || false;
        var callback = opts.callback || undefined;

        if (type !== "")
            type = " abc-checkbox-" + type;

        var nid = this.getuniqueid();
        var par = $('<div class="checkbox abc-checkbox' + type + '" style="display: inline-block"></div>');
        var checkbutton = $('<input id="' + nid + '" class="styled" type="checkbox">');
        var label = $('<label for="' + nid + '" style="font-size:11px">' + name + '</label>');
        par.append(checkbutton);
        par.append(label);
        checkbutton.prop("checked", checked);

        if (css !== null)
            label.css(css);

        if (callback !== undefined) {
            if (typeof callback !== "function")
                throw (new Error(callback + ' is not a function in creating select ' + names));

            checkbutton.change(function (e) {
                e.preventDefault(); // cancel default behavior
                var p = checkbutton.is(":checked") || false;
                callback(p);
            });
        }

        if (parent !== null) {
            parent.append(par);
            return checkbutton;
        }
        return par;

    },


    /** 
     * function that creates a checkbox using Jquery/Bootstrap (for styling)
     * @alias WebUtil.createtogglecheckbox
     * @param {object} opts - the options object.
     * @param {string} opts.name - the name (text) of the element
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {object} opts.css - if specified set the value of the `bis' attribute to this
     * @param {string} opts.type - type of button (for bootstrap styling). One of "default", "primary", "success", "info", "warning", "danger", "link". This is used for the label that is part of the checkbox.
     * @param {string} opts.tooltip - string to use for tooltip
     * @param {string} opts.position - position of tooltip (one of top,bottom,left,right)
     * @param {function} opts.callback - if specified adds this is a callback ``on change''. The event (e) is passed as argument.
     * @returns {JQueryElement} 
     */
    createtogglecheckbox: function (opts) {
        opts = opts || {};
        var checked = opts.checked || false;
        var callback = opts.callback || undefined;

        if (callback !== undefined) {
            if (typeof callback !== "function")
                throw (new Error(callback + ' is not a function in creating select ' + names));
        } else
            throw (new Error(callback + ' is not a function in creating select ' + names));

        var btn;
        var enablecallback = false;
        var mycallback = function () {
            var state = btn.data('state');
            if (enablecallback) {
                state = !state;
                btn.data('state', state);
            }
            btn.blur();

            if (!state) {
                btn.css({
                    'border-radius': '0px',
                    'color': "#bbbbbb"
                });

                btn.removeClass('btn-success');
                btn.addClass('btn-default');
            } else {
                btn.css({
                    'border-radius': '20px',
                    'color': "#ffffff"
                });
                btn.addClass('btn-success');
                btn.removeClass('btn-default');
            }

            if (enablecallback)
                callback(state);
        };
        if (checked)
            opts.type = "success";
        else
            opts.type = "default";


        opts.callback = mycallback;
        btn = this.createbutton(opts);
        btn.css({ 'outline': '0px' });
        btn.data('state', checked);
        mycallback();
        enablecallback = true;
        return btn;
    },

    /** 
     * function that creates a radio button set element using Jquery/Bootstrap (for styling)
     * @alias WebUtil.createselect
     * @param {object} opts - the options object.
     * @param {array} opts.values - an array with all the options to create (e.g. [ "Red", "Green", "Blue" ]
     * @param {array} opts.value - the current value e.g. "Red"
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {function} opts.callback - if specified adds this is a callback ``on change''. The event (e) is passed as argument.
     * @returns {JQueryElement} 
     */

    createradiobuttonset : function(opts) {

        opts = opts || {};
        let values = opts.values || [ "Yes" , "No" ];
        let value = opts.value || opts.values[0];
        let callback = opts.callback || undefined;
        let parent = opts.parent || null;
        let multiline=opts.multiline || false;
        
        let base=$('<div></div>');
        //let radios = [];
        let uid=this.getuniqueid();

        let mline='style="display: inline-block"';
        if (multiline)
            mline="";

        // Avoid create inside loop
        let createradio=function(i) {
            let checked="";
            if (value === values[i])
                checked="checked";

            let nid = this.getuniqueid();
            let par = $(`<div class="radio" ${mline}></div>`);
            let radio = $(`<input type="radio" id="${nid}" name="${uid}" value="${values[i]}" ${checked}>`);
            let label = $(`<label for="${nid}" style="font-size:11px; margin-right:10px"> ${opts.values[i]} </label>`);
            label.prepend(radio);
            par.append(label);
            base.append(par);

            //let index=i;
            if (callback !== undefined) {
                if (typeof callback !== "function")
                    throw (new Error(callback + ' is not a function in creating select ' + names));
                
                radio.change(function (e) {
                    e.preventDefault(); // cancel default behavior
                    var p = radio.is(":checked") || false;
                    if (p)
                        callback(radio.attr('value'));
                });
            }
            if (parent !== null) {
                parent.append(base);
            }
        };


        // cal create function in loop
        for (let i=0;i<values.length;i++) 
            createradio(i);
        return base;
        
    },

    /** create a radio select modal (Promise)
     * @param{String} title -- the top text
     * @param{String} value  - the current value
     * @param{array} options -- arrray of objects { value: value, text:text }
     * @param{String} extra -- extra html for the bottom
     * @returns{Promise} - the payload is the return value
     */
    createRadioSelectModalPromise : function (title,buttonname,value,options,extra="") {

        let name=this.getuniqueid();
        
        let ids=[];
        
        let str=`${title}`;
        for (let i=0;i<options.length;i++) {
            let newid=this.getuniqueid();
            ids.push(newid);
            let checked="";
            if (options[i].value===value)
                checked="checked";
            
            str+=`<div class="radio">
                <label><input type="radio"  name="${name}" id="${newid}" value="${options[i].value}" ${checked}>${options[i].text}</label>
                </div>`;
        }
        str+=extra;

        return new Promise( (resolve,reject) => {
            
            bootbox.dialog({
                message: str,
                closeButton: false,
                buttons: {
                    ok: {
                        label: buttonname,
                        className: 'btn-info',
                        callback: function(){
                            for (let j=0;j<options.length;j++) {
                                let radio=$("#"+ids[j]);
                                let p=radio.is(":checked") || false;
                                if (p) {
                                    resolve(radio.attr('value'));
                                }
                            }
                            reject("Failed to find anything");
                        }
                    }
                }
            });
        });
    },

    /** 
     * function that creates a select element using Jquery/Bootstrap (for styling)
     * @alias WebUtil.createselect
     * @param {object} opts - the options object.
     * @param {array} opts.values - an array with all the options to create (e.g. [ "Red", "Green", "Blue" ]
     * @param {string} opts.parent - the parent element. If specified the new button will be appended to it.
     * @param {object} opts.css - if specified set the value of the `bis' attribute to this
     * @param {string} opts.tooltip - string to use for tooltip
     * @param {string} opts.position - position of tooltip (one of top,bottom,left,right)
     * @param {number} opts.size - size of select element (1=default)
     * @param {function} opts.callback - if specified adds this is a callback ``on change''. The event (e) is passed as argument.
     * @returns {JQueryElement} 
     */
    createselect: function (opts) {

        opts = opts || {};
        var names = opts.values || ["none"];
        var index = opts.index || -1;
        var parent = opts.parent || null;
        var size = opts.size || 1;
        var css = opts.css || { 'background-color': "#505050", 'color': "#ffffff" };
        var cssclass = opts.class || "dg c select";
        var callback = opts.callback || undefined;

        var select = $("<select class=\"" + cssclass + "\" + size=\"" + size + "\"></select>");
        var np = names.length;
        for (var i = 0; i < np; i++) {
            var name = names[i];
            var b = "<option value=\"" + i + "\">" + name + "</option>";
            select.append($(b));
        }

        if (css !== null)
            select.css(css);

        if (index >= 0)
            $(select).val(index);

        if (callback !== undefined) {
            if (typeof callback !== "function")
                throw (new Error(callback + ' is not a function in creating select ' + names));

            select.change(function (e) {
                e.preventDefault(); // cancel default behavior
                callback(e);
            });
        }

        if (parent !== null)
            parent.append(select);

        if ((opts.tooltip || null) === null)
            return select;
        return this.addtooltip(select, opts);
    },

    /** invokes the bootstrap tooltip function on an element. Searches all child elements of parent that have data-toggle="tooltip"
     * and activates the bootstrap-style tooltip. Do once per "gui collection"
     * @alias WebUtil.tooltip
     * @param {element} - parent.
     */
    tooltip: function (parent) {
        parent.find('[data-toggle="tooltip"]').tooltip();
    },


    /** create bootstrap modal dialog.
     * This function uses this 'bismodal' template in bistemplates.html.
     * @alias WebUtil.createmodal
     * @param {string} title - title of the modal
     * @param {string} extra  - extra class e.g. "modal-sm"
     * @returns {object} opts - the output collection of JQueryElement's. opts.dialog = main dialog, opts.body = body of dialog, opts.header/opts.footer the header/footer of dialog and opts.close the ``close'' button
     */
    createmodal: function (title, extra) {
        extra = extra || "";
        var newid = webutil.createWithTemplate(internal.templates.bismodal, $('body'));
        var div = $('#' + newid);
        div.find('.modal-title').text(title);
        if (extra !== '')
            div.find('.modal-dialog').addClass(extra);
        return {
            dialog: div.find('.fade'),
            body: div.find('.modal-body'),
            footer: div.find('.modal-footer'),
            header: div.find('.modal-header'),
            close: div.find('btn-default'),
        };
    },

    /** creates a bootstrap collapseElement group (a div with class=panel panel-default and a unique id) 
     * and children of type panel-heading and panel-body. 
     * This function uses this 'bispanel' template in bistemplates.html.
     * @alias WebUtil.createCollapseElement
     * @param {element} parent - the parent element. If specified the new button will be appended to it.
     * @param {string} title - the name of the collapse element
     * @param {boolean} open - if true add 'in' to class list of panel-collapse
     * @returns {JQueryElement} - the panel-body to which to add stuff
     */
    createCollapseElement: function (parent, title, open) {
        open = open || false;
        var parid = parent.attr('id');
        var newid = webutil.createWithTemplate(internal.templates.bispanel, parent);
        var div = $('#' + newid);
        var telem = div.find('[data-parent="#parent"]');
        telem.attr('data-parent', '#' + parid);
        telem.text(title);
        var body = div.find(".panel-body");
        body.empty();
        if (open)
            body.parent().addClass('in');
        // Eliminate div as it is a problem in this case
        $(div).children().appendTo(parent); div.remove();

        return body;
    },

    /** activates Collapse Element 
     * @param {JQueryElement} - the output of createCollapseElement
     */
    activateCollapseElement : function(elem) {

        let top=elem.parent().parent();
        let p=top.find('.in');
        if (p.length<1) {
            let link=top.find('.panel-title').children()[0];
            $(link).trigger("click");
        }

        setTimeout( () => {
            let scr=top.parent().parent();
            let h=Math.round(scr.height());
            let m=Math.round(elem.height());
            let t=(h-(m+100));
            if (t<0)
                t=0;
            scr.scrollTop(t);
        },200);
    },


    /** checks if collapse element is open or not 
     * @alias WebUtil.isCollapseElementOpen
     * @param {element} -- the collapse element as returned from WebUtil.createCollapseElement
     * @returns {Boolean} true or false
     */
    isCollapseElementOpen(elem) {

        try {
            if (elem.parent().hasClass('in'))
                return true;
        } catch (e) {
            // do nothing
        }
        return false;
    },

    

    /** create hacky non-modal dialog.
     * @alias WebUtil.createdialog
     * @returns {object} opts - the output collection of JQueryElement's. opts.dialog = main dialog, opts.show -- command to show, opts.hide = command to hide
     */
    createdialog: function (name, w, h, x, y, zindex,closecallback=null) {

        let dlg = document.createElement('bisweb-dialogelement');
        dlg.create(name,w,h,x,y,zindex,true,closecallback);
        return dlg;
    },


    /** create  drop down menu item (i.e. a single button)
     * @param {JQueryElement} dropdown - the parent to add this to
     * @param {string} name - the menu name (if '') adds separator
     * @param {function} callback - the callback for item
     * @param {string} css - extra css attributes (as string)
     */
    createDropdownItem : function (dropdown,name,callback,css='') {
        if (css==='')
            css="background-color: #303030; color: #ffffff; font-size:13px; margin-bottom: 2px";
        return this.createMenuItem(dropdown,name,callback,css);
    },

    createDropdownMenu : function (name,parent) {

        let nid=this.getuniqueid();
        
        let txt=$(`<div class="dropdown" style="display: inline-block">
                  <button id="${nid}" type="button" class="btn btn-default btn-sm" style="margin-left: 2px" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  ${name} <span class="caret"></span></button>
                  <ul class="dropdown-menu" class="label-info"  style="background-color : #303030" aria-labelledby="${nid}">
                  </ul>
                  </div>`);
        parent.append(txt);
        return txt.find('.dropdown-menu');
    },
    
    /** Create dropdown button
     * @param{
     
     /** hack to remove the ``close'' button from a dat.gui folder.
     * see {@link http://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage} for dat.gui info.
     * @alias WebUtil.removedatclose
     * @param {object} folder - the dat.gui folder to remove the close-button from.
     */
    removedatclose: function (folder) {
        $(folder.domElement).find(".close-button").remove();
    },

    /** get an active color (e.g. red background when control is live)
     * @alias WebUtil.getactivecolor
     * @returns {string} - color
     */
    getactivecolor: function () {
        return "#440000";
    },

    /** get a passive color (e.g. gray background when control is inactive)
     * @alias WebUtil.getpassivecolor
     * @returns {string} - color
     */
    getpassivecolor: function () {
        return "#303030";
    },

    getpassivecolor2: function () {
        return "#383838";
    },

    // ------------------------------------------------------------------------
    //
    // ------------------------------------------------------------------------
    inElectronApp: function () {

        if (typeof (window.BISELECTRON) === "undefined")
            return false;

        return true;
    },


    /** create drop down menu
     * @param {string} name - the menu name
     * @param {JQueryElement} parent - the parent to add this to
     * @alias WebUtil.createTopMenuBarMenu
     * @returns {JQueryElement} -- the <ul> </ul> element to which to add children
     */
    createTopMenuBarMenu: function (name, parent) {
        var html = $("<li class='dropdown'>" +
                     "<a href='#' class='dropdown-toggle'  data-toggle='dropdown' role='button' aria-expanded='false'>" + name + "<span class='caret'></span></a>" +
                     "<ul class='dropdown-menu' role='menu'>" +
                     "</ul>" +
                     "</li>");
        parent.append($(html));
        var t1 = $(".dropdown-menu", $(html));
        this.disableDrag(t1);
        return t1;
    },

    /** create  drop down menu item (i.e. a single button)
     * @param {JQueryElement} parent - the parent to add this to
     * @param {string} name - the menu name (if '') adds separator
     * @param {function} callback - the callback for item
     * @param {string} css - styling info for link element
     * activated by pressing this menu
     * @alias WebUtil.createMenuItem
     * @returns {JQueryElement} -- the  element
     */
    createMenuItem: function (parent, name, callback,css='') {

        var menuitem;
        name = name || '';
        if (name === '') {
            menuitem = $("<li class=\"divider\"></li>");
            parent.append(menuitem);
            return menuitem;
        }

        callback = callback || null;

        let style='';
        if (css.length>1)
            style=` style="${css}"`;
        
        menuitem = $(`<li><a href="#" ${style}>${name}</a></li>`);
        parent.append(menuitem);

        this.disableDrag(menuitem,true);

        
        if (callback) {
            menuitem.click(function (e) {
                e.preventDefault();
                callback(e);
            });
        }
        return menuitem;
    },
    // ------------------------------------------------------------------------
    /** create alert message
     * @param {string} text - 
     * @param {boolean} error  - if true this is an error else info;
     * @param {JQueryElement} parent - the parent to add this to. Uses $('body') if not specified.
     * @alias WebUtil.createAlert
     */
    createAlert: function (text, error, top=0,timeout=0) {

        // Remove all previous alerts -- only one is needed
        $('.alert-success').remove();
        $('.alert-info').remove();


        timeout = timeout+internal.alerttimeout;
        top     = top + internal.alerttop;
        
        let b = 'info';
        if (error === true)
            b = 'danger';
        else if (error==="progress")
            b='success';

        let w = $(`<div class="alert alert-${b} alert-dismissible" role="alert"  
style="position:absolute; top:${top}px; left:10px; z-index:${1000+internal.alertcount}">
 <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>${text}</div>`);
        
        $('body').append(w);
        internal.alertcount += 1;
        w.alert();

        if (b==='info') {
            setTimeout(function () {
                try {
                    w.remove();
                } catch(e) {
                    console.log(w,'is no more');
                }
            }, timeout );
        }
    },

    // ---------------- drag and drop controller ----------------
    /** 
     * A function to create functionality for drag-and-drop file loading in the current window
     * @alias WebUtil.createDragAndDropController
     * @param {callback} in_requestsave - function to call with an array of filenames to be handled
     */
    createDragAndCropController: function (callback) {

        let dr = document.createElement('bisweb-draganddropelement');
        $('body')[0].appendChild(dr);
        dr.setCallback(callback);
        return dr;
    },

    /** Make ane element undraggable
     * @alias WebUtil.disableDrag
     * @param {JQueryElement} bt - the Jquery Element (e.g. button)
     * @param {boolean} dochildren - if true disable this for children to 
     */
    disableDrag: function (bt,dochildren=false) {
        bt.css({
            "user-drag": "none",
            "user-select": "none",
            "-moz-user-select": "none",
            "-webkit-user-drag": "none",
            "-webkit-user-select": "none",
            "-ms-user-select": "none"
        });

        if (dochildren)
            $(bt).children().css({
                "user-drag": "none",
                "user-select": "none",
                "-moz-user-select": "none",
                "-webkit-user-drag": "none",
                "-webkit-user-select": "none",
                "-ms-user-select": "none"
            });
    },


    
    createTimestamp :function () {
        let current = new Date();
        let month = current.getMonth() + 1;
        let day = current.getDate();
        let year = current.getFullYear(); //last two digits
        let hour = current.getHours();
        let minute = current.getMinutes() < 10 ? '0' + current.getMinutes() : current.getMinutes();
        let seconds = current.getSeconds() < 10 ? '0' + current.getSeconds() : current.getSeconds();
        
        return month + '/' + day + '/' + year % 100 + ' ' + hour + ':' + minute + ':' + seconds;
    },
    

    showErrorModal: function(title = 'An error occured', errorMessage = 'Click close or anywhere outside the modal to continue') {
        let modal = webutil.createmodal(title, 'modal-sm');
        let confirmButton = webutil.createbutton({ 'name': 'Continue', 'type': 'success' });

        modal.dialog.on('hidden.bs.modal', (e) => {
            e.preventDefault();
            deleteModal(modal);
        });
        
        confirmButton.on('click', (e) => {
            e.preventDefault();
            modal.dialog.modal('hide');
        });
        
        let messageBody = $(`<p>${errorMessage}</p>`);
        modal.body.append(messageBody);
        modal.body.append($(`<br>`));
        modal.body.append(confirmButton);

        //remove close button
        modal.footer.remove();
        
        modal.dialog.modal('show');
        return {
            modal: modal,
            confirmButton: confirmButton
        };
    },

    /**
     * Creates a modal dialog that deletes itself when it is hidden from view (on event hidden.bs.modal). 
     * 
     * @param {String} modalTitle - The title displayed in the header of the modal
     */
    createPopupModal: (modalTitle, modalText = '', confirmButtonName = 'Confirm', cancelButtonName = 'Cancel') => {
        let modal = webutil.createmodal(modalTitle);
        let confirmButton = webutil.createbutton({ 'name': confirmButtonName, 'type': 'success' });
        let cancelButton = webutil.createbutton({ 'name': cancelButtonName, 'type': 'warning' });

        modal.dialog.on('hidden.bs.modal', (e) => {
            e.preventDefault();
            deleteModal(modal);
        });

        let messageBody = $(`<p>${modalText}</p>`);
        modal.body.append(messageBody);

        //remove close button
        modal.footer.find('.btn')[0].remove();

        let buttonGroup = $(`<div class="btn-group" role "group">`);
        buttonGroup.append(confirmButton);
        buttonGroup.append(cancelButton);
        modal.footer.append(buttonGroup);

        return {
            modal: modal,
            cancelButton: cancelButton,
            confirmButton: confirmButton
        };
    },

    /**
     * Creates the interface for a user to enter a new name for a given input. 
     * Note that this is only an interface and a callback must be provided to make use of the name entered by the user.
     * 
     * Invokes but does not return a promise.
     * @param {function} callback - An action to be performed after the user enters a name and clicks 'Save'. 
     */
    createRenameInputModal(callback) {
        new Promise((resolve) => {
            let modalObj = this.createPopupModal('Enter a name', '', 'Save', 'Cancel');
            let modal = modalObj.modal;

            let textbox =
                `<div class = 'form-group'> 
                    <label for='saveNameBox'>Enter your filename</label>
                    <input type='text' id='saveNameBox' class='form-control'>
                </div>`
            ;

            modalObj.confirmButton.on('click', (e) => {
                e.preventDefault();

                let saveName = document.getElementById('saveNameBox').value;

                modal.dialog.modal('hide');
                resolve({ 'name': saveName });
            });

            modalObj.cancelButton.on('click', (e) => {
                e.preventDefault();
                modal.dialog.modal('hide');
                resolve('Save canceled');
            });

            modal.body.append(textbox);
            modal.dialog.modal('show');

        }).then((obj) => {
            callback(obj);
        }).catch((e) => { console.log(e); });
    },


    aboutText(extra="") {
        return new Promise( (resolve,reject) => {
            biswrap.initialize().then(() => {
                
                let usesgpl=biswrap.uses_gpl();
                let gplextra="";
                if (usesgpl) 
                    gplextra=` (See also <a href="https://github.com/bioimagesuiteweb/gplcppcode" target="_blank">the plugin repository.</a>)`;
                
                
                resolve(`<p>This application is part of BioImage Suite Web ${tools.version}.</p><p>BioImage Suite Web is an <a href="https://github.com/bioimagesuiteweb/bisweb" target="_blank">open source</a> software package.${gplextra}</p><p>We gratefully acknowledge
                          support from the <a href="https://www.braininitiative.nih.gov/" target="_blank">NIH Brain Initiative</a> under grant R24 MH114805 (Papademetris X. and Scheinost D. PIs).</p><p>${extra}</p>`);
            }).catch( (e) => { reject(e); });
        });
    },         

    
    aboutDialog(extra="") {

        this.aboutText(extra).then((m) => {
            bootbox.alert(m);
        });
    },


    /** get full path to html file */
    getWebPageImagePath() {
        return genericio.getimagepath();
    },
    
    getWebPageURL() {
        let scope=window.document.URL.split("?")[0];
        scope=scope.split("#")[0];
        return scope;
    },
    
    getWebPageName() {

        let scope=this.getWebPageURL();
        scope=scope.split("/").pop();
        let index=scope.indexOf(".html");
        scope=scope.substr(0,index);
        return scope;
    },
    
    /** returns the templates stored in this file */
    getTemplates: function () {
        return internal.templates;
    },


    /** executes code once the window is loaded
     * @alias WebUtil.runAfrerAllLoaded
     * @param {function} clb - the function to call once the page is loaded
     */
    runAfterAllLoaded : function(clb) {

        // https://stackoverflow.com/questions/13364613/how-to-know-if-window-load-event-was-fired-already?noredirect=1&lq=1
        if (document.readyState == 'complete') {
            clb();
            return;
        }
        
        //https://stackoverflow.com/questions/807878/javascript-that-executes-after-page-load
        if (window.attachEvent) {
            window.attachEvent('onload', clb);
        } else {
            if (window.onload) {
                let currentOnLoad = window.onload;
                let newOnload = (event) => {
                    currentOnLoad(event);
                    clb();
                };
                window.onload = newOnload;
            } else {
                window.onload = clb;
            }
        }
    },


    /** A simple wrapper around window.customElements -- used for debugging
     * @param {string} name -- the name of the element on the html side
     * @param {string} classtype -- the name of the class
     */
    defineElement: function (name, classtype) {
        try {
            window.customElements.define(name, classtype);
            /*          if ( typeof(BIS) !== "undefined") {
                        console.log('defining ',name);
                        }*/
        } catch (e) {
            console.log('error defining ', name, ' error=', e);
        }
    },

    /**
     * Searches query string of URL for a value given by 'name'.
     * Taken from https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript/901144#901144
     * @alias WebUtil.getQueryParameter
     * @param {String} name Name of the parameter to search the query string for. 
     * @param {String} url URL with query string parameters. Optional -- if not specified the function will use the URL of the current page. 
     */
    getQueryParameter: function (name, url) {
        if (!url)
            url = window.location.href; 
        name = name.replace(/[[\]]/g, "\\$&"); 
        let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    },

};


// ------------------------------------------------------------------------
/** initialize templates before using */

if (typeof (document) !== "undefined") {
    let newDiv = document.createElement("div");
    newDiv.innerHTML = bisweb_templates;

    internal.templates = {
        bispanel: newDiv.querySelector('#bispanel'),
        bismodal: newDiv.querySelector('#bismodal'),
        bisdialog: newDiv.querySelector('#bisdialog'),
        bisscrolltable: newDiv.querySelector('#bisscrolltable'),
    };
}

module.exports = webutil;

