/*global window,document,HTMLElement */

"use strict";

// imported modules from open source and bisweb repo
const bisimagesmoothreslice = require('bis_imagesmoothreslice');
const BisWebImage = require('bisweb_image');
const webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const bisimagealgo = require('bis_imagealgorithms');
const $ = require('jquery');
const bootbox = require('bootbox');
const LinearRegistration = require('linearRegistration');
const ResliceImage = require('resliceImage');
const NonlinearRegistration = require('nonlinearRegistration');
const baseutils = require('baseutils');
const BisWebPanel = require('bisweb_panel.js');
const DualViewerApplicationElement = require('bisweb_dualviewerapplication');
const BisWebDataObjectCollection=require('bisweb_dataobjectcollection');
const genericio=require('bis_genericio');

require('jstree');

// initialization of jstree formatting
const tree_template_string = `

      <div class="container" style="width:300px">
      <div id="treeDiv">
      </div>
    </div>       `;


// ---------------------------------------------------------------
// Messages to user
// --------------------------------------------------------------
let errormessage = function (e) {
    e = e || "";
    webutil.createAlert('Error Message from diffSPECT' + e, true);
};



//------------------------------------------------------------------
//Global Variables
//------------------------------------------------------------------



/** 
 * A web element to create and manage a GUI for a Diff Spect Tool (for differential spect processing for epilepsy).
 *
 * @example
 *
 * <bisweb-diffspectelement
 *    bis-menubarid="#viewer_menubar"
 *    bis-layoutwidgetid="#viewer_layout"
 *    bis-viewerid="#viewer">
 * </bisweb-diffspectelement>
 *
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 *      bis-menubarid : the menubar to insert menu items in
 */



class DiffSpectElement extends DualViewerApplicationElement {


    constructor() {

        super();

        this.dataPanel=null;
        this.resultsPanel=null;

        this.imageList = [
            'ictal',
            'interictal',
            'tmap',
            'mri'
        ];
        this.xformList = [
            'intertoictal_xform',
            'atlastomri_xform',
            'mritointerictal_xform',
            'atlastointer_xform'
        ];
        this.tempImageList = [
            'atlastointer_reslice',
            'atlastoictal_reslice',
            'intertoictal_reslice',
            'atlastomri_reslice',
            'mritointerictal_reslice',
        ];
        this.resultsList = [
            'hyper',
            'hypo'
        ];

        this.atlasList = [
            'ATLAS_spect',
            'ATLAS_mri',
            'ATLAS_stdspect',
            'ALAS_mask'
        ];

        this.saveList = this.imageList.concat(this.xformList).concat(this.resultsList);
        this.typeList = [];
        for (let i=0;i<this.saveList.length;i++) {
            if (i<this.imageList.length) {
                this.typeList.push('image');
            }  else if (i<this.imageList.length+this.xformList.length) {
                this.typeList.push('transform');
            } else
                this.typeList.push('dictionary');
        }

        
        this.allList= this.saveList.concat(this.tempImageList).concat(this.atlasList);
        this.clearList = this.xformList.concat(this.tempImageList).concat(this.resultsList);
        
        this.app_state = {
            patient_name: "No Name",
            patient_number: "0",
            does_have_mri: false,
            nonlinear: false,
        };
        
        for(let i=0;i<this.allList.length;i++) {
            this.app_state[this.allList[i]]=null;
        }

        this.patientInfoModal = null;
    }


    getApplicationStateFilenameExtension(saveimages=true) {
        if (saveimages)
            return 'diffspect';
        return "state";
    }

    
    getApplicationStateFilename(storeimages=true,ext=null) {

        ext = ext || this.getApplicationStateFilenameExtension(storeimages);
        
        let s=`${this.app_state.patient_name}_${this.app_state.patient_number}.${ext}`;
        s=s.trim().replace(/ /g,'_');
        console.log(s);
        return s;

    }

