"use strict";

// imported modules from open source and bisweb repo
const BisWebImage = require('bisweb_image');
const webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const bisgenericio = require('bis_genericio');
const $ = require('jquery');
const bootbox = require('bootbox');
const LinearRegistration = require('linearRegistration');
const ResliceImage = require('resliceImage');
const NonlinearRegistration = require('nonlinearRegistration');
const BisWebPanel = require('bisweb_panel.js');
const MotionCorrection = require('motionCorrection');
const TransformationCollection = require('bisweb_transformationcollection');
require('jstree');

const tree_template_string = 
`
<div class="container" style="width:300px">
    <div id="treeDiv">
    </div>
</div> 
`;

// ---------------------------------------------------
// Global Variables
// ---------------------------------------------------
let app_state = 
{
    viewer: null,
    images: {
        mni: null,
        anat: [],
        func:[],
        dwi: [],
        derivatives: []
    }
};

//TODO: Add 32px and throbber from jstree


/*
 * FMRI tool element 
 * BIDS data structure implemented w/ jsTree
 */
class FMRIElement extends HTMLElement {

    constructor() {
        super();
        this.panel = null;
        app_state.images.mni = new BisWebImage();
        
        let imagepath=webutil.getWebPageImagePath();

        app_state.images.mni.load(`${imagepath}/MNI_T1_2mm_stripped_ras.nii.gz`, false).then( () => {
            console.log('MNI Loaded');
        });
    }

    

    // initializes jstree when new subject is selected
    createNewStudy() {

        const self = this;
        let tree=this.tree_div.find('#treeDiv');

        console.log(tree);

        // initialize jstree with new study
        let json_data = {

            'core': {
                'data':[
                    {
                        'text': 'New Subject',
                        'children': [
                            {
                                'text': 'anat'
                            },
                            {
                                'text': 'func'
                            },
                            {
                                'text': 'dwi'
                            },
                            {
                                'text': 'derivatives'
                            }
                        ] 
                    },
                ],
                'check_callback': true
            },
            'plugins': ['contextmenu'],
            'contextmenu': {
                'items': self.customMenu
            }
        };

        // select loaded image for viewer
        tree.jstree(json_data).bind('select_node.jstree', function (e, node) {
            let parentID = node.node.parent;
    
            if (parentID === 'j1_2') {
                let imagearray = app_state.images.anat;
                console.log(imagearray);
               
                for (let i=0;i<imagearray.length;i++) {
                    if (node.node.text === imagearray[i].name) {
                        app_state.viewer.setimage(imagearray[i].image);
                        break;
                    }
                }
            }

            else if (parentID === 'j1_3') {
                let imagearray = app_state.images.func;
                console.log(imagearray);

                for (let i=0;i<imagearray.length;i++) {
                    if (node.node.text === imagearray[i].name) {
                        app_state.viewer.setimage(imagearray[i].image);
                        break;
                    }
                }
            }

            else if (parentID === 'j1_4') {
                let imagearray = app_state.images.dwi;
                console.log(imagearray);

                for (let i=0;i<imagearray.length;i++) {
                    if (node.node.text === imagearray[i].name) {
                        app_state.viewer.setimage(imagearray[i].image);
                        break;
                    }
                }
            }

            else if (parentID === 'j1_5') {
                let imagearray = app_state.images.derivatives;
                console.log(imagearray);

                for (let i=0;i<imagearray.length;i++) {
                    if (node.node.text === imagearray[i].name) {
                        console.log('image found');
                        app_state.viewer.setimage(imagearray[i].image);
                        break;
                    }
                }

                if (node.node.text === "AVERAGE_fmri_T1space.nii.gz") {
                    let t1 = self.getT1Image(app_state.images.anat).image;
                    app_state.viewer.setimage(t1);
                    for (let i=0;i<imagearray.length;i++) {
                        if (node.node.text === imagearray[i].name) {
                            console.log('image found');
                            app_state.viewer.setobjectmap(imagearray[i].image);
                            break;
                        }
                    }
                }
            }

        });
    }


    // right click options on jstree nodes
    customMenu(node) {
        console.log(this);
        console.log($('#treeDiv'));
        let tree = $('#treeDiv');


        // load image from file and sort based on user selection
        let imageFileSelect = function() {
            
            webfileutil.genericFileCallback(
                {
                    'title': 'Load Image',
                    'suffix': 'NII'
                },
                function(filename) {
                    let newimg = new BisWebImage();
                    
                    newimg.load(filename, false).then(() => {
                        if (node.text === 'anat') {
                            app_state.images.anat.push({image: newimg, name: filename.name});
                            console.log(newimg);
                            tree.jstree().create_node("j1_2",{text: filename.name});
                        }
                        else if (node.text === "func") {
                            app_state.images.func.push({image: newimg, name: filename.name});
                            tree.jstree().create_node("j1_3",{text: filename.name});
                        }
                        else if (node.text === "dwi") {
                            app_state.images.dwi.push({image: newimg, name: filename.name});
                            tree.jstree().create_node("j1_4",{text: filename.name});
                        }
                        app_state.viewer.setimage(newimg);
                    });
                } 
            );
        };

           
       
        console.log(node);

        // initialize right click context menu
        let items = {
            addImage: {
                'label': 'Load Data',
                'action': function() {
                    imageFileSelect();
                    console.log(app_state.images);
                }
            }
            
        };

        // delete context menu items based on which node was selected
        if (node.text !== 'anat' &&
            node.text !== 'func' &&
            node.text !== 'dwi') delete items.addImage;

        return items;
    }

