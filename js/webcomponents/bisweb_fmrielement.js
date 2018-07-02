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
        dwi: []
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
                        'text': 'New Study',
                        'children': [
                            {
                                'text': 'anat'
                            },
                            {
                                'text': 'func'
                            },
                            {
                                'text': 'dwi'
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

        tree.jstree(json_data);
    }

    customMenu(node) {
        console.log(this);
        console.log($('#treeDiv'));
        let tree = $('#treeDiv');

        let imageFileSelect = function() {
            
            webfileutil.genericFileCallback(null, 
                
                function(filename) {
                    let newimg = new BisWebImage();
                    
                    newimg.load(filename, false).then(() => {
                        if (node.text === 'anat') {
                            app_state.images.anat.push(newimg);
                            tree.jstree().create_node("j1_2",{text: filename.name});
                        }
                        else if (node.text === "func") {
                            app_state.images.func.push(newimg);
                            tree.jstree().create_node("j1_3",{text: filename.name});
                        }
                        else if (node.text === "dwi") {
                            app_state.images.dwi.push(newimg);
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
        let items = {
            addImage: {
                'label': 'Load Dataset',
                'action': function() {
                    imageFileSelect();
                    console.log(app_state.images);
                }
            }
        };

        if (node.text !== 'anat' &&
            node.text !== 'func' &&
            node.text !== 'dwi') delete items.addImage;

        return items;
    }

    // -------------------------------------------------
    // 'main' function
    // -------------------------------------------------
    connectedCallback() {


        const self = this;
        const menubarid = this.getAttribute('bis-menubarid');
        let menubar = document.querySelector(menubarid).getMenuBar();

        let fmenu = webutil.createTopMenuBarMenu("File", menubar);

        webutil.createMenuItem(fmenu, 'New Study',
        function () {
            self.createNewStudy();
        });




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
