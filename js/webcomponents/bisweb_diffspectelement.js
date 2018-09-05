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



const chart_string = `
      <br>
      <br>
      <br>
      <div class="container" style="width:400px">
      <div><label id="head"></label></div>
      <div><label id="lab1"></label></div>
      <div><label id="lab2"></label></div>
      <div><label id="lab3"></label></div>
      <div><label id="lab4"></label></div>
      </div> `;

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
            
            hyper: null
        };
    }

            
    parseNewLines(str) {
            
        let lines = [];
        let prevLine = 0;
        
        for (let i=0;i<str.length;i++) {
            let currentCharacter = str.charAt(i);
            
            if (currentCharacter === '\n') {
                let newLine = str.substring(prevLine, i);
                lines.push(newLine);
                prevLine = i+1;
            }
        }
        
        return lines;
        
    }
        
    parseCoordinates(str) {
            
        let coordinate = [];
        let previousChar = 2;
        let k = 0;
        for (let i=2;i<str.length;i++) {
            let currentCharacter = str.charAt(i);
            if (currentCharacter === '\t' ) {
                coordinate.push(parseInt(str.substring(previousChar, i)));
                previousChar=i+1;
                k++;
            }
            
            if (k > 2)
                break;
        }
        
        return coordinate;
    }

    // ------------------------------------
    // Element State
    // ------------------------------------
    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {

        let obj=super.getElementState(storeImages);

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
            bisformat: "diffspect",
            name: this.app_state.patient_name,
            number: this.app_state.patient_number,
            inter: strInterictal,
            ictal: strIctal,
            tmap: strTmap,
            atlastointer: strReg_AT_IN,
            intertoictal: strReg_IN_IC,
            atlastoictal: strReg_AT_IC,
            hyper: this.app_state.hyper
        };

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

        let input = b;
        let interictal = null, ictal = null, tmap = null, hyper = null;
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

        this.app_state.patient_name = input.name;
        this.app_state.patient_number = input.number;
        this.app_state.interictal = interictal;
        this.app_state.ictal = ictal;
        this.app_state.tmap = tmap;
        this.app_state.intertoictal_xform = intertoictal;
        this.app_state.atlastointer_xform = atlastointer;
        this.app_state.atlastoictal_xform = atlastoictal;
        this.app_state.hyper = hyper;

        if (null !== this.app_state.tmap) {
            this.showTmapImage();            
        }

        if (null !== this.app_state.hyper) {
            this.generateChart();
            this.resultsPanel.show();
        }


        $('#sm_patientName').val(input.name);
        $('#sm_patientNumber').val(input.number);

    }

    // --------------------------------------------------------------------------------
    // Load lots of images
    // --------------------------------------------------------------------------------
    loadimagearray(imgnames, alldone) {

        var numimages = imgnames.length;
        var images = new Array(numimages);

        for (let i = 0; i < numimages; i++)
            images[i] = new BisWebImage();

        let p = [];
        for (let i = 0; i < numimages; i++)
            p.push(images[i].load(imgnames[i]));
        Promise.all(p)
            .then( () => { alldone(images); })
            .catch((e) => { errormessage(e); });
    }
    
    // --------------------------------------------------------------------------------


    // --------------------------------------------------------------------------------
    // Load Atlas Images
    // --------------------------------------------------------------------------------

    loadAtlas() {


        var alldone = ((images) => {

            //            console.log("~~~~~~~~~~~~~~~~~~~~~~~");
            //            for (var i =0; i < 4; i++) {
            //                console.log(images[i]);
            //}
            //console.log("~~~~~~~~~~~~~~~~~~~~~~~");

            this.app_state.ATLAS_spect = images[0];
            this.app_state.ATLAS_mri = images[1];
            this.app_state.ATLAS_stdspect = images[2];
            this.app_state.ATLAS_mask = images[3];
            this.app_state.viewer.setimage(this.app_state.ATLAS_mri);
            console.log('.... ATLAS images loaded');
            webutil.createAlert('The SPECT Tool is now ready. The core data has been loaded.');//<BR> Click either "Create New Patient" or "Load Existing Patient" to begin.');
        });

        let imagepath=webutil.getWebPageImagePath();
        
        this.loadimagearray([`${imagepath}/ISAS_SPECT_Template.nii.gz`,
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

    // TODO: add mosaic viewer
    initializeSpectTool() {

        let customOptionsFn=this.customMenuOptions.bind(this);
        
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
                'items': customOptionsFn
            }
            
        };
        tree.jstree(json_data);
        console.log(tree[0]);
    }

    customMenuOptions(node) {

        const self=this;
        let handleGenericFileSelect = (imgfile, imgname, show, comment, nextfn)=> {
            
            let newimage = new BisWebImage();
            newimage.load(imgfile, false).then( () =>  { 
                console.log('Image read :' + newimage.getDescription(''));
                console.log(self);
                console.log(self.app_state);
                
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
                    console.log('Custom method reached');
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
                    console.log('Custom method reached');
                    handleGenericFileSelect(fname,
                                            'mri',
                                            true, // Whether to show to viewer
                                            'Ictal', // Name
                                            mriLoaded); // fn to call when successful
                }
            );
        });

        console.log('Node=',node);
        let items = {
            loadinter: {
                'label': 'Load Interictal',
                'action': () => {
                    console.log('In action');
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

                    console.log('Node text=',node.text);
                    
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
                        if (self.app_state.atlastointer_reslice !== null) {
                            self.app_state.viewer.setimage(self.app_state.ATLAS_spect);
                            self.app_state.viewer.setobjectmap(self.app_state.atlastointer_reslice);
                        }
                        else
                            bootbox.alert("IMAGES NOT REGISTERED");
                    }
                    else if (node.text === "ATLAS to Ictal") {
                        if (self.app_state.atlastointer_reslice !== null) {
                            self.app_state.viewer.setimage(self.app_state.ATLAS_spect);
                            self.app_state.viewer.setobjectmap(self.app_state.atlastoictal_reslice);
                        }
                        else
                            bootbox.alert("IMAGES NOT REGISTERED");
                    }
                    else if (node.text === "Interictal to Ictal") {
                        if (self.app_state.atlastointer_reslice !== null) {
                            self.app_state.viewer.setimage(self.app_state.interictal);
                            self.app_state.viewer.setobjectmap(self.app_state.intertoictal_reslice);
                        }
                        else
                            bootbox.alert("IMAGES NOT REGISTERED");
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
    
    
    
    generateChart() {
        
        let lines = this.parseNewLines(this.app_state.hyper);
        let coordinates = [];
        
        for (let i=1;i<lines.length;i++) 
            coordinates.push(this.parseCoordinates(lines[i]));

        let one=$('#lab1'), two=$('#lab2'), three=$('#lab3'), four=$('#lab4');
        let head=$('#head');
        
        console.log(lines[0] + '\n' + lines[1] + '\n' + lines[2] + '\n' + lines[3] + '\n' + lines[4] + '\n');

        head.html('<PRE>' + lines[0] + '</PRE>');

        one.html('<PRE>' + lines[1] + '</PRE>');
        two.html('<PRE>' + lines[2] + '</PRE>');
        three.html('<PRE>' + lines[3] + '</PRE>');
        four.html('<PRE>' + lines[4] + '</PRE>');

        one.click(() =>  {
            var coordinate = coordinates[0];
            this.app_state.viewer.setcoordinates([coordinate[0], coordinate[1], coordinate[2]]);
            one.css('border', '2px solid #246BB2');
            two.css("border", "0px");
            three.css("border", "0px");
            four.css("border", "0px");
        });

        two.click(() =>  {
            var coordinate = coordinates[1];
            this.app_state.viewer.setcoordinates([coordinate[0], coordinate[1], coordinate[2]]);
            one.css("border", "0px");
            two.css("border", "2px solid #246BB2");
            three.css("border", "0px");
            four.css("border", "0px");
        });

        three.click(() =>  {
            var coordinate = coordinates[2];
            this.app_state.viewer.setcoordinates([coordinate[0], coordinate[1], coordinate[2]]);
            one.css("border", "0px");
            two.css("border", "0px");
            three.css("border", "2px solid #246BB2");
            four.css("border", "0px");
        });

        four.click(() =>  {
            var coordinate = coordinates[3];
            this.app_state.viewer.setcoordinates([coordinate[0], coordinate[1], coordinate[2]]);
            one.css("border", "0px");
            two.css("border", "0px");
            three.css("border", "0px");
            four.css("border", "2px solid #246BB2");
        });
    }

    showAtlasToInterictalRegistration() {
        
        console.log(this.app_state.ATLAS_spect);
        this.app_state.viewer.setimage(this.app_state.ATLAS_spect);
        this.app_state.viewer.setobjectmap(this.app_state.atlastointer_reslice,false,'overlay');
    }

    showInterictalToIctalRegistration() {
        this.app_state.viewer.setimage(this.app_state.interictal);
        this.app_state.viewer.setobjectmap(this.app_state.intertoictal_reslice,false,'overlay');
    }

    showAtlasToIctalRegistration() {
        this.app_state.viewer.setimage(this.app_state.ATLAS_spect);
        this.app_state.viewer.setobjectmap(this.app_state.atlastoictal_reslice,false,'overlay');
    }

    showTmapImage() {
        this.app_state.viewer.setimage(this.app_state.ATLAS_mri);
        this.app_state.viewer.setobjectmap(this.app_state.tmap, false, "Overlay");
        let cmapcontrol=this.app_state.viewer.getColormapController();
        let elem=cmapcontrol.getElementState();
        elem.minth=1.0;
        cmapcontrol.setElementState(elem);
        cmapcontrol.updateTransferFunctions(true);
    }


    // --------------------------------------------------------------------------------
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
    
    // calls computeLinearRegistration to register interictal image to ictal image.
    registerInterictalToIctal() {
            
        this.app_state.intertoictal = null;
        
        // check that the images exist
        if (this.app_state.interictal === null ||
            this.app_state.ictal === null) {
            errormessage('Bad spect Images can not register');
            return;
        }
        
        // wait for registration to compute, then store registration output in global object
        return this.computeLinearRegistration(this.app_state.interictal, this.app_state.ictal).then( (output) => {
            console.log(output);
            this.app_state.intertoictal_xform = output.transformation;
            this.app_state.intertoictal_reslice = output.reslice;
            console.log(this.app_state.intertoictal_xform);
            console.log(this.app_state.intertoictal_reslice);
        });
    }
    
    
    // calls either computeNonlinearRegistration or computeLinearRegistration to register ATLAS image to MRI image
    registerAtlasToMRI() {
        
        // make sure that images exist
        if (this.app_state.mri===null ||
            this.app_state.ATLAS_spect === null) {
            
            errormessage("bad images!");
            return;
        }
        
        // compute nonlinear registration and store output, if nonlinear is selected
        if (this.app_state.nonlinear) {
            return this.computeNonlinearRegistration(this.app_state.ATLAS_spect, this.app_state.mri).then( (output) => {
                console.log(output);
                this.app_state.atlastomri_xform = output.transformation;
                this.app_state.atlastomri_reslice = output.reslice;
            });
        }
        
        
        // default is to compute linear registration
        return this.computeLinearRegistration(this.app_state.ATLAS_spect, this.app_state.mri, null, null).then( (output) => {
            this.app_state.atlastomri_xform = output.transformation;
                this.app_state.atlastomri_reslice = output.reslice;
            });
    }
    
    // calls computeLinearRegistration to register MRI to interictal image
    registerMRIToInterictal() {
        if (this.app_state.mri === null ||
            this.app_state.interictal === null) {
            
            errormessage("bad images");
            return;
        }
        
        return this.computeLinearRegistration(this.app_state.mri, this.app_state.interictal, null, null).then( (output) => {
            this.app_state.mritointer_xform = output.transformation;
            this.app_state.atlastomir_reslice = output.reslice;
        });
        
    }
        
    // calls computeLinearRegistration or computeNonlinearRegistration to register ATLAS image to interictal image
    registerAtlasToInterictal() {
            
        this.app_state.atlastointer = null;
        
        // check to see if images exist
        if (this.app_state.interictal === null ||
            this.app_state.ATLAS_spect === null) {
            errormessage('Bad Atlas and/or interictal spect, can not register');
            return;
        }
        
        
        // computes nonlinear registration and stores output if nonlinear is selected
        if (this.app_state.nonlinear) {
            return this.computeNonlinearRegistration(this.app_state.ATLAS_spect, this.app_state.interictal).then( (output) => {
                console.log(output);
                this.app_state.atlastointer_xform = output.transformation;
                this.app_state.atlastointer_reslice = output.reslice;
                console.log(this.app_state.atlastointer_xform);
                console.log(this.app_state.atlastointer_reslice);    
            });
        }
        
        
            // defaults to linear registration
        return this.computeLinearRegistration(this.app_state.ATLAS_spect, this.app_state.interictal).then( (output) => {
            console.log(output);
            this.app_state.atlastointer_xform = output.transformation;
            this.app_state.atlastointer_reslice = output.reslice;
            console.log(this.app_state.atlastointer_xform);
            console.log(this.app_state.atlastointer_reslice);
        });
        
    }
        
    // calls all of the above custom registration methods in correct order and reslices images as necessary
    computeRegistrationOfImages() {
            
        // execute registration order if MRI is not uploaded by user
        if (!this.app_state.does_have_mri) {
            
            
            /*
              computes each 'adjacent' registration and combines registration transformation for reslicing according to 'nonadjacent' registrations
            */
            
            // array of promise methods
            let p= [ this.registerAtlasToInterictal(true),
                     this.registerInterictalToIctal() ];
            
            // executes all promises in order
            Promise.all(p).then( () => {
                
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
                    this.dataPanel.show();
                });
                
            });
        } else {             // execute order of registration when MRI image is uploaded
            
            let p1 = [ this.registerAtlasToMRI(),
                       this.registerMRIToInterictal(),
                       this.registerInterictalToIctal()
                     ];
            
            let reslicer = new ResliceImage();
            
            Promise.all(p1).then( () => {
                let input = {
                    'input' : this.app_state.ictal,
                    'xform' : this.app_state.atlastomri_xform,
                    'xform2': this.app_state.mritointer_xform,
                    'xform3': this.app_state.intertoictal_xform,
                    'reference': this.app_state.ATLAS_spect
                };
                
                reslicer.execute(input).then( () => {
                    this.app_state.atlastoictal_reslice =reslicer.getOutputObject('output');
                    this.dataPanel.show();
                });
            });
            
            let p2 = [ this.registerAtlasToMRI(), this.registerMRIToInterictal()];
            
            Promise.all(p2).then( () => {
                
                let input = {
                    'input' : this.app_state.interictal,
                    'xform' : this.app_state.atlastomri_xform,
                    'xform2': this.app_state.mritointer_xform,
                    'reference': this.app_state.ATLAS_spect
                };
                
                reslicer.execute(input).then( () => {
                    this.app_state.atlastointer_reslice = reslicer.getOutputObject('output');
                    this.dataPanel.show();
                });
                
            });
        }
    }

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

    // processes registered SPECT images and generates hyperperfusion and hypoperfusion stats
    computeSpectNoMRI() {
        console.log("compute spect no MRI");
        var resliced_inter = this.app_state.atlastointer_reslice;
        var resliced_ictal = this.app_state.atlastoictal_reslice;
        
        var results = this.processSpect(resliced_inter, resliced_ictal, this.app_state.ATLAS_stdspect, this.app_state.ATLAS_mask);
        
            console.log(results);
        
        console.log();
        console.log();
        
        var hyper_str = '';
        hyper_str += '#\tI\tJ\tK\tsize\tmaxT\tclusterP\tactualP\n';
        for (var i = 0; i < results.hyper.length; i++) {
            hyper_str += results.hyper[i].string + '\n';
        }
        
        // format string for displaying as table
        this.app_state.hyper = hyper_str;
        
        var hypo_str = 'hypo cluster statistics \n';
        hypo_str += '#\tx\ty\tz\tsize\tmaxT\tclusterP\tactualP\n';
        for (var k = 0; k < results.hypo.length; k++) {
            hypo_str += results.hypo[k].string + '\n';
        }
        
        console.log(hyper_str);
        console.log();
        console.log();
        console.log(hypo_str);
        this.app_state.tmap = results.tmap;
    }
    
    
    // button callback for computing diff spect data
    computeSpect() {
        console.log("compute spect callback");
        this.computeSpectNoMRI();
        this.showTmapImage();
        this.generateChart();
        this.resultsPanel.show();
    }

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
                                             permanent : true,
                                             width : '300',
                                             //                                      dual : false,
                                             //                                    mode : 'sidebar'
                                          });
        this.resultsToolsDiv = this.resultsPanel.getWidget();
        
        // stamp template
        this.tree_div=$(tree_template_string);
        this.chart_div=$(chart_string);
        
        this.spectToolsDiv.append(this.tree_div);
        this.resultsToolsDiv.append(this.chart_div);

        this.dataPanel.show();
        this.resultsPanel.show();
        this.dataPanel.show();
        //      this.resultsPanel.hide();
        
        
        this.initializeSpectTool();     
        
        
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
            if (self.app_state.atlastoictal_reslice !== null && self.app_state.atlastointer_reslice !== null && self.app_state.intertoictal_reslice !== null)
                self.computeSpect(); 
            else
                bootbox.alert('IMAGES NOT REGISTERED/RESLICED');
        });


    }
    
    connectedCallback() {

        super.connectedCallback();
        
        
        this.app_state.viewer = this.VIEWERS[0];
        this.app_state.viewer.collapseCore();
        

    }
}

webutil.defineElement('bisweb-diffspectelement', DiffSpectElement);