	// TODO: add electron check and saving tree structure.
    saveDataToJSON(fobj) {

        console.log(fobj);
        let imgStr = JSON.stringify(app_state.images, null, 2);
        console.log("serialized");        
        let output = {
            bisformat: "bisweb-fmritool",
            images: imgStr
        };

        bisgenericio.write(fobj, JSON.stringify(output,null,2));

    }

	// TODO: add electron check and directory loading
    loadDataFromJSON() {

        /*        return new Promise( (resolve, reject) => {
            let input = document.createElement('input');
            input.type = 'file';
            input.click();
            //let selectedFile = document.getElementById('input').files[0];

            //let filename = selectedFile.value;
            //let text = fs.readFileSync(filename).toString('utf-8');
            
            //let jsonobj;
            try {
                //  jsonobj = JSON.parse(text);
            } catch(e) {
                bootbox.alert('Invalid File Type');
                reject(e);
            }

            resolve(jsonobj);
            
        });*/
    }

    populateTree(jsonobj) {

        let images = jsonobj.images;
        let anat = images.anat;
        let func = images.func;
        let dwi = images.dwi;
        let deriv = images.derivatives;

        let tree = $('#treeDiv');

        for (let i=0;i<anat.length;i++)
            tree.jstree().create_node('j1_2', {text: anat[i].name});
        for (let i=0;i<func.length;i++)
            tree.jstree().create_node('j1_3', {text: func[i].name});
        for (let i=0;i<dwi.length;i++)
            tree.jstree().create_node('j1_4', {text: dwi[i].name});
        for (let i=0;i<deriv.length;i++)
            tree.jstree().create_node('j1_5', {text: deriv[i].name});
    }
    
    // a function that computes a nonlinear image registration, given a reference image and a target image
    computeNonlinearRegistration(reference, target) {

        let nonlinearReg = new NonlinearRegistration();
        let input = { 'reference': reference,
                      'target'   : target};

        let opts =  {
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
            xform: null,
            reslice: null
        };

        return new Promise( (resolve, reject) => {

            nonlinearReg.execute(input, opts).then( () => {
                output.xform = nonlinearReg.getOutputObject('output');
                output.reslice = nonlinearReg.getOutputObject('resliced');
                resolve(output);
            }).catch( (e) => {
                console.log("Error:", e, e.stack);
                bootbox.alert("ERROR:", e, e.stack);
                reject(e);
            });
        });
    }

    // a function that computes a linear registration given a reference image and a target image
    computeLinearRegistration(reference, target) {

        let input = {
            'reference': reference,
            'target'   : target
        };

        let opts = {
            "intscale": 1,
            "numbins": 64,
            "levels": 3,
            "imagesmoothing": 1,
            "optimization": "ConjugateGradient",
            "stepsize": 1,
            "metric": "NMI",
            "steps": 1,
            "iterations": 1,
            "mode": "Rigid",
            "resolution": 1.5,
            "doreslice": true,
            "norm": true,
            "debug": false
        };

        let linearReg = new LinearRegistration();

        let output = {
            transformation: null,
            reslice: null
        };

        return new Promise( (resolve, reject) => {
            linearReg.execute(input, opts).then( () => {
                output.xform = linearReg.getOutputObject('output');
                output.reslice = linearReg.getOutputObject('resliced');
                resolve(output);
            }).catch( (e) => {
                console.log('ERROR:',e,e.stack);
                bootbox.alert('ERROR');
                reject(e);
            });
        });
    }
    
