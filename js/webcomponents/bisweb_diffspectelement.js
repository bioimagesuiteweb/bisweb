/*global window,document,HTMLElement */

"use strict";

// imported modules from open source and bisweb repo
const bisimagesmoothreslice = require('bis_imagesmoothreslice');
const bistransformations = require('bis_transformationutil');
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

        
        
        // boolean values 
        this.state_machine = {
            images_processed: false,
            images_registered: false,
            mri_loaded: false,
            ictal_loaded: false,
            interictal_loaded: false
        };

        this.elements = {
            continuePatientFile: null,
        };
        this.dataPanel=null;
        this.resultsPanel=null;

        this.fields= [ '#','I','J','K','size','maxT','clusterP','actualP' ];
        
        this.app_state = {
            sm_carousel: null,
            viewer: null,
            patient_name: "No Name",
            patient_number: "0",
            does_have_mri: false,
            ictal: null,
            interictal: null,
            mri: null,
            ATLAS_spect: null,
            ATLAS_mri: null,
            ATLAS_stdspect: null,
            ATLAS_mask: null,
            tmap: null,
            nonlinear: false,
            
            intertoictal_xform: null,
            intertoictal_reslice: null,
            
            atlastointer_xform: null,
            atlastointer_reslice: null,
            
            atlastoictal_xform: null,
            atlastoictal_reslice: null,
            
            atlastomri_xform: null,
            atlastomri_reslice: null,
            
            mritointer_xform: null,
            mritointer_reslice: null,
            
            hyper: null,
            hypo : null
        };
    }

    // ------------------------------------
    // Element State
    // ------------------------------------
    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {

        let obj=super.getElementState(storeImages);

        if (storeImages) {
            let strIctal = "", strInterictal = "", strTmap = "";
            let strReg_AT_IN = "", strReg_IN_IC = "", strReg_AT_IC = "";
            
            //serializing transformations
            
            if (null !== this.app_state.atlastointer_xform)
                strReg_AT_IN = this.app_state.atlastointer_xform.serializeToJSON();
            
            if (null !== this.app_state.intertoictal_xform)
                strReg_IN_IC = this.app_state.intertoictal_xform.serializeToJSON();
            
            if (null !== this.app_state.atlastoictal_xform)
                strReg_AT_IC = this.app_state.atlastoictal_xform.serializeToJSON();
            
            
            
            //serializing images 
            
            if (null !== this.app_state.interictal)
                strInterictal = this.app_state.interictal.serializeToJSON();
            
            
            if (null !== this.app_state.ictal)
                strIctal = this.app_state.ictal.serializeToJSON();
            
            if (null !== this.app_state.tmap)
                strTmap = this.app_state.tmap.serializeToJSON();
            
            // json objewct to save
            obj.spect = {
                name: this.app_state.patient_name,
                number: this.app_state.patient_number,
                inter: strInterictal,
                ictal: strIctal,
                tmap: strTmap,
                atlastointer: strReg_AT_IN,
                intertoictal: strReg_IN_IC,
                atlastoictal: strReg_AT_IC,
                hyper: this.app_state.hyper,
                hypo: this.app_state.hypo
            };
        } else {
            obj.spect = {
                name: this.app_state.patient_name,
                number: this.app_state.patient_number,
                inter: "",
                ictal: "",
                tmap: "",
                atlastointer: "",
                intertoictal: "",
                atlastoictal: "",
                hyper: "",
                hypo: ""
            };
        }
        return obj;
    }
    
    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null,name="") {

        if (dt===null)
            return;

        this.fillFields(dt.spect);
        super.setElementState(dt,name);
    }


    // parse fill variable values from file
    fillFields(b) { // url as argument somehow

        let input = b || {};
        let interictal = null, ictal = null, tmap = null, hyper = null,hypo=null;
        let intertoictal = null, atlastointer = null, atlastoictal = null;

        if (input.inter !== "") {
            interictal = new BisWebImage();
            interictal.parseFromJSON(input.inter);
            this.state_machine.interictal_loaded = true;
        }

        if (input.ictal !== "") {
            ictal = new BisWebImage();
            ictal.parseFromJSON(input.ictal);
            this.state_machine.ictal_loaded = true;
        }

        if (input.tmap !== "") {
            tmap = new BisWebImage();
            tmap.parseFromJSON(input.tmap);
            this.state_machine.images_processed = true;
        }

        if (input.intertoictal !== "") {
            intertoictal = bistransformations.createLinearTransformation();
            intertoictal.parseFromJSON(input.intertoictal);
        }

        if (input.atlastointer !== "") {
            atlastointer = bistransformations.createLinearTransformation();
            atlastointer.parseFromJSON(input.atlastointer);
        }

        if (input.atlastoictal !== "") {
            atlastoictal = bistransformations.createLinearTransformation();
            atlastoictal.parseFromJSON(input.atlastoictal);
        }

        if (null !== intertoictal &&
            null !== atlastointer &&
            null !== atlastoictal)
            this.state_machine.images_registered = true;

        if (null !== input.hyper)
            hyper = input.hyper;

        if (null !== input.hypo)
            hypo = input.hypo;

        this.app_state.patient_name = input.name;
        this.app_state.patient_number = input.number;
        this.app_state.interictal = interictal;
        this.app_state.ictal = ictal;
        this.app_state.tmap = tmap;
        this.app_state.intertoictal_xform = intertoictal;
        this.app_state.atlastointer_xform = atlastointer;
        this.app_state.atlastoictal_xform = atlastoictal;
        this.app_state.hyper = hyper;
        this.app_state.hypo = hypo;

        if (null !== this.app_state.tmap) {
            this.showTmapImage();            
        }

        if (null !== this.app_state.hyper) {
            this.generateCharts();
            this.resultsPanel.show();
        }


        $('#sm_patientName').val(input.name);
        $('#sm_patientNumber').val(input.number);

        
        
    }

    // --------------------------------------------------------------------------------
    // Load Atlas Images
    // --------------------------------------------------------------------------------

    loadAtlas() {

        let loadimagearray=function(imgnames, alldone) {
                
            let numimages = imgnames.length;
            let images = new Array(numimages);
            
            for (let i = 0; i < numimages; i++)
                images[i] = new BisWebImage();
            
            let p = [];
            for (let i = 0; i < numimages; i++)
                p.push(images[i].load(imgnames[i]));
            Promise.all(p)
                .then( () => { alldone(images); })
                .catch((e) => { errormessage(e); });
        };

        let alldone = ((images) => {            
            this.app_state.ATLAS_spect = images[0];
            this.app_state.ATLAS_mri = images[1];
            this.app_state.ATLAS_stdspect = images[2];
            this.app_state.ATLAS_mask = images[3];
            this.app_state.viewer.setimage(this.app_state.ATLAS_mri);
            console.log('.... ATLAS images loaded');
            webutil.createAlert('The SPECT Tool is now ready. The core data has been loaded.');//<BR> Click either "Create New Patient" or "Load Existing Patient" to begin.');
        });
        
        let imagepath=webutil.getWebPageImagePath();
        
        loadimagearray([`${imagepath}/ISAS_SPECT_Template.nii.gz`,
                        `${imagepath}/MNI_T1_2mm_stripped_ras.nii.gz`,
                        `${imagepath}/ISASHN_Standard_Deviation.nii.gz`,
                        `${imagepath}/ISAS_SPECT_Mask.nii.gz`
                       ], alldone);
    }

    // --------------------------------------------------------------------------------
    // GUI Callbacks
    // -------------------------------------------------------------------------------
    createNewPatient(patientname, patientnumber) {
        if ('' === patientname ||
            '' === patientnumber ||
            null === patientname ||
            null === patientnumber) {
            errormessage('please enter a name and ID number for the new patient');
            return false;
        }

        this.app_state.patient_name = patientname;
        this.app_state.patient_number = patientnumber;
        return true;

    }

    // --------------------------------------------------------------------------------
    // Create the SPECT Tool GUI
    // --------------------------------------------------------------------------------

    initializeTree() {

        let treeOptionsCallback=this.treeCallback.bind(this);
        
        const self = this;
        self.loadAtlas();
        
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
        let handleGenericFileSelect = (imgfile, imgname, show, comment, nextfn)=> {
            
            let newimage = new BisWebImage();
            newimage.load(imgfile, false).then( () =>  { 
                console.log('Image read :' + newimage.getDescription(''));
                
                self.app_state[imgname] = newimage;
                if (show) {
                    console.log('loaded ' + imgname + '--> (' + comment + ') ' + self.app_state[imgname].getDescription());
                    nextfn();
                }
            });
        };
        
        
        let interictalLoaded = (() => {
            self.app_state.viewer.setimage(self.app_state.interictal);
            console.log(self.app_state.interictal);
        });

        let handleInterictalFileSelect = () => {

            webfileutil.genericFileCallback(
                { 
                    "title"  : `Load interictal image`,
                    "suffix" : "NII" 
                },
                (fname) => {
                    console.log('Custom method reached');
                    handleGenericFileSelect(fname,
                                            'interictal',
                                            true, // Whether to show to viewer
                                            'Inter-Ictal', // Name
                                            interictalLoaded); // fn to call when successful
                }
            );
        };

        let ictalLoaded = (() => {
            self.app_state.viewer.setimage(self.app_state.ictal);
        });

        let handleIctalFileSelect = (() => {
            webfileutil.genericFileCallback(
                { 
                    "title"  : `Load Ictal image`,
                    "suffix" : "NII" 
                },
                (fname) => {
                    handleGenericFileSelect(fname,
                                            'ictal',
                                            true, // Whether to show to viewer
                                            'Ictal', // Name
                                            ictalLoaded); // fn to call when successful
                } 
            );
        });

        let mriLoaded = (() => {
            self.app_state.viewer.setimage(self.app_state.mri);
        });

        let handleMRIFileSelect = (() => {
            webfileutil.genericFileCallback(
                { 
                    "title"  : `Load MR image`,
                    "suffix" : "NII" 
                },
                (fname) => {
                    handleGenericFileSelect(fname,
                                            'mri',
                                            true, // Whether to show to viewer
                                            'Ictal', // Name
                                            mriLoaded); // fn to call when successful
                }
            );
        });

        let items = {
            loadinter: {
                'label': 'Load Interictal',
                'action': () => {
                    handleInterictalFileSelect();
                },
                
            },
            
            loadictal: {
                'label': 'Load Ictal',
                'action': () => {
                    handleIctalFileSelect();
                }
            },
            
            loadmri: {
                'label': 'Load MRI',
                'action': () =>  {
                    handleMRIFileSelect();
                }
            },

            showimage: {
                'label': 'Show Image',
                'action': () => {

                    if (node.text === "Interictal") {
                        if (self.app_state.interictal !== null)
                            self.app_state.viewer.setimage(self.app_state.interictal);
                        else 
                            bootbox.alert('NO INTERICTAL IMAGE LOADED');
                    }

                    if (node.text === "Ictal") {
                        if (self.app_state.ictal !== null)
                            self.app_state.viewer.setimage(self.app_state.ictal);
                        else 
                            bootbox.alert('NO ICTAL IMAGE LOADED');
                    }

                    if (node.text === "MRI") {
                        if (self.app_state.mri !== null)
                            self.app_state.viewer.setimage(self.app_state.mri);
                        else 
                            bootbox.alert('NO MR IMAGE LOADED');
                    }

                    if (node.text === 'Tmap Image') {
                        if (self.app_state.tmap !== null) {
                            self.showTmapImage();
                        } else  {
                            bootbox.alert('NO DIFF SPECT IMAGE IN MEMORY');
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
                        self.showAtlasToIctalRegistration();
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
        
        let buttoncoords = {};
        let callback = (e) => {
            let id=e.target.id;
            if (!id)
                id=e.target.parentElement.id;
            let coordinate=buttoncoords[id];
            this.app_state.viewer.setcoordinates([coordinate[0], coordinate[1], coordinate[2]]);
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
            
            let clusterP=Number.parseFloat(data[i].clusterPvalue).toExponential(3);
            let correctP=Number.parseFloat(data[i].correctPvalue).toExponential(3);
            let maxt=Number.parseFloat(data[i].maxt).toFixed(2);
            let nid=webutil.getuniqueid();
            let w=$(`<tr id="${nid}">
                    <td width="5%">${index}</td>
                    <td width="25%">${coords}</td>
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

        let lst = [ 'Hyper', 'Hypo' ];
        let data = [ this.app_state.hyper, this.app_state.hypo ];

        let maxpass=1;
        for (let pass=0;pass<=maxpass;pass++) {
            this.generateChart(pdiv,data[pass],lst[pass]);
        }
    }


    // --------------------------------------------------------------------------------
    // Compute Registrations
    //
    computeLinearRegistration(reference, target) {

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
            "mode": "Rigid",
            "resolution": 1.5,
            "doreslice": true,
            "norm": true,
            "debug": false
        };
        let input = {'reference': reference,
                     'target'   : target}; 
        var linear = new LinearRegistration();
        let output = {
            transformation: null,
            reslice: null
        };
        
        return new Promise( (resolve,reject) => {
            linear.execute(input, lin_opts).then( () => {
                output.transformation = linear.getOutputObject('output'); 
                output.reslice = linear.getOutputObject('resliced');
                if (baseutils.getLinearMode(lin_opts["mode"])) {
                    console.log(output);
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
                "iterations": 1,
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
                'output'    : 'atlastomri_reslice',
                'xform'     : 'atlastomri_xform',
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
        if (!this.app_state.nonlinear) {
            nonlinear=false;
        }

        let reference=this.app_state[params['reference']];
        let target=this.app_state[params['target']];
        if (reference === null || target === null) {
            errormessage('Bad '+params['reference']+' or '+params[target]+' images. Can not execute registration');
            return Promise.reject('no images');
        }

        return new Promise( (resolve,reject) => {
            if (nonlinear) {
                this.computeNonlinearRegistration(reference,target).then( (output) => {
                    this.app_state[params['xform']] = output.transformation;
                    this.app_state[params['output']]= output.reslice;
                    resolve('Done Nonlinear');
                }).catch( ()=> { reject('Not computed linear'); });
            } else {
                this.computeLinearRegistration(reference,target).then( (output) => {
                    this.app_state[params['xform']] = output.transformation;
                    this.app_state[params['output']]= output.reslice;
                    resolve('Done Linear');
                }).catch( ()=> { reject('Not computed linear'); });
            }
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
                'input'    : 'inter',
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

        console.log(" ...............................\n .............\n.............\n reslicing images ");

        if (!this.app_state[inputKey] ||  !this.app_state[refKey]) {
            return Promise.reject('Missing images in reslice '+operation);
        }
        
        let xformnames= ['xform','xform2', 'xform3' ];
        let xformlist ={ };
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
    computeRegistrationOfImages() {
        
        // execute registration order if MRI is not uploaded by user
        let plist=[];
        if (!this.app_state.does_have_mri) {
            plist= [ this.registerImages('atlas2interictal'),
                     this.registerImages('interictal2ictal')
                   ];
        } else {
            plist=[ this.registerImages('atlas2mri'),
                    this.registerImages('mri2interictal'),
                    this.registerImages('interictal2ictal')
                  ];
        }
        
        // executes all promises in order
        Promise.all(plist).then( () => {
            this.resliceImages('ictal2Atlas').then( () => {
                this.dataPanel.show();
            });
        });
    }

    // ---------------------------------------------------------------------------------------
    // Show Transformations and Images
    
    showAtlasToInterictalRegistration() {
        this.resliceImages('inter2Atlas',false).then( () => {
            this.app_state.viewer.setimage(this.app_state.ATLAS_spect);
            this.app_state.viewer.setobjectmap(this.app_state.atlastointer_reslice,false,'overlay');
        }).catch( (e) => { errormessage(e); });
                           
    }

    showInterictalToIctalRegistration() {
        this.resliceImages('inter2ictal',false).then( () => {
            this.app_state.viewer.setimage(this.app_state.interictal);
            this.app_state.viewer.setobjectmap(this.app_state.intertoictal_reslice,false,'overlay');
        }).catch( (e) => { errormessage(e); });
    }

    showAtlasToIctalRegistration() {
        this.resliceImages('ictal2atlas',false).then( () => {
            this.app_state.viewer.setimage(this.app_state.ATLAS_spect);
            this.app_state.viewer.setobjectmap(this.app_state.atlastoictal_reslice,false,'overlay');
        }).catch( (e) => { errormessage(e); });
    }

    showTmapImage() {
        if (this.app_state.tmap) {
            this.app_state.viewer.setimage(this.app_state.ATLAS_mri);
            this.app_state.viewer.setobjectmap(this.app_state.tmap, false, "Overlay");
            let cmapcontrol=this.app_state.viewer.getColormapController();
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
            pvalue: pvalue || 0.05,
            clustersize: clustersize || 100,
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
            var dim1 = images[m].getDimensions();
            var q = Math.abs(dim0[0] - dim1[0]) + Math.abs(dim0[1] - dim1[1]) + Math.abs(dim0[2] - dim1[2]);
            
            if (q > 0) {
                console.log('Image ' + m + ' is different ' + dim0 + ' , ' + dim1);
                showerror = true;
            }
        }
        if (showerror)
            errormessage('Images Not Of Same Size!');
        // end code to verify that all images have same size.
        
        
        
        // execute Diff SPECT algorithm
        for (var i = 0; i <= 1; i++) {
            var masked = bisimagealgo.multiplyImages(images[i], images[3]);
            var smoothed = bisimagesmoothreslice.smoothImage(masked, [sigma, sigma, sigma], true, 6.0, d);
            var normalized = bisimagealgo.spectNormalize(smoothed);
            console.log('+++++ normalized ' + names[i]);
            final[i] = normalized;
        }
        
        // display results
        var tmapimage = bisimagealgo.spectTmap(final[0], final[1], images[2], null);
        var outspect = [0, 0];
        var sname = ['hyper', 'hypo'];
        
        // format results
        for (i = 0; i <= 1; i++) {
            outspect[i] = bisimagealgo.processDiffSPECTImageTmap(tmapimage, params.pvalue, params.clustersize, (i === 0));
            var stats = outspect[i].stats;
            var str = '#' + sname[i] + ' cluster statistics\n';
            str += '#\tx\ty\tz\tsize\tmaxt\tclusterP\tcorrectP\n';
            for (var j = 0; j < stats.length; j++) {
                str += stats[j].string + '\n';
            }
            console.log(str);
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
        console.log("compute spect no MRI");
        var resliced_inter = this.app_state.atlastointer_reslice;
        var resliced_ictal = this.app_state.atlastoictal_reslice;
        
        var results = this.processSpect(resliced_inter, resliced_ictal, this.app_state.ATLAS_stdspect, this.app_state.ATLAS_mask);
        this.app_state.hyper = results.hyper;
        this.app_state.hypo = results.hypo;
        this.app_state.tmap = results.tmap;
        
        console.log(JSON.stringify(results.hyper,null,2));
        console.log(JSON.stringify(results.hypo,null,2));
    }
    
    
    // button callback for computing diff spect data
    computeSpect() {
        console.log("compute spect callback");
        Promise.all( [ this.resliceImages('ictal2Atlas'),
                       this.resliceImages('inter2Atlas'),
                     ]).then( () => {
                         this.computeSpectNoMRI();
                         this.showTmapImage();
                         this.generateCharts();
                         this.resultsPanel.show();
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
                                      permanent : true,
                                      width : '300',
                                      //                                      dual : false,
                                      //                                    mode : 'sidebar'
                                   });
        this.spectToolsDiv = this.dataPanel.getWidget();


        this.resultsPanel=new BisWebPanel(layoutcontroller,
                                          {  name  : 'Diff-Spect Results',
                                             permanent : false,
                                             width : '300',
                                             //                                      dual : false,
                                             //                                    mode : 'sidebar'
                                          });
        this.resultsToolsDiv = this.resultsPanel.getWidget();
        this.resultsToolsDiv.append($('<div> No results yet.</div>'));
        
        // stamp template
        this.tree_div=$(tree_template_string);
        
        this.spectToolsDiv.append(this.tree_div);

        this.dataPanel.show();
        //      this.resultsPanel.hide();
        
        
        this.initializeTree();     
        
        
        let sMenu = webutil.createTopMenuBarMenu("diff-SPECT", menubar);
        
            /*        webutil.createMenuItem(sMenu, 'New Patient',
                      () =>  {
                      let pn = self.spectToolsDiv.parent();
                      pn.collapse('show');
                      self.app_state.sm_carousel.carousel(0);
                      $('#newPatientButton').click();
                      });
        webutil.createMenuItem(sMenu,'');*/
        webutil.createMenuItem(sMenu,'Show diff SPECT Data Tree(Images)',() => {
            self.dataPanel.show();
        });
        webutil.createMenuItem(sMenu,'Show diff SPECT Results',() => {
            self.resultsPanel.show();
        });
        webutil.createMenuItem(sMenu,'');
        
        webutil.createMenuItem(sMenu, 'Register Images With Linear Registration', () =>  {
            if (self.app_state.interictal !== null && self.app_state.interictal !== null)
                self.computeRegistrationOfImages();
            else
                bootbox.alert('INVALID IMAGE(S)');
            
        });

        webutil.createMenuItem(sMenu, 'Register Images With Nonlinear Registration', () =>  {
            if (self.app_state.interictal !== null && self.app_state.interictal !== null) {
                self.app_state.nonlinear = true;
                self.computeRegistrationOfImages();
            }
            else
                bootbox.alert('INVALID IMAGE(S)');
            
        });

        
        webutil.createMenuItem(sMenu,'');
        webutil.createMenuItem(sMenu, 'Compute Diff Spect MAPS', () =>  {
            if (self.app_state.atlastoictal_reslice !== null &&
                self.app_state.atlastointer_reslice !== null &&
                self.app_state.intertoictal_reslice !== null)
                self.computeSpect(); 
            else
                bootbox.alert('IMAGES NOT REGISTERED/RESLICED');
        });


    }

    // ---------------------------------------------------------------------------------------
    // Main Function
    //
    connectedCallback() {
        this.simpleFileMenus=true;
        super.connectedCallback();
        this.app_state.viewer = this.VIEWERS[0];
        this.app_state.viewer.collapseCore();
    }
}

webutil.defineElement('bisweb-diffspectelement', DiffSpectElement);

    // -------
       
    
        /*    resliceImages(mode) {

        let reslicer = new ResliceImage();
        console.log(" ...............................\n .............\n.............\n reslicing images ",mode);
        
        return new Promise( (resolve,reject) => {

            if (mode===0 ) {

                if (!this.app_state.ictal || !this.app_state.atlastointer_xform ||
                    !this.app_state.intertoictal_xform || !this.app_state.ATLAS_spect) {
                    reject('Some missing data');
                }
                
                let input = {
                    'input'    : this.app_state.ictal,
                    'xform'    : this.app_state.atlastointer_xform,
                    'xform2'   : this.app_state.intertoictal_xform,
                    'reference': this.app_state.ATLAS_spect           
                };
                
                // instance of image reslicer module
                let reslicer = new ResliceImage();
                
                reslicer.execute(input).then( () => {
                    this.app_state.atlastoictal_reslice = reslicer.getOutputObject('output');
                    resolve();
                }).catch( (e) => {
                    console.log(e,e.stack);
                    reject(e);
                });
            } else if (mode===1) {

                if (!this.app_state.ictal ||
                    !this.app_state.atlastomri_xform ||
                    !this.app_state.mritointer_xform ||
                    !this.app_state.intertoictal_xform ||
                    !this.app_state.ATLAS_spect) {
                    reject('Some missing data');
                }

                
                let input = {
                    'input' : this.app_state.ictal,
                    'xform' : this.app_state.atlastomri_xform,
                    'xform2': this.app_state.mritointer_xform,
                    'xform3': this.app_state.intertoictal_xform,
                    'reference': this.app_state.ATLAS_spect
                };
                
                reslicer.execute(input).then( () => {
                    this.app_state.atlastoictal_reslice =reslicer.getOutputObject('output');
                    resolve();
                }).catch( (e) => {
                    console.log(e,e.stack);
                    reject(e);
                });
            } else if (mode==2) {

                if (!this.app_state.interictal ||
                    !this.app_state.atlastomri_xform ||
                    !this.app_state.mritointer_xform ||
                    !this.app_state.ATLAS_spect) {
                    reject('Some missing data');
                }

                
                let input = {
                    'input' : this.app_state.interictal,
                    'xform' : this.app_state.atlastomri_xform,
                    'xform2': this.app_state.mritointer_xform,
                    'reference': this.app_state.ATLAS_spect
                };
                
                reslicer.execute(input).then( () => {
                    this.app_state.atlastointer_reslice = reslicer.getOutputObject('output');
                    resolve();
                });
            } else if (mode===3) {
                let input = {
                    'reference' : this.app_state.ATLAS_spect,
                    'input' : this.app_state.interictal,
                    'xform' : this.app_state.atlastointer_xform
                };
                reslicer.execute(input).then( () => {
                    this.app_state.atlastointer_reslice = reslicer.getOutputObject('output');
                    resolve();
                });
            } else if (mode===4) {

                let input = {
                    'reference' : this.app_state.interictal,
                    'input' : this.app_state.ictal,
                    'xform' : this.app_state.intertoictal_xform
                };
                reslicer.execute(input).then( () => {
                    this.app_state.intertoictal_reslice = reslicer.getOutputObject('output');
                    resolve();
                });
            }
        });
    }
    */