        /**
     * Creates a small modal dialog to allow the user to enter the session password used to authenticate access to the local fileserver. 
     * Also displays whether authentication succeeded or failed. 
     */
    showPatientInfoModal() {

        if (!this.patientInfoModal) {

            let nid=webutil.getuniqueid();
            let uid=webutil.getuniqueid();
            
            let dataEntryBox=$(`
                <div class='form-group'>
                    <label for='name'>Patient Name:</label>
                                 <input type='text' class = 'form-control' id='${nid}' value="">
                </div>
                <div class='form-group'>
                    <label for='number'>Patient ID:</label>
                    <input type='text' class = 'form-control' id='${uid}'>
                </div>
            `);

            this.patientInfoModal = webutil.createmodal('Enter Patient Information', 'modal-sm');
            this.patientInfoModal.dialog.find('.modal-footer').find('.btn').remove();
            this.patientInfoModal.body.append(dataEntryBox);
            
            let confirmButton = webutil.createbutton({ 'name': 'Save', 'type': 'btn-success' });
            let cancelButton = webutil.createbutton({ 'name': 'Cancel', 'type': 'btn-danger' });
            
            this.patientInfoModal.footer.append(confirmButton);
            this.patientInfoModal.footer.append(cancelButton);

            cancelButton.on('click', (e) => {
                e.preventDefault();
                this.patientInfoModal.dialog.modal('hide');
            });

            confirmButton.on('click', (e) => {
                e.preventDefault();
                this.patientInfoModal.dialog.modal('hide');
                console.log(this);
                this.app_state.patient_name=$('#'+nid).val();
                this.app_state.patient_number= $('#'+uid).val();
            });

            this.patientNameId=nid;
            this.patientNumberId=uid;
        }

        $('#'+this.patientNameId).val(this.app_state.patient_name);
        $('#'+this.patientNumberId).val(this.app_state.patient_number);
        this.patientInfoModal.dialog.modal('show');
    }

