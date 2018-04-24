/*global document, window, Event, CustomEvent */

/**
 * @file A Broswer module. Contains an element which manages the interaction between algorithm modules and the main viewer/main application 
 * @author Xenios Papademetris
 * @version 1.0
 */
"use strict";

const webutil = require('bis_webutil');
const $ = require('jquery');
const Chart = require('chart.js');
const util = require('bis_util');
const dbase = require('databasetable.js');
const transformationutil=require('bis_transformationutil');

const BisWebSimpleAlgorithmController= require('bisweb_simplealgorithmcontroller.js');
/**
 * A class to manage algorithms
 *
 * @example
 *
 * <bisweb-algorithmmanager
 *     bis-viewerid1="#viewer"
 *     bis-viewerid2="#viewer"
 * >
 * </bisweb-algorithmmanager>
 *
 * Attributes:
 *      bis-viewerid : the first viewer to draw in 
 *      bis-viewerid2 : the second viewer to draw in 
 */
class AlgorithmControllerElement extends BisWebSimpleAlgorithmController {

    constructor() {
        super();

        this.autosave = true;
        this.initialized = false;
        this.inputs = [];
        this.graphWindow = null;
        
        this.viewersInfo = {}; //metadata about image currently displayed on the viewer
        this.tabledivid = webutil.getuniqueid();

        this.matrixCanvasId = 'matrixCanvasId';
        this.matrixGraph = null;
        this.currentTransform = null;
        this.undoTransform = null;

        this.database = new dbase();

        //need to execute attachViewers after all the elements have been loaded, attach it to page load event
        //https://stackoverflow.com/questions/807878/javascript-that-executes-after-page-load
        if (window.attachEvent) {
            window.attachEvent('onload', this.attachViewers);
        } else {
            if (window.onload) {
                let currentOnLoad = window.onload;
                let newOnload = (event) => {
                    currentOnLoad(event);
                    this.attachViewers();
                };
                window.onload = newOnload;
            } else {
                //window invokes attachViewers so have to bind algorithm controller explicitly
                window.onload = this.attachViewers.bind(this);
            }
        }
    }

    createGraphWindow() {

        if (this.graphWindow!==null)
            return;
    
            //------------------------------------------------------------------------------------
        // create container for matrix graphs
        //------------------------------------------------------------------------------------
        let width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        let dialogWidth = (4 * width / 5);
        let dialogHeight = (4 * height / 5);

        this.graphWindow = webutil.createdialog("Loaded Matrix", dialogWidth, dialogHeight, 100, 100);
        this.graphWindow.widget.css({ "background-color": "#222222" });

        const graphHTML = 
              `
              <div style="height:50px; margin:0px; background:#222222;"></div>
              <div class="chart-container" style="position: relative;"><canvas id="${this.matrixCanvasId}"></canvas></div>
              `;

        this.graphWindow.widget.append(graphHTML);
    }
    
    connectedCallback() {

        
        //'loadTransform' event dispatched by the 'Load Transform' button in bisweb_mainviewerapplication
        document.addEventListener('loadTransform', this.handleLoadTransformEvent.bind(this));
    }


    // ----------------------- Methods from bisweb_basealggorithmcontroller ------------------
    
    

    attachViewers() {

        super.attachViewers();
        let viewerKeys = Object.keys(this.viewers);
        for (let key of viewerKeys) {
            this.viewersInfo[key] = undefined;
        }
        
        this.initialized = true;
        
        //signal all events listening for the viewers being attached
        window.dispatchEvent(new Event('viewersAttached'));
    }

    saveInput(input, name, type, origin = "Origin unknown") {
        let stamp = webutil.createTimestamp();
        let now = Date.now();
        let id = webutil.getuniqueid();

        console.log('save input', input);
        //create descriptive name with timestamp to show user in dropdown menu
        let displayName = ((type === 'image') ? 'Image' : 'Matrix') + ' created on ' + stamp;

        this.database.addItem(input, id, { 'name': name, 'date': now, 'description': displayName, 'type': type, 'origin': origin });

        //replace existing input controller dropdown with updated list
        this.inputList.push(displayName);
    }


    /**
     * Takes data and updates the appropriate viewer. Templated as a promise to handle asynchronous save image dialog that will appear if the user has not 
     * saved the input on the viewer they are attempting to update. 
     * 
     * @param {Object} input -- Data to place on a viewer appropriate to its data type. Note that this is not a dictionary entry but raw data.
     * @param {Object} options - dictionary of options
     * @param {String} options.viewername - Name of viewer ('viewer1' or 'viewer2')
     * @param {String} options.viewersource - Image in viewer ('image' or 'overlay')
     * @param {String} options.colortype - Image in viewer ('Objectmap', "Overlay", "Overlay2" , "Red", "Green", "Blue","Gray","Orange")
     * @param {Boolean} options.saveinput - Whether or not to save the image being pushed with update
     * @param {String} options.savename - The name to use when saving the image
     * @param {String} options.existingItemId - The ID of an item already in the database. Used when you want to update an entry rather than create a new one. Optional.
     * @param {Object} vieweroption.inputinfo - Metadata associated with the data being pushed in input. Generally it is good to include this inform if it is available to you. 
     */
    handleUpdate(inpobj, options = {
        'viewername': 'image',
        'viewersource': 'image',
        'colortype': 'Auto',
        'saveinput': false,
        'existingItemId' : null
    }) {


        return new Promise( (resolve,reject) => {
        
            let objtype=inpobj.getObjectType();
            if (objtype==='image') {
                
                //if this image is loaded from within memory we want to make sure we update the entry and not create another one
                let existingItemId = options.existingItemId;
                if (existingItemId) {
                    let item = this.database.getItemById(existingItemId);
                    if (!item) { reject({ 'reason': 'Item with id ' + existingItemId + ' does not exist.' }); }
                    
                    //------------------------------------------------------------------------
                    // TODO: LOAD ALL THE METADATA ASSOCIATED WITH EXISTINGITEM
                    //------------------------------------------------------------------------
                    
                } 
                this.handleImageUpdate(inpobj,options);
            } else if (objtype === 'matrix') {
                this.drawMatrixInFrame(inpobj);
            } 
            else if (objtype === "transform") { 

                this.handleTransformUpdate(inpobj,options);
                webutil.createAlert('Current transform updated.', false);
            }

            
            if (options.saveinput) {
                this.handleFileSave(inpobj, objtype, options);
                console.log('stored file', options.savename, 'in database');
            }
            
            resolve('updated');
        });
    }