    // a function that computes motion correction and reslices an array of images (according to computed motion parameters)
    computeMotionCorrection(array) {
        let imageArray = [];
        console.log(array);

        for (let i=0;i<array.length;i++) {
            imageArray.push(array[i].image);
        }

        let numImages = imageArray.length;

        let middleImage;

        console.log(imageArray);

        middleImage = imageArray[Math.round((numImages-1)/2)];
        let dims = middleImage.getDimensions();

        console.log(middleImage);

        let motionCorrection = new MotionCorrection();
        let input = {
            'target'    : null,
            'reference' : middleImage,
        };

        let parameters = {
            "doreslice": true,
            "norm": true,
            "intscale": 1,
            "numbins": 64,
            "extrasmoothing": 0,
            "metric": "CC",
            "optimization": "HillClimb",
            "stepsize": 0.25,
            "levels": 3,
            "iterations": 1,
            "resolution": 1.01,
            "debug": false,
            "steps": 4,
            "refno": Math.round((dims[3]-1)/2)
        };


        return new Promise( (resolve, reject) => {
            let outputs = [];

            for (let i=0;i<imageArray.length;i++) {
                input['target'] = imageArray[i];
                motionCorrection.execute(input, parameters).then( () => {
                    outputs.push( {xform: motionCorrection.getOutputObject('output'), image: motionCorrection.getOutputObject('resliced'), name: "CORRECTED_"+array[i].name } );
                    let tree = $('#treeDiv');
                    tree.jstree().create_node("j1_5", {text: outputs[i].name});
                }).catch( (e) => {
                    console.log("Error:",e,e.stack);
                    bootbox.alert('ERROR');
                    reject(e);
                });
            } 
            
            resolve(outputs);
        });
    }

    // A function that extracts motion corrected images from an array of images
    getMotionCorrectedImages(array) {
        
        let correctedImages = [];

        for (let i=0;i<array.length;i++) 
            if (array[i].name.substring(0,10) === "CORRECTED_") 
                correctedImages.push(array[i]);

        return correctedImages;

    }    


    // A function that averages images
    computeAverageImage(array) {

        let imageArray = [];
    
        for (let i=0;i<array.length;i++) 
            imageArray.push(array[i].image);

        let dims=imageArray[0].getDimensions();
        let pitch=[1,dims[0],dims[0]*dims[1],dims[0]*dims[1]*dims[2],dims[0]*dims[1]*dims[2]*dims[3]];
        
        let averageImage = new BisWebImage();
        averageImage.cloneImage(imageArray[0]);

        for (let i=0;i<dims[0];i++) {
            for (let j=0;j<dims[1];j++) {
                for (let k=0;k<dims[2];k++) {
                    for (let t=0;t<dims[3];t++) {
                        let averageVoxelIntensity=0;
                        let sumVoxelIntensity=0;

                        for (let currentImage=0;currentImage<imageArray.length;currentImage++) 
                            sumVoxelIntensity += imageArray[currentImage].getVoxel([i,j,k,t]);

                        averageVoxelIntensity = sumVoxelIntensity/imageArray.length;

                        if (t%50===0)
                            console.log('Average Voxel Intensity:', averageVoxelIntensity);

                        averageImage.getImageData()[i*pitch[0] + j*pitch[1] + k*pitch[2] + t*pitch[3]] = averageVoxelIntensity;
                    }
                }
            }
        }

        return averageImage;    
    }

    // a function to extract the average fmri image from an array of images (if it exists)
    getAverageFMRI(array) {

        let averageImage = null;

        for (let i=0;i<array.length;i++) 
            if (array[i].name === "AVERAGE_fmri.nii.gz") {
                averageImage = array[i];
                console.log("Average Image Found");
                break;
            }

        return averageImage;
    }

    // a function to extract the T1 weighted image from an array of anatomical data
    getT1Image(array) {

        let t1 = null;
        for (let i=0;i<array.length;i++) 
            if (array[i].name.indexOf("T1") >= 0 ||
                array[i].name.indexOf("t1") >= 0) {
                    t1 = array[i];
                }

        return t1;
    }

