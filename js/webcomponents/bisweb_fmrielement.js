"use strict";

// imported modules from open source and bisweb repo
const bisimagesmoothreslice = require('bis_imagesmoothreslice');
const bistransformations = require('bis_transformationutil');
const BisWebImage = require('bisweb_image');
const webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const bisimagealgo = require('bis_imagealgorithms');
const bisgenericio = require('bis_genericio');
const $ = require('jquery');
const bootbox = require('bootbox');
const LinearRegistration = require('linearRegistration');
const ResliceImage = require('resliceImage');
const NonlinearRegistration = require('nonlinearRegistration');
const baseutils = require('baseutils');
const BisWebPanel = require('bisweb_panel.js');
const jstree = require('jstree');
const MotionCorrection = require('motionCorrection');


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
        anat: [],
        func:[],
        dwi: [],
        derivatives: []
    }
};



/*
 * FMRI tool element 
 * BIDS data structure implemented w/ jsTree
 */
class FMRIElement extends HTMLElement {

    constructor() {
        super();
        this.panel = null;
    }

    

    initializeFMRITool() {

    }

    createNewStudy() {

        const self = this;
        let tree=this.tree_div.find('#treeDiv');

        console.log(tree);

        // initialize jstree with new study
        let json_data = {

            'core': {
                'data': [
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
            
            webfileutil.genericFileCallback(null, 
                
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
                }, 
                
                {
                    'title': 'Load Image',
                    'suffix': 'NII'
                });
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


    
        
    computeMotionCorrection(array) {
        let imageArray = [];
        console.log(array);

        for (let i=0;i<array.length;i++) {
            imageArray.push(array[i].image);
        }

        let self = this;
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

        let finalOutputs = [];

        return new Promise( (resolve, reject) => {
            let outputs = [];

            for (let i=0;i<imageArray.length;i++) {
                input['target'] = imageArray[i];
                motionCorrection.execute(input, parameters).then( () => {
                    outputs.push( {xform: motionCorrection.getOutputObject('output'), image: motionCorrection.getOutputObject('resliced'), name: "CORRECTED_"+array[i].name } );
                    let tree = $('#treeDiv');
                    tree.jstree().create_node("j1_5", {text: outputs[i].name});
                });
            } 
            
            resolve(outputs);
        });
    }

    


    // -------------------------------------------------
    // 'main' function
    // -------------------------------------------------
    connectedCallback() {


        const self = this;
        const menubarid = this.getAttribute('bis-menubarid');
        let menubar = document.querySelector(menubarid).getMenuBar();

        let fmenu = webutil.createTopMenuBarMenu('File', menubar);
        let motionmenu = webutil.createTopMenuBarMenu('Motion', menubar);
        
        webutil.createMenuItem(fmenu, 'New Subject',
            function () {
                self.createNewStudy();
            }
        );


        webutil.createMenuItem(motionmenu, 'Correct Motion',
            function() {
                self.computeMotionCorrection(app_state.images.func).then( (resolvedObject) => {
					app_state.images.derivatives = resolvedObject;
				});
                
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
        this.initializeFMRITool();     

    }

}

webutil.defineElement('bisweb-fmrielement', FMRIElement);