    handleFileSave(input, type, opts) {

        if (opts.existingItemId) {
            let item = this.database.getItemById(opts.existingItemId);
            if (item) {
                // handle metadata
                this.database.updateItemById(item.id, input, opts.newmetadata);
            }
        } else {
            this.database.makeItemAndAdd(opts.savename, input, type, opts.newmetadata);
        }
        return true;
    }


    drawMatrixInFrame(matrix) {
        let canvas = document.getElementById(this.matrixCanvasId);
        let context = canvas.getContext("2d");

        this.createGraphWindow();
        let dimensions = this.graphWindow.getdimensions();
        console.log('dimensions', dimensions);
        context.clearRect(0, 0, dimensions.width, dimensions.height);

        if (this.matrixGraph !== null) {
            this.matrixGraph.destroy();
        }

        let rows = matrix.length;
        let cols = matrix[0] ? matrix[0].length : 0;

        let datasets = [];
        let labels = [];

        for (let i = 0; i < cols; i++) {
            let cl = util.objectmapcolormap[i];
            cl = 'rgb(' + cl[0] + ', ' + cl[1] + ', ' + cl[2] + ')';
            datasets.push({
                data: [],
                fill: false,
                pointRadius: 0,
                borderWidth: 1,
                backgroundColor: cl,
                borderColor: cl,
                label: 'Series ' + i
            });

        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                datasets[j].data.push(matrix[i][j]);
            }
            labels.push(i);
        }

        this.matrixGraph = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                legend: {
                    position: 'right',
                    display: false
                },
                elements: {
                    line: {
                        tension: 0 //disable bezier curves
                    }
                },
                scales: {
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Point',
                            fontSize: 20
                        }
                    }]
                },
            }
        });

        //set sizes of element manually because chart.js methods seem to set the height to a static 150px
        $('#' + this.matrixCanvasId).attr('width', dimensions.width);
        $('#' + this.matrixCanvasId).attr('height', dimensions.height * 0.85);
        $('#' + this.matrixCanvasId).attr('style', `display: block; width: ${dimensions.width}, height : ${dimensions.height * 0.85}`);
        this.graphWindow.show();
    }

    getViewersInfo(viewername) {
        return this.viewersInfo[viewername];
    }

    /**
     * Updates this.viewersInfo with the dictionary 'info'. Note that this function is meant to be called from update() and info is expected to be 'options'.
     * This function will coalesce the various parameters contained in that dictionary into a single dictionary. 
     * 
     * @param {String} viewername - Name of the viewer to update the info for, e.g. 'viewer', 'matrix', 'viewer2'
     * @param {Object} options - Input dictionary passed to update().
     */
    updateViewerInfo(viewername, options) {
        let inputinfo = options.inputinfo;
        let viewerInfo = {};

        for (let key in Object.keys(inputinfo)) {
            viewerInfo[key] = inputinfo[key];
        } 
        viewerInfo.name = inputinfo.savename ? inputinfo.savename : (inputinfo.name ? inputinfo.name : null);
        
        this.viewersInfo[viewername] = viewerInfo;
    }
    
    /**
     * Handler function for the 'loadTransform' event dispatched by the 'Load Transform' button in bisweb_mainviewerapplication. 
     * Loads a transform from disk and uploads it to the database. 
     */
    handleLoadTransformEvent() {
        //body of parent element used to display the alert created by webutil.createAlert
        let body = $('body');
        const self=this;
        let fileMenuButton = webutil.createhiddeninputfile('.matr, .grd', (f) => {
            //  instead call  BisTransformationUtil.loadTransformation and then resolve(obj)  -> transform=obj.data
            transformationutil.loadTransformation(f).then( (obj) => {
                self.currentTransform = this.database.makeItemAndAdd(obj.filename, obj.data, 'transform');
                webutil.createAlert(`Created transform ${f.name} and updated current transform`, false, body);
            });
        }, false);

        fileMenuButton.click();

    }

    /** create menu items  
     * @param {Menu} menu - menu to add entries to 
     */
    createMenuItems(menu) {

        super.createMenuItems(menu);

        // --------------------------------------------------------------------------------
        // Load Transform
        // --------------------------------------------------------------------------------
        // dispatches an event that gets picked up by bisweb_algorithmcontroller, if one is present in the document
        const self=this;
        webutil.createMenuItem(menu, '');
        webutil.createMenuItem(menu, 'Load Transformation',
                               function (f) {
                                   self.handleLoadTransformEvent(f);
                               });
        
        let displayModalEvent = new CustomEvent('displayInputModal');
        webutil.createMenuItem(menu, 'View Data Store', () => {
            document.dispatchEvent(displayModalEvent);
        });
        webutil.createMenuItem(menu, '');
    }
}


webutil.defineElement('bisweb-algorithmcontrollerelement', AlgorithmControllerElement);