    // -------------------------------------------------
    // 'main' function
    // -------------------------------------------------
    connectedCallback() {


        const self = this;
        const menubarid = this.getAttribute('bis-menubarid');
        let menubar = document.querySelector(menubarid).getMenuBar();

        let fmenu = webutil.createTopMenuBarMenu('File', menubar);
        let processingmenu = webutil.createTopMenuBarMenu('Image Processing', menubar);
        let registrationmenu = webutil.createTopMenuBarMenu('Image Registration', menubar);
        
        webutil.createMenuItem(fmenu, 'New Subject',
            function () {
                self.createNewStudy();
            }
        );

        webutil.createMenuItem(fmenu, 'Load Study Data', function() {
            self.loadDataFromJSON().then( (resolvedObj) => {
                let bisformat = resolvedObj.bisformat;
                if (bisformat !== "bisweb-fmritool") {
                    bootbox.alert("Not a valid JSON file");
                    return;
                }

                app_state.images = resolvedObj.images;
                self.createNewStudy();
                self.populateTree();
            });
        });

        webfileutil.createFileMenuItem(fmenu, 'Save Study Data', function(fileobj) {
                                         self.saveDataToJSON(fileobj);
                                    },
                                    {
                                        title: "Save Data",
                                        save: true,
                                                                                filters:[ { name: 'Patient File', extensions: ['fmri']}],
                                                                                suffix : "biswebstate",
                                           initialCallback : () => {
                                               return 'new_study.fmri';
                                           }
                                    });

        webutil.createMenuItem(processingmenu, 'Correct Motion',
            function() {
                if (app_state.images.func.length > 0) {
                       self.computeMotionCorrection(app_state.images.func).then( (resolvedObject) => {
                       app_state.images.derivatives = resolvedObject;
                    });
                } 

                else
                    bootbox.alert("No Functional Images Found");
            }
        );

        webutil.createMenuItem(processingmenu, 'Compute Average Functional Image',
            function() {
                let correctedImages = self.getMotionCorrectedImages(app_state.images.derivatives);
                if (correctedImages.length > 0) {
                    let averageImage = self.computeAverageImage(correctedImages);
                    app_state.images.derivatives.push({image: averageImage, xform: null, name: "AVERAGE_fmri.nii.gz"});
                    let tree = $("#treeDiv");
                    tree.jstree().create_node("j1_5", {text:"AVERAGE_fmri.nii.gz"});
                }

                else
                    bootbox.alert("No Motion Corrected Images Found");
            }
        );

        webutil.createMenuItem(registrationmenu, 'Register Functional to T1', 
            function() {
                let averageImage = self.getAverageFMRI(app_state.images.derivatives).image;
                let t1 = self.getT1Image(app_state.images.anat).image;

                if (averageImage !== null && t1 !== null) {

                                        // TODO: fix memory leak in reslice
                    let registerFunctionalToT1 = self.computeLinearRegistration(t1, averageImage);
                    registerFunctionalToT1.then( (output) => {
                        let newObject = {image: output.reslice, xform: output.xform, name: "AVERAGE_fmri_T1space.nii.gz"};
                        app_state.images.derivatives.push(newObject);
                        let tree = $("#treeDiv");
                        tree.jstree().create_node("j1_5", {text:"AVERAGE_fmri_T1space.nii.gz"});
                    });
                }
            
                else
                    bootbox.alert('Invalid Images');
            }
        );

        webutil.createMenuItem(registrationmenu, 'Register T1 to MNI',
            function() {
                let t1 = self.getT1Image(app_state.images.anat).image;
                let average = self.getAverageFMRI(app_state.images.derivatives);

                if (t1 !== null) {
                    let registerT1ToMNI = self.computeLinearRegistration(app_state.mni, t1);
                    registerT1ToMNI.then( (output) => {
                        let newObject = {image: output.reslice, xform: output.xform, name: "T1_MNIspace.nii.gz"};
                        app_state.images.derivatives.push(newObject);
                        let tree = $("#treeDiv");
                        tree.jstree().create_node("j1_5", {text: "T1_MNIspace.nii.gz"});

                        let input = {
                            'input' : average,
                            'xform' : average.xform,
                            'xform2': newObject.xform,
                            'reference' : app_state.mni
                        };

                        let reslicer = new ResliceImage();
                        reslicer.execute(input).then( () => {
                            let average_mni = reslicer.getOutputObject('output');
                            let name = "AVERAGE_fmri_MNIspace.nii.gz";
                            let xform = new TransformationCollection();
                            xform.addTransformation(average.xform);
                            xform.addTransformation(newObject.xform);
                            app_state.images.derivatives.push({images: average_mni, name: name, xform: xform });
                            
                            let tree = $("#treeDiv");
                            tree.jstree().create_node("j1_5", {name: name});
                        });
                    });
                }
            }
        );

        webutil.createMenuItem(fmenu,'');
        webutil.createMenuItem(fmenu,'Show fMRI Tool',function() {
            self.panel.show();
        });
        
        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let layoutcontroller = document.querySelector(layoutid);
        
        app_state.viewer = document.querySelector(this.getAttribute('bis-viewerid'));


        
        this.panel=new BisWebPanel(layoutcontroller,
                                   {  name  : 'fMRI Tool',
                                      permanent : false,
                                      width : '300',
                                      dual : false,
                                      mode : 'sidebar'
                                   });
        
        
        let fmriToolsDiv = this.panel.getWidget();
        console.log(this.panel);
        app_state.viewer.collapseCore();


    

        this.tree_div=$(tree_template_string);
        
        
        fmriToolsDiv.append(this.tree_div);

        this.panel.show();
        console.log(this.tree_div);

        if (webutil.inElectronApp()) {

            
        let hmenu = webutil.createTopMenuBarMenu("Help", menubar);
            webutil.createMenuItem(hmenu, 'Show JavaScript Console', () => {
                window.BISELECTRON.remote.getCurrentWindow().toggleDevTools();
            });

		}
    }
}

webutil.defineElement('bisweb-fmrielement', FMRIElement);