    // ------------------------------------
    // Element State
    // ------------------------------------
    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {

        let obj=super.getElementState(false);//storeImages);

        if (storeImages) {
            obj.spect = {
                name: this.app_state.patient_name,
                number: this.app_state.patient_number,
            };

            for (let i=0;i<this.saveList.length;i++) {
                let elem=this.saveList[i];
                if (!this.app_state[elem]) {
                    obj.spect[elem]='';
                } else {
                    if (this.typeList[i]==='dictionary') {
                        obj.spect[elem]=this.app_state[elem];
                    } else {
                        obj.spect[elem]=this.app_state[elem].serializeToJSON();
                    }
                }
            }
        } else {
            obj.spect={};
            for (let i=0;i<this.saveList.length;i++) {
                obj.spect[this.saveList[i]]='';
            }
        }
        return obj;
    }
    
    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null,name="") {

        if (dt===null)
            return;

        super.setElementState(dt,name);

        let input=dt.spect || {};

        this.app_state.patient_name= input.name || '';
        this.app_state.patient_number= input.number || 0;

        for (let i=0;i<this.saveList.length;i++) {
            let elem=this.saveList[i];
            input[elem]=input[elem] || '';
            if (input[elem].length<1) {
                this.app_state[elem]=null;
            } else {
                if (this.typeList[i]==='dictionary') {
                    this.app_state[elem]=input[elem];
                    console.log(elem+' loaded elements='+this.app_state[elem].length);
                } else {
                    this.app_state[elem]=BisWebDataObjectCollection.parseObject(input[elem],
                                                                                this.typeList[i]);
                    console.log(elem+' loaded=',this.app_state[elem].getDescription());
                }
            }
        }
        

        if (null !== this.app_state['tmap']) {
            this.showTmapImage();            
        }

        if (null !== this.app_state['hyper']) {
            this.generateCharts();
            this.resultsPanel.show();
        }
        
    }

    // --------------------------------------------------------------------------------
    // Load Atlas Images
    // --------------------------------------------------------------------------------

    loadAtlasData() {

        let p=new Promise( (resolve) => {
            
            let loadimagearray=function(imgnames, alldone) {
                
                let numimages = imgnames.length;
                let images = new Array(numimages);
                
                for (let i = 0; i < numimages; i++)
                    images[i] = new BisWebImage();
                
                let p = [];
                for (let i = 0; i < numimages; i++)
                    p.push(images[i].load(imgnames[i]));
                Promise.all(p)
                    .then( () => { alldone(images);
                                   resolve();
                                 }
                         )
                    .catch((e) => {
                        errormessage(e);
                    });
            };
            
            let alldone = ((images) => {            
                this.app_state.ATLAS_spect = images[0];
                this.app_state.ATLAS_mri = images[1];
                this.app_state.ATLAS_stdspect = images[2];
                this.app_state.ATLAS_mask = images[3];
                this.VIEWERS[0].setimage(this.app_state.ATLAS_mri);
                webutil.createAlert('The SPECT Tool is now ready. The core data has been loaded.');//<BR> Click either "Create New Patient" or "Load Existing Patient" to begin.');
            });
            
            let imagepath=webutil.getWebPageImagePath();
            
            loadimagearray([`${imagepath}/ISAS_SPECT_Template.nii.gz`,
                            `${imagepath}/MNI_T1_2mm_stripped_ras.nii.gz`,
                            `${imagepath}/ISASHN_Standard_Deviation.nii.gz`,
                            `${imagepath}/ISAS_SPECT_Mask.nii.gz`
                           ], alldone);
        });
        this.applicationInitializedPromiseList.push(p);
    }

    // --------------------------------------------------------------------------------
    // GUI Callbacks
    // -------------------------------------------------------------------------------



    // --------------------------------------------------------------------------------
    // Load Image Callback
    loadImage(name='ictal') {

        let handleGenericFileSelect = (imgfile)=> {
            
            let newimage = new BisWebImage();
            newimage.load(imgfile, false).then( () =>  { 
                this.app_state[name] = newimage;
                webutil.createAlert('Loaded '+name +': '+this.app_state[name].getDescription());
                this.VIEWERS[0].setimage(this.app_state[name]);
                
                for (let i=0;i<this.clearList.length;i++) {
                    let elem=this.clearList[i];
                    this.app_state[elem]=null;
                }
            });
        };

        webfileutil.genericFileCallback(
            { 
                "title"  : `Load ${name} image`,
                "suffix" : "NII" 
            },
            ( (fname) => {
                handleGenericFileSelect(fname);
            }),
        );
        
    }

    // --------------------------------------------------------------------------------
    // Create the SPECT Tool GUI
    // --------------------------------------------------------------------------------

    initializeTree() {

        let treeOptionsCallback=this.treeCallback.bind(this);
        
        const self = this;
        self.loadAtlasData();
        
        let tree=this.tree_div.find('#treeDiv');

        let json_data = {
            'core': {
                'data': [
                    {
                        'text': 'Images',
                        'state': {
                            'opened': true,
                            'selected': false
                        },
                        'children': [
                            {
                                'text': 'Interictal'
                            },
                            {
                                'text': 'Ictal'
                            },
                            {
                                'text': 'MRI'
                            }
                        ]
                    },
                    {
                        'text': 'Registrations',
                        'state': {
                            'opened': false,
                            'selected': false
                        },
                        'children': [
                            {
                                'text': 'ATLAS to Interictal'
                            },
                            {
                                'text': 'ATLAS to Ictal'
                            },
                            {
                                'text': 'Interictal to Ictal'
                            }
                        ]
                    },
                    {
                        'text': 'Diff SPECT',
                        'state': {
                            'opened': false,
                            'selected': false
                        },
                        'children': [
                            {
                                'text': 'Tmap Image'
                            },
                            
                        ]
                    }
                ]


            },
            'plugins': ['contextmenu'],
            'contextmenu' : {
                'items': treeOptionsCallback
            }
            
        };
        tree.jstree(json_data);
    }

    treeCallback(node) {

        const self=this;

        let items = {
            loadinter: {
                'label': 'Load Interictal',
                'action': () => {
                    self.loadImage('interictal');
                },
                
            },
            
            loadictal: {
                'label': 'Load Ictal',
                'action': () => {
                    self.loadImage('ictal');
                }
            },
            
            loadmri: {
                'label': 'Load MRI',
                'action': () =>  {
                    self.loadImage('mri');
                }
            },
            
            showimage: {
                'label': 'Show Image',
                'action': () => {

                    if (node.text === "Interictal") {
                        if (self.app_state.interictal !== null) {
                            webutil.createAlert('Displaying original interictal image');
                            self.VIEWERS[0].setimage(self.app_state.interictal);
                        } else  {
                            bootbox.alert('No interictal image loaded');
                        }
                    }

                    if (node.text === "Ictal") {
                        if (self.app_state.ictal !== null) {
                            webutil.createAlert('Displaying original ictal image');
                            self.VIEWERS[0].setimage(self.app_state.ictal);
                        } else  {
                            bootbox.alert('No ictal image loaded');
                        }
                    }

                    if (node.text === "MRI") {
                        if (self.app_state.mri !== null) {
                            webutil.createAlert('Displaying original mri image');
                            self.VIEWERS[0].setimage(self.app_state.mri);
                        } else  {
                            bootbox.alert('No MRI image loaded');
                        }
                    }

                    if (node.text === 'Tmap Image') {
                        if (self.app_state.tmap !== null) {
                            self.showTmapImage();
                        } else  {
                            bootbox.alert('No diff-SPECT tmap image. You need to compute this first.');
                        }
                    }
                    
                },
            },

            
            showregistration: {
                'label': 'Show Registration',
                'action': () =>  {
                    if (node.text === "ATLAS to Interictal") {
                        self.showAtlasToInterictalRegistration();
                    } else if (node.text === "ATLAS to Ictal") {
                        self.showAtlasToIctalRegistration();
                    }  else if (node.text === "Interictal to Ictal") {
                        self.showInterictalToIctalRegistration();
                    }
                }
            },
            
        };

        if (node.text === "Images")  {
            items = null;
        }

        if (node.text !== 'Interictal') delete items.loadinter;
        if (node.text !== 'Ictal')      delete items.loadictal;
        if (node.text !== 'MRI')        delete items.loadmri;

        if (node.text !== 'Interictal'  &&
            node.text !== 'Ictal'       &&
            node.text !== 'Tmap Image'  &&
            node.text !== 'MRI')        delete items.showimage;
        
        if (node.text !== 'ATLAS to Interictal' &&
            node.text !== 'ATLAS to Ictal'      &&
            node.text !== 'Interictal to Ictal') delete items.showregistration;

        

        return items;

    }
    // ---------------------------------------------------------------------------------------
    // Charts
    /** generate a single output table
     */
    
    generateChart(parent,data,name) {
        
        let templates=webutil.getTemplates();
        let newid=webutil.createWithTemplate(templates.bisscrolltable,$('body'));
        let stable=$('#'+newid);
        const self=this;
        
        let buttoncoords = {};
        let callback = (e) => {
            let id=e.target.id;
            if (!id) {
                id=e.target.parentElement.id;
                if (!id)
                    id=e.target.parentElement.parentElement.id;
                console.log('id=',id);
            }
            let coordinate=buttoncoords[id];
            self.VIEWERS[0].setcoordinates([coordinate[0], coordinate[1], coordinate[2]]);
        };
        
        let thead = stable.find(".bisthead");
        let tbody = stable.find(".bistbody",stable);
        
        thead.empty();
        tbody.empty();
        tbody.css({'font-size':'11px',
                   'user-select': 'none'});
        thead.css({'font-size':'12px',
                   'user-select': 'none'});
        
        
        let hd=$(`<tr>
                 <td width="5%">#</td>
                 <td width="25%">${name}-Coords</td>
                 <td width="15%">Size</td>
                 <td width="20%">ClusterP</td>
                 <td width="20%">CorrectP</td>
                 <td width="15%">MaxT</td>
                 </tr>`);
        thead.append(hd);

        for (let i=0;i<data.length;i++) {

            let index=data[i].index;
            let size=data[i].size;
            let coords=data[i].coords.join(',');
            
            let clusterP=Number.parseFloat(data[i].clusterPvalue).toFixed(4);
            let correctP=Number.parseFloat(data[i].correctPvalue).toFixed(4);
            let maxt=Number.parseFloat(data[i].maxt).toFixed(3);
            let nid=webutil.getuniqueid();
            let w=$(`<tr>
                    <td width="5%">${index}</td>
                    <td width="25%"><span id="${nid}" class="btn-link">${coords}</span></td>
                    <td width="15%">${size}</td>
                    <td width="20%">${clusterP}</td>
                    <td width="20%">${correctP}</td>
                    <td width="15%">${maxt}</td>
                    </tr>`);
            tbody.append(w);
            $('#'+nid).click(callback);
            buttoncoords[nid]=data[i].coords;
        }
        
        parent.append(stable);
    }

    generateCharts() {
        if (this.app_state.hyper === null)
            return;

        let pdiv=this.resultsToolsDiv;
        pdiv.empty();

        pdiv.append($(`<H4> Results for ${this.app_state.patient_name} : ${this.app_state.patient_number}</H4>`));

        let lst = [ 'Hyper', 'Hypo' ];
        let data = [ this.app_state.hyper, this.app_state.hypo ];

        let maxpass=1;
        for (let pass=0;pass<=maxpass;pass++) {
            this.generateChart(pdiv,data[pass],lst[pass]);
        }
    }


    saveResults(fobj) {


        let lst = [ 'Hyper', 'Hypo' ];
        let datalist = [ this.app_state.hyper, this.app_state.hypo ];
        
        let str=`Name, ${this.app_state.patient_name}, Number, ${this.app_state.patient_number}\n`;
        str+='Mode,Index,I,J,K,Size,clusterP,correctedP,maxT-score\n';

        for (let pass=0;pass<datalist.length;pass++) {
            let data=datalist[pass];
            let name=lst[pass];
            
            for (let i=0;i<data.length;i++) {

                let index=data[i].index;
                let size=data[i].size;
                let coords=data[i].coords;
                
                let clusterP=Number.parseFloat(data[i].clusterPvalue).toFixed(8);
                let correctP=Number.parseFloat(data[i].correctPvalue).toFixed(8);
                let maxt=Number.parseFloat(data[i].maxt).toFixed(3);

                str+=`${name},${index},${coords[0]},${coords[1]},${coords[2]}`;
                str+=`${size},${clusterP},${correctP},${maxt}\n`;
            }

        }

        let fn=this.getApplicationStateFilename(false,'csv');
        fobj=genericio.getFixedSaveFileName(fobj,fn);
        
        return new Promise(function (resolve, reject) {
            genericio.write(fobj, str).then((f) => {
                webutil.createAlert('Results saved in '+f);
            }).catch((e) => {
                webutil.createAlert('Failed to save results '+e,true);
                reject(e);
            });
        });
    }


    // --------------------------------------------------------------------------------
    // Compute Registrations
    //
    computeLinearRegistration(reference, target,mode='Rigid') {

        let lin_opts = {
            "intscale": 1,
            "numbins": 64,
            "levels": 3,
            "imagesmoothing": 1,
            "optimization": "ConjugateGradient",
            "stepsize": 1,
            "metric": "NMI",
            "steps": 1,
            "iterations": 10,
            "mode": mode,
            "resolution": 1.5,
            "doreslice": true,
            "norm": true,
            "debug": false
        };
        let input = {'reference': reference,
                     'target'   : target}; 
        let linear = new LinearRegistration();
        let output = {
            transformation: null,
            reslice: null
        };
        
        return new Promise( (resolve,reject) => {
            linear.execute(input, lin_opts).then( () => {
                output.transformation = linear.getOutputObject('output'); 
                output.reslice = linear.getOutputObject('resliced');
                if (baseutils.getLinearMode(lin_opts["mode"])) {
                    resolve(output);
                }
                resolve();
            }).catch( (e) => {
                console.log('This did not run');
                console.log('error',e,e.stack);
                reject(e);
            });
        });
    }

    /* 
     * computes a nonlinear registration 
     * @param {BISImage} reference- the reference image
     * @param {BISImage} target - the target image
     * @returns {BISTransformation} - the output of the registration
     */
    
    computeNonlinearRegistration(reference, target) {
        
        let nonlinearRegModule = new NonlinearRegistration();   
        let input = { 'reference': reference,
                      'target'   : target};
        
        let nonlin_opts = 
            {
                "intscale": 1,
                "numbins": 64,
                "levels": 3,
                "imagesmoothing": 1,
                "optimization": "ConjugateGradient",
                "stepsize": 1,
                "metric": "NMI",
                "steps": 1,
                "iterations": 10,
                "cps": 20,
                "append": true,
                "linearmode": "Affine",
                "resolution": 1.5,
                "lambda": 0.001,
                "cpsrate": 2,
                "doreslice": true,
                "norm": true,
                "debug": true
            };
        let output = { 
            transformation: null,
            reslice: null
        };
        
        return new Promise((resolve, reject) => {
            nonlinearRegModule.execute(input, nonlin_opts).then(() => {
                output.transformation = nonlinearRegModule.getOutputObject('output');
                output.reslice = nonlinearRegModule.getOutputObject('resliced');
                resolve(output);
            }).catch( (e) =>  {
                console.log("ERROR:", e, e.stack);
                reject(e);
            });
            
        });
    }
    
    // --------------------------------------------------------------------------------
    // Custom Registration Methods
    // --------------------------------------------------------------------------------
    registerImages(mode) {

        let speclist = {
            'interictal2ictal' : {
                'reference' :  'interictal',
                'target'    :  'ictal',
                'xform'     :  'intertoictal_xform',
                'output'    :  'intertoictal_reslice',
                'nonlinear' : false,
            },
            'atlas2mri' : {
                'reference' : 'ATLAS_spect',
                'target'    : 'mri',
                'xform'     : 'atlastomri_xform',
                'output'    : 'atlastomri_reslice',
                'nonlinear' : true,
            },
            'mri2interictal' : {
                'reference' : 'mri',
                'target'    : 'interictal',
                'output'    : 'mritointerictal_reslice',
                'xform'     : 'mritointerictal_xform',
                'nonlinear' : false
            },
            'atlas2interictal' : {
                'reference' : 'ATLAS_spect',
                'target'    : 'interictal',
                'output'    : 'atlastointer_reslice',
                'xform'     : 'atlastointer_xform',
                'nonlinear' : true,
            },
        };

        mode=mode || 'inter2ictal';
        let params=speclist[mode];
        let nonlinear = params['nonlinear'];
        let text="nonlinear";
        let linearmode='Rigid';
        if (nonlinear)
            linearmode='Affine';
        if (!this.app_state.nonlinear) {
            nonlinear=false;
        }
        if (nonlinear===false)
            text=linearmode.toLowerCase()+" linear";
        

        let reference=this.app_state[params['reference']];
        let target=this.app_state[params['target']];

        if (reference === null || target === null) {
            webutil.createAlert('No images in memore (either '+params['reference']+' or '+params['target']+'). Can not execute registration');
            return Promise.reject('no images');
        }

        
        webutil.createAlert('Computing '+mode+' registration, using '+text+' registration',"progress",30);
        
        return new Promise( (resolve,reject) => {

            setTimeout( () => {
                if (nonlinear) {
                    this.computeNonlinearRegistration(reference,target).then( (output) => {
                        this.app_state[params['xform']] = output.transformation;
                        this.app_state[params['output']]= output.reslice;
                        resolve('Done Nonlinear');
                        webutil.createAlert('Done computing nonlinear registration for '+mode);
                    }).catch( ()=> { reject('Not computed linear'); });
                } else {
                    this.computeLinearRegistration(reference,target,linearmode).then( (output) => {
                        this.app_state[params['xform']] = output.transformation;
                        this.app_state[params['output']]= output.reslice;
                        webutil.createAlert('Done computing linear registration for '+mode);
                        resolve('Done Linear');

                    }).catch( ()=> { reject('Not computed linear'); });
                }
            },100);
        });
    }

    
    // --------------------------------------------------------------------------------
    // Reslice Images
    //

    resliceImages(operation,force=true) {

        let resliceList = {};

        if (!this.app_state.does_have_mri) {
            resliceList['ictal2Atlas']= {
                'input'    : 'ictal',
                'xforms'   : [ 'atlastointer_xform', 'intertoictal_xform' ],
                'reference': 'ATLAS_spect',
                'output' : 'atlastoictal_reslice',
            };
            resliceList['inter2Atlas']= {
                'input'    : 'interictal',
                'xforms'   : [ 'atlastointer_xform' ],
                'reference': 'ATLAS_spect',
                'output' : 'atlastointer_reslice',
            };
        } else {
            resliceList['ictal2Atlas']=  {
                'input' : 'ictal',
                'xforms' : [ 'atlastomri_xform', 'mritointer_xform', 'intertoictal_xform' ],
                'reference': 'ATLAS_spect',
                'output' : 'atlastoictal_reslice'
            };
            resliceList['inter2Atlas']= {
                'input' : 'interictal',
                'xforms' : [ 'atlastomri_xform', 'mritointer_xform' ],
                'reference': 'ATLAS_spect',
                'output' : 'atlastointer_reslice',
            };
        }

        resliceList['inter2ictal']= {
            'reference' : 'interictal',
            'input' : 'ictal',
            'xforms' : [ 'intertoictal_xform' ],
            'output' : 'intertoictal_reslice',
        };
        
        operation =operation || 'ictal2Atlas';

        let inputKey=resliceList[operation]['input'];
        let refKey=resliceList[operation]['reference'];
        let outputKey=resliceList[operation]['output'];

        if (this.app_state[outputKey] && force===false) {
            return Promise.resolve('Reliced image in '+operation+' exists');
        }

        if (!this.app_state[inputKey] ||  !this.app_state[refKey]) {
            return Promise.reject(`Missing images in reslice ${operation}. ${inputKey}=${this.app_state[inputKey]} ${refKey}=${this.app_state[refKey]}`);
        }
        
        let xformnames= ['xform','xform2', 'xform3' ];
        let xformlist =[];
        let xformKeys=resliceList[operation]['xforms'];
        for (let i=0;i<xformKeys.length;i++) {
            let xform=this.app_state[xformKeys[i]];
            if (!xform) 
                return Promise.reject('Missing Transformation '+xformKeys[i]+' in reslice '+operation);
            xformlist.push(xform);
        }

        return new Promise( (resolve,reject) => {

            let inpObjects = {
                'input'    : this.app_state[inputKey],
                'reference': this.app_state[refKey]
            };
            for (let i=0;i<xformlist.length;i++) {
                inpObjects[xformnames[i]]=xformlist[i];
            }
                
            let reslicer = new ResliceImage();
            reslicer.execute(inpObjects).then( () => {
                this.app_state[outputKey] = reslicer.getOutputObject('output');
                resolve();
            }).catch( (e) => {
                console.log(e,e.stack);
                reject(e);
            });
        });
    }
    
    // calls all of the above custom registration methods in correct order and reslices images as necessary
    computeAllRegistrations() {

        const self=this;
        // execute registration order if MRI is not uploaded by user
        let prom=null;
        if (!this.app_state.does_have_mri) {
            prom =new Promise( (resolve,reject) => {
                this.registerImages('atlas2interictal').then( () => {

                    this.registerImages('interictal2ictal').then( ()=> {
                        webutil.createAlert('Done computing registrations in no_mri mode');
                        resolve();
                    });
                }).catch( (e) => { reject(e,e.stack);});
            });
        } else {
            prom=new Promise( (resolve,reject) => {
                this.registerImages('atlas2mri').then( () => {
                    this.registerImages('mri2interictal').then( () => {
                        this.registerImages('interictal2ictal').then( () => {
                            webutil.createAlert('Done computing registrations in with_mri mode');
                            resolve();
                        });
                    });
                }).catch( (e) => { reject(e,e.stack);});
            });
        }
        
        prom.then( ()=> {
            self.resliceImages('ictal2Atlas').then( () => {
                self.showAtlasToIctalRegistration();
                self.dataPanel.show();
            }).catch( (e) => { console.log(e,e.stack); });
        });
    }

    // ---------------------------------------------------------------------------------------
    // Show Transformations and Images

    setViewerOpacity(opa=0.5) {
        let cmapcontrol=this.VIEWERS[0].getColormapController();
        let elem=cmapcontrol.getElementState();
        elem.opacity=opa;
        cmapcontrol.setElementState(elem);
        cmapcontrol.updateTransferFunctions(true);
    }
    
    showAtlasToInterictalRegistration() {
        this.resliceImages('inter2Atlas',false).then( () => {
            webutil.createAlert('Displaying resliced interictal image over atlas SPECT image');
            this.VIEWERS[0].setimage(this.app_state.ATLAS_spect);
            this.VIEWERS[0].setobjectmap(this.app_state.atlastointer_reslice,false,'overlay');
            this.setViewerOpacity(0.5);
        }).catch( (e) => { errormessage(e); });
                           
    }


    showAtlasToIctalRegistration() {
        this.resliceImages('ictal2Atlas',false).then( () => {
            webutil.createAlert('Displaying resliced ictal image over atlas SPECT image');
            this.VIEWERS[0].setimage(this.app_state.ATLAS_spect);
            this.VIEWERS[0].setobjectmap(this.app_state.atlastoictal_reslice,false,'overlay');
            this.setViewerOpacity(0.5);
        }).catch( (e) => { errormessage(e); });
    }

    showInterictalToIctalRegistration() {
        this.resliceImages('inter2ictal',false).then( () => {
            webutil.createAlert('Displaying resliced ictal image over interictal image');
            this.VIEWERS[0].setimage(this.app_state.interictal);
            this.VIEWERS[0].setobjectmap(this.app_state.intertoictal_reslice,false,'overlay');
            this.setViewerOpacity(0.5);
        }).catch( (e) => { errormessage(e); });
    }

    showTmapImage() {
        if (this.app_state.tmap) {
            webutil.createAlert('Displaying diff-spect TMAP over atlas MRI image');
            this.VIEWERS[0].setimage(this.app_state.ATLAS_mri);
            this.VIEWERS[0].setobjectmap(this.app_state.tmap, false, "Overlay");
            let cmapcontrol=this.VIEWERS[0].getColormapController();
            let elem=cmapcontrol.getElementState();
            elem.minth=1.0;
            cmapcontrol.setElementState(elem);
            cmapcontrol.updateTransferFunctions(true);
        } else {
            errormessage('No tmap in memory');
        }
    }

    // ---------------------------------------------------------------------------------------
    // SPECT Processing
    /*
     * processes spect images (diff spect)
     * @param {BISImage} interictal - the registered and resliced interictal image
     * @param {BISImage} ictal - the registered and and resliced ictal image
     * @param {BISImage} stdev - the standard deviation image across 12 patients
     * @param {BISImage} stdev - the masking image
     * @param {float} pvalue - p-value
     * @param {float} clustersize - cluster size
     * @returns {object} - the output object
     * @returns {string} obj.hyper - the hyper cluster statistics
     * @returns {string} obj.hypo - the hypo cluster statistics
     * @returns {BISImage} obj.tmap - the tmap image
     */
    processSpect(interictal, ictal, stdev, mask, pvalue, clustersize) {

        let params = {
            pvalue: pvalue || 0.01,
            clustersize: clustersize || 125,
        };
        
        let sigma = 16 * 0.4248, d = {};
        let final = [0, 0];

        let names = ['interictal', 'ictal'];
        let images = [interictal, ictal, stdev, mask];
        
        //  code to verify images all have same size. .getDimensions on each image
        let showerror = false;

        let dim0 = images[0].getDimensions();
        
        // check that dimensions match
        for (let m = 1; m < images.length; m++) {
            let dim1 = images[m].getDimensions();
            let q = Math.abs(dim0[0] - dim1[0]) + Math.abs(dim0[1] - dim1[1]) + Math.abs(dim0[2] - dim1[2]);
            
            if (q > 0) {
                console.log('Image ' + m + ' is different ' + dim0 + ' , ' + dim1);
                showerror = true;
            }
        }
        if (showerror)
            errormessage('Images Not Of Same Size!');
        // end code to verify that all images have same size.
        
        
        
        // execute Diff SPECT algorithm
        for (let i = 0; i <= 1; i++) {
            let masked = bisimagealgo.multiplyImages(images[i], images[3]);
            let smoothed = bisimagesmoothreslice.smoothImage(masked, [sigma, sigma, sigma], true, 6.0, d);
            let normalized = bisimagealgo.spectNormalize(smoothed);
            console.log('+++++ normalized ' + names[i]);
            final[i] = normalized;
        }
        
        // display results
        let tmapimage = bisimagealgo.spectTmap(final[1], final[0], images[2], null);
        let outspect = [0, 0];
        
        // format results
        for (let i = 0; i <= 1; i++) {
            outspect[i] = bisimagealgo.processDiffSPECTImageTmap(tmapimage, params.pvalue, params.clustersize, (i === 0));
        }
        
        return {
            tmap: tmapimage, // image
            hyper: outspect[0].stats, // strings
            hypo: outspect[1].stats, // strings
        };
    }

    // ---------------------------------------------------------------------------------------
    // processes registered SPECT images and generates hyperperfusion and hypoperfusion stats
    computeSpectNoMRI() {

        let resliced_inter = this.app_state.atlastointer_reslice;
        let resliced_ictal = this.app_state.atlastoictal_reslice;
        
        var results = this.processSpect(resliced_inter, resliced_ictal, this.app_state.ATLAS_stdspect, this.app_state.ATLAS_mask);
        this.app_state.hyper = results.hyper;
        this.app_state.hypo = results.hypo;
        this.app_state.tmap = results.tmap;
    }
    
    
    // button callback for computing diff spect data
    computeSpect() {
        
        this.resliceImages('ictal2Atlas').then( () => {
            this.resliceImages('inter2Atlas').then( () => {
                webutil.createAlert('Computing diff SPECT analysis',"progress",30);
                setTimeout( () => {
                    this.computeSpectNoMRI();
                    this.showTmapImage();
                    this.generateCharts();
                    this.resultsPanel.show();
                },100);
            });
        }).catch( (e) => {
            errormessage(e);
        });
    }

    // ---------------------------------------------------------------------------------------
    // Extra Menu with 

    createExtraMenu(menubar) {
        const self=this;
        
        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let layoutcontroller = document.querySelector(layoutid);

        this.dataPanel=new BisWebPanel(layoutcontroller,
                                   {  name  : 'Diff-Spect DataTree',
                                      permanent : false,
                                      width : '300',
                                      dual : false,
                                   });
        this.spectToolsDiv = this.dataPanel.getWidget();


        this.resultsPanel=new BisWebPanel(layoutcontroller,
                                          {  name  : 'Diff-Spect Results',
                                             permanent : false,
                                             width : '300',
                                             dual : true,
                                             mode : 'sidebar'
                                          });
        this.resultsToolsDiv = this.resultsPanel.getWidget();
        this.resultsToolsDiv.append($('<div> No results yet.</div>'));
        
        // stamp template
        this.tree_div=$(tree_template_string);
        
        this.spectToolsDiv.append(this.tree_div);

        //        this.dataPanel.show();
        //      this.resultsPanel.hide();
        
        
        this.initializeTree();     
        
        
        let sMenu = webutil.createTopMenuBarMenu("diff-SPECT", menubar);
        
        webutil.createMenuItem(sMenu, 'Enter Patient Info',
                      () =>  {
                          self.showPatientInfoModal();
                      });

        webutil.createMenuItem(sMenu, 'Load Patient Ictal Image', () =>  {
            self.loadImage('ictal'); 
        }); 
        webutil.createMenuItem(sMenu, 'Load Patient Inter-Ictal Image', () =>  {
            self.loadImage('interictal'); 
        });
        webutil.createMenuItem(sMenu, 'Load Patient MRI Image', () =>  {
            self.loadImage('mri'); 
        });
       
        webutil.createMenuItem(sMenu,'');
        
        webutil.createMenuItem(sMenu, 'Register Images using Linear Registration (fast,incaccurate)', () =>  {
            self.app_state.nonlinear = false;
            self.computeAllRegistrations();
        });

        webutil.createMenuItem(sMenu, 'Register Images With Nonlinear Registration (slow,accurate)', () =>  {
            self.app_state.nonlinear = true;
            self.computeAllRegistrations();
        });

        
        webutil.createMenuItem(sMenu,'');
        webutil.createMenuItem(sMenu, 'Compute Diff Spect MAPS', () =>  {
            self.computeSpect(); 
        });

        webutil.createMenuItem(sMenu,'');
        webutil.createMenuItem(sMenu,'Show diff SPECT Data Tree(Images)',() => {
            self.dataPanel.show();
        });
        webutil.createMenuItem(sMenu,'Show diff SPECT Text Results (Regions)',() => {
            self.resultsPanel.show();
        });

        webutil.createMenuItem(sMenu,'');

        webfileutil.createFileMenuItem(sMenu, 'Save diff SPECT Text Results',
                                       function (f) {
                                           self.saveResults(f);
                                       },
                                       {
                                           title: 'Save diff SPECT Text Results',
                                           save: true,
                                           filters : [ { name: 'CSV File', extensions: ['csv']}],
                                           suffix : "csv",
                                           initialCallback : () => {
                                               return self.getApplicationStateFilename(false,"csv");
                                           }
                                       });
        
    }

    // ---------------------------------------------------------------------------------------
    // Main Function
    //
    connectedCallback() {
        this.simpleFileMenus=true;
        super.connectedCallback();
        this.VIEWERS[0].collapseCore();
    }
}

module.exports=DiffSpectElement;
webutil.defineElement('bisweb-diffspectelement', DiffSpectElement);

