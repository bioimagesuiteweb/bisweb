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
 
/*global document, HTMLElement */ 
"use strict";

const $ = require('jquery');
const webutil = require('bis_webutil.js');
const d3 = require('d3'); // jshint ignore:line
const io = require('bis_genericio.js');
const BiswebImage = require('bisweb_image.js');
const jstree = require('jstree');
const wsutil = require('../../fileserver/wsutil.js');

/**
 * Tree viewer is an HTML Element designed to display inputs in a hierarchical fashion based on their relationship to each other.
 * 
 * For example, a given image set may contain one image (a 'root' image) from which all the other images are derived. 
 * The 'root' image will be displayed at the top of the tree with the others below it.
 */
class TreeViewer extends HTMLElement {
    constructor() {
        super();

        this.networkDivId = webutil.getuniqueid();
        this.svgWidth = 858;
        this.svgHeight = 700;

        this.horizontalNodeSpacing = 15;
        this.verticalNodeSpacing = 100;

        this.nodeRadius = 15;
        this.modalFrame = webutil.createmodal('Hierarchy Tree', 'modal-lg');

        this.defaultViewer = 'viewer1';

        this.network = [
            {
                'id': webutil.getuniqueid(),
                'class': 'root',
                'name': 'Base Image',
                'networkName': 'Base Image',
                'children': [
                    {
                        'id': webutil.getuniqueid(),
                        'name': 'Smoothed Image',
                        'class': 'child'
                    },
                    {
                        'id': webutil.getuniqueid(),
                        'class': 'child',
                        'name': 'Thresholded Image',
                        'children': [
                            {
                                'id': webutil.getuniqueid(),
                                'name': 'Tresholded Normalized Image',
                                'class': 'child',
                                'children': [
                                    {
                                        'id': webutil.getuniqueid(),
                                        'name': 'Thresholded Normalized Resliced Image',
                                        'class': 'child'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        'id': webutil.getuniqueid(),
                        'name': 'Registered Image',
                        'class': 'child'
                    }
                ]
            },
            {
                'id': webutil.getuniqueid(),
                'class': 'root',
                'name': 'No Children',
                'networkName': 'No Children'
            }
        ];

        this.flattenedNetwork = this.makeFlattenedNetwork();
        this.currentTreeRoot = this.flattenedNetwork[0];
        this.currentNode = null;

        //add buttons to bottom bar
        let beginTreeButton = webutil.createbutton({ 'name': 'Begin New Tree', 'type': 'success' });
        let deleteTreeButton = webutil.createbutton({ 'name': 'Delete Tree', 'type': 'warning' });
        let importTreeButton = webutil.createbutton({ 'name' : 'Import Tree', 'type': 'info' });
        let exportTreeButton = webutil.createbutton({ 'name' : 'Export Tree', 'type': 'primary' });

        beginTreeButton.on('click', (e) => {
            e.preventDefault();
            this.createNewTree();
        });

        deleteTreeButton.on('click', (e) => {
            e.preventDefault();
            this.deleteTree();
        });

        importTreeButton.on('click', (e) => {
            e.preventDefault();
            this.loadNetworkFromFile();
        });

        exportTreeButton.on('click', (e) => {
            e.preventDefault();
            this.writeNetworkToFile();
        });

        //remove 'close' button
        $(this.modalFrame.footer).find('.btn').remove();

        let buttonGroup = $(`<br><div class="btn-group" role="group" aria-label="Viewer Buttons" style="float: right"></div>`);
        buttonGroup.append(beginTreeButton);
        buttonGroup.append(deleteTreeButton);
        buttonGroup.append(importTreeButton);
        buttonGroup.append(exportTreeButton);
        this.modalFrame.footer.append(buttonGroup);

        //delete network when modal is closed
        $(this.modalFrame.dialog).on('hidden.bs.modal', () => {
            //remove all content from the frame and nullify the flattened network
            this.modalFrame.body.empty();
            this.flattenedNetwork = null;
        });

        //bind events dispatched from execute and undo functions of modules
        document.addEventListener('updateTree', (e) => {
            this.addNode(e.detail);
        });

        document.addEventListener('undoTree', () => {
            this.undoNode();
        });

        console.log('jstree', jstree);

    }

    /**
     * Attaches the algorithm controller to the tree viewer and attaches the event to place the tree viewer's menu in the shared menubar once the main viewer renders.
     */
    connectedCallback() {

        let algorithmControllerID = this.getAttribute('bis-algorithmcontrollerid');
        this.algorithmcontroller = document.querySelector(algorithmControllerID);

        webutil.runAfterAllLoaded( () => {
            let menuBarID = this.getAttribute('bis-menubarid');
            let menuBar = document.querySelector(menuBarID).getMenuBar();

            if (menuBar) {
                let treeMenu = webutil.createTopMenuBarMenu('Tree', menuBar);
                webutil.createMenuItem(treeMenu, 'View Tree', () => {
                    this.showViewer();
                });
            }
        });
    }

    /**
     * Creates the tabs and buttons in the tree viewer modal corresponding to each tree. Uses this.flattenedNetwork to determine how many tabs to render.
     */
    createTabs() {
        let that = this;
        //-----------------------------------------------------------------------------------
        // Set actions for buttons attached to viewInputsModal and create button group
        //-----------------------------------------------------------------------------------
        let createTabButtonBar = function () {
            let barTemplate = `<div class="btn-group" role="group" aria-label="Viewer Buttons" style="float: right"></div>`;
            let bar = $(barTemplate);

            let viewInputButton = webutil.createbutton({ 'name': 'View', 'type': 'success' });
            let deleteInputButton = webutil.createbutton({ 'name': 'Delete', 'type': 'warning' });
            let renameInputButton = webutil.createbutton({ 'name': 'Rename', 'type': 'primary' });

            let getActiveNode = () => {
                let activePane = that.modalFrame.body.find('.tab-pane.active');
                let activeNode = activePane.find('.active');
                return activeNode[0];
            };

            viewInputButton.on('click', (e) => {
                e.preventDefault();
                let selectedNode = getActiveNode();
                console.log('selectedNode', selectedNode);
                that.displayNode(selectedNode.id);
            });

            deleteInputButton.on('click', (e) => {
                e.preventDefault();

                let selectedNode = getActiveNode();
                that.deleteNode(selectedNode.id);
            });

            renameInputButton.on('click', (e) => {
                e.preventDefault();
                webutil.createRenameInputModal( (obj) => {
                    if (obj.name) {
                        let activeElement = getActiveNode();
                        that.renameInput(activeElement, obj.name);
                    }
                });
            });

            bar.append(viewInputButton);
            bar.append(deleteInputButton);
            bar.append(renameInputButton);

            return bar;
        };

        let modalHTML =
            `<div class="container-fluid">
            <ul class="nav nav-tabs"></ul>

            <div class="tab-content"></div>
        </div>
        `;

        //see if a container exists already
        let modal = this.modalFrame.body.find('.container, .container-fluid');
        if (this.modalFrame.body.find('.container, .container-fluid').length === 0)
            modal = $(modalHTML);

        for (let tree of this.flattenedNetwork) {
            let contentPanes = this.modalFrame.body.find('.tab-pane');
            let tabExists = false;

            //see if tab already exists
            for (let pane of contentPanes) {
                if ($(pane).attr('id') === tree[0].id) { tabExists = true; break; }
            }

            if (!tabExists) {
                //root is always the first item in a flattened tree
                let tab = $(`<li><a data-toggle='tab' href="#${tree[0].id}">${tree[0].networkName}</a></li>`);

                let tabID = tree[0].id + 'contentpane';
                let tabHTML =
                    `<div id="${tree[0].id}" class="tab-pane fade">
                    <h3>${tree[0].networkName}</h3>
                    <div id=${tabID}>
                        <svg class='svg' style='width: 100%; height: ${this.svgHeight}px'></svg>
                    </div>
                </div>`;

                let tabBody = $(tabHTML);

                let bar = createTabButtonBar();
                tabBody.append(bar);


                //bind rename tab action to double clicking on the tab
                tab.on('dblclick', () => {
                    webutil.createRenameInputModal((obj) => {
                        console.log(tab.find('a'));

                        //rename the tab and the name that displays in the content pane
                        tab.find('a').text(obj.name);
                        tabBody.find('h3').text(obj.name);
                        tree[0].networkName = obj.name;
                    });
                });


                $(modal).find('.nav-tabs').append(tab);
                $(modal).find('.tab-content').append(tabBody);
            }

        }

        this.modalFrame.body.append(modal);
    }

    /**
     * Recreates the flattened network and calls createTabs. Uses d3 to join the data in flattenedNetwork to the svg.
     * 
     * @param {Boolean} redrawNetwork - Whether the flattened network should be regenerated. Note that flattened network will also be regenerated if none exists.
     */
    drawNetwork(redrawNetwork = false) {
        /* jshint ignore: start */
        if (redrawNetwork || !this.flattenedNetwork) { 
            this.flattenedNetwork = this.makeFlattenedNetwork();
        }

        //create bootstrap tabs and content panes that svgs live in
        this.createTabs();
        let that = this;

        for (let i = 0; i < this.flattenedNetwork.length; i++) {
            let tree = this.flattenedNetwork[i];

            //id of pane is id of root node + 'contentpane', svgs are tagged '.svg'
            let tabID = '#' + tree[0].id + 'contentpane';
            let pane = d3.select(tabID).select('.svg');

            let data = pane.selectAll('g')
                .data(tree, function(d) { });

            data.exit().remove();
            let graphic = data.enter().append('g');
            
            graphic.append('line')
                    .attr('x1', function(d) { return d.position.x; })
                    .attr('y1', function(d) { return d.position.y; })
                    .attr('x2', function(d) { return d.parent ? d.parent.position.x : -1; })
                    .attr('y2', function(d) { return d.parent ? d.parent.position.y : -1; })
                    .attr('stroke', 'black')
                    .attr('stroke-width', function (d) { return d.parent ? 1 : 0; });

            graphic.append('circle')
                    .attr('r', this.nodeRadius)
                    .attr('cx', function(d) { return d.position.x; })
                    .attr('cy', function(d) { return d.position.y; })
                    .attr('class', function (d) { return d.class; })
                    .attr('stroke', 'black')
                    .attr('stroke-width', 1)
                    .attr('id', function(d) { return d.id; })
                    .on('click', function(d) {
                        let elem = d3.select(this);
                        let elemClass = elem.attr('class');
                        if (elemClass && elemClass.includes('active')) {
                            elem.attr('class', d.class);
                        } else {
                            elem.attr('class', 'active');
                        }
                    })
                    .on('dblclick', function (d) {
                        console.log('node', d);
                        that.displayNode(d.id);
                    });
            
            let radius = this.nodeRadius;
            graphic.append('text')
                    .attr('x', function(d) { return d.position.x; })
                    .attr('y', function(d) { return d.position.y; })
                    .attr('dx', function() { return radius + 3; })
                    .attr('dy', -5)
                    .text(function (d) { return d.name; });
        }
        /* jshint ignore: end */ 
    }

    /**
     * Calls drawNetwork and displays the tree viewer modal. 
     */
    showViewer() {
        this.drawNetwork();
        this.modalFrame.dialog.modal('show');
    }

    /**
     * Creates the dictionary entry (i.e. the entry in this.network) for a new node.
     * @param {String} name - The name that the node will display
     * @param {String} id - The unique identifier for the node. Expected to be an identifier created by webutil.getuniqueid
     * @param {Object} data - A representation for a given input, e.g. the binary data for an image.
     * @param {Object} parent - The node's parent in the tree. Optional
     * @param {Object} children - The node's children in the tree. Optional
     */
    createNode(name, id, data, parent = null, children = null) {
        return {
            'id': id,
            'name': name,
            'class': parent ? 'root' : 'child',
            'data': data,
            'children': children,
            'parent': parent
        };
    }

    /**
     * Creates the data representation for a new tree in the tree viewer, pushes it to this.network, and calls drawNetwork.
     * @param {String} name - The name the tab corresponding to the new tree will display.
     */
    createNewTree(name = 'New Tree') {
        let currentImage = this.algorithmcontroller.getImage(this.defaultViewer, 'image');
        console.log('image', currentImage);

        //create new database entry for beginning of tree. networkName is the name that displays on the tab in the modal
        let newRoot = this.createNode(name, webutil.getuniqueid(), currentImage);
        newRoot.networkName = name;

        this.network.push(newRoot);

        this.setCurrentNode(this.network[this.network.length-1]);
        this.drawNetwork(true);
    }

    /**
     * Deletes the tree and HTML elements corresponding to the currently active tab in the tree viewer and recreates this.flattenedNetwork.
     */
    deleteTree() {
        let activePane = $(this.modalFrame.body).find('.tab-pane.active');
        let activeTab = $(this.modalFrame.body).find('li.active');

        let rootID = activePane.attr('id');
        for (let i = 0; i < this.network.length; i++) {
            if (this.network[i].id === rootID) { 
                this.network.splice(i, 1);

                //regenerate flattened network without the spliced tree
                this.flattenedNetwork = this.makeFlattenedNetwork();
            }
        }

        activePane.remove();
        activeTab.remove();
    }

    /**
     * Displays a given node using the default viewer of the algorithm controller. 
     * 
     * @param {String} id - ID of the node to display
     */
    displayNode(id) {
        let node = this.findNode(id).node;
        console.log('find node', node);
        if (node && node.data) {
            let type = node.data.jsonformatname;
            if (type === 'BisImage') {
                this.algorithmcontroller.sendImageToViewer(node.data, { viewername : this.defaultViewer });
                
                //using new format of simplealgorithmcontroller...
                /*this.algorithmcontroller.update(dict.data, 'image', {
                    'viewername': 'image',
                    'viewersource': 'image',
                    'colortype': 'Auto',
                    'autosave': false,
                    'existingItemId': dict.id,
                    'inputinfo': null
                }).catch((e) => { console.log('no image with id', dict.id, 'in database, cannot update') })
                */

            } else if (type === 'matrix') {
                console.log('Display matrix to come...');
            } else if (type === 'transform') {
                this.algorithmcontroller.currentTransformation = node.data;
                webutil.createAlert('Updated current transform', false);
            } else {
                console.log('Trying to display input with unrecognized type', type);
            }
        }

        this.setCurrentNode(node);
    }

    /**
     * Takes the network of nested nodes and creates an array with one entry per node, flattening it. 
     * Entries with children have their children expanded into separate entries with appropriate 'parent' references.  
     * 
     * Also calculates the where each node should go in the svg pane.
     */
    makeFlattenedNetwork() {
        let that = this;
        let trees = [];
        //used to find where node should be placed on the svg
        let nodesAddedOnCurrentLevel, currentLevel, currentParent, nodesAddedtoParent;

        //number of root nodes equals the number of unexpanded nodes in the original network
        for (let root of this.network) { root.siblings = this.network.length; trees.push([root]); }

        for (let j = 0; j < trees.length; j++) {
            for (let i = 0; i < trees[j].length; i++) {
                let tree = trees[j];
                let node = tree[i];

                //if the node doesn't have a level assigned it's the top of the tree
                node.level = node.level ? node.level : 0;

                if (node.children) {
                    for (let child of node.children) {
                        child.parent = node;

                        //if the node doesn't have a level assigned it's one level deep, otherwise it's one level deeper than its parent
                        child.level = node.level ? node.level + 1 : 1;
                        child.siblings = node.children.length;
                    }
                    trees[j] = tree.concat(node.children);
                }
            }

            //calculate where node should be placed in svg for each node
            /*jshint ignore: start*/
            nodesAddedOnCurrentLevel = 0, currentLevel = 0, currentParent = null, nodesAddedtoParent = 0;
            /*jshint ignore: end*/
            for (let node of trees[j]) { 
                let boundFind = findNodeLocation.bind(this); 
                boundFind(node); 
            }
        }

        //Calculates the position for a node based on how many nodes are in the same row and where its parent node is rendered
        function findNodeLocation(node) {

            let horizontalPosition;

            if ((node.level !== currentLevel)) { nodesAddedOnCurrentLevel = 0; currentLevel = currentLevel + 1; }
            if (node.parent && (node.parent.id !== currentParent)) { currentParent = node.parent.id; nodesAddedtoParent = 0; }

            //root node goes in the middle of the page
            if (!node.parent) {
                let spacing = that.svgWidth;
                horizontalPosition = spacing / 2;
                node.bounds = [spacing * 0.25, spacing * 0.75];
            } else {
                //each node has the amount of space its parent had divided among its siblings
                let spacing = node.parent.bounds[1] - node.parent.bounds[0];

                if (node.siblings === 1) { horizontalPosition = node.parent.position.x; }
                else { horizontalPosition = node.parent.bounds[0] + (nodesAddedtoParent * spacing) / (node.siblings - 1); }

                node.bounds = [horizontalPosition - spacing / 4, horizontalPosition + spacing / 4];
            }

            nodesAddedtoParent = nodesAddedtoParent + 1;
            nodesAddedOnCurrentLevel = nodesAddedOnCurrentLevel + 1;
            node.position = { x: horizontalPosition, y: currentLevel * this.verticalNodeSpacing + this.nodeRadius + 5 }; //jshint ignore:line

            return node.position;
        }

        return trees;
    }

    /**
     * Sets the current node to be the given node. The current node will have outputs generated by modules appended as its children (see bisweb_custommodule). 
     * @param {Object} node 
     */
    setCurrentNode(node) {
        this.currentNode = node;
    }

    /**
     * Adds a new node to the network by appending it as a child to this.currentNode.
     * 
     * @param {BiswebDataObject} obj - Output produced from module.execute
     */
    addNode(obj) {
        if (this.currentNode) {
            console.log('data', obj);
            let filename = obj.filename || undefined;
            let id = obj.id || webutil.getuniqueid();
            let node = this.createNode(filename, id, obj);

            if (!this.currentNode.children) { this.currentNode.children = []; }
            this.currentNode.children.push(node);

            this.setCurrentNode(node);
        }
    }

    undoNode() {
        let id = this.currentNode.id;
        console.log('currentNode', this.currentNode);

        this.currentNode = this.deleteNode(id);
    }

    /**
     * Deletes a node selected on the active pane of the tree viewer, removing it from the svg, this.network, and this.flattenedNetwork. 
     * If the node has children its children are deleted as well.
     * @param {Object,String} node - Node to delete. May be either an id of a node or the node itself
     * @return {Object} Parent of deleted node.
     */
    deleteNode(node) {

        //if node is a string it should be an id that can be searched for directly, otherwise it's assumed that node is an object with an id field
        let foundNode;
        if (typeof node === 'string')
            foundNode = this.findNode(node);
        else 
            foundNode = this.findNode(node.id);

        console.log('foundNode', foundNode);
        //if the root node is being deleted just call delete tree
        if (!foundNode.parent) {
            let popup = webutil.createPopupModal('Delete tree?', 'Deleting the root node will delete the whole tree. Are you sure you want to continue?');
            console.log('modal', popup);
            popup.confirmButton.on('click', () => {
                this.deleteTree();
                popup.modal.dialog.modal('hide');
            });

            popup.cancelButton.on('click', () => {
                popup.modal.dialog.modal('hide');
            });

            popup.modal.dialog.modal('show');
            return;
        }

        //remove entry from base network by unrooting it from its parent node
        for (let i = 0; i < foundNode.parent.children.length; i++) { 
            if (foundNode.parent.children[i].id === foundNode.node.id) { 
                foundNode.parent.children.splice(i,1); 
                break;
            }
        }

        let deleteList = [foundNode.node.id];
        //need to delete each node from the flattened network manually
        if (foundNode.node.children) {

            //search through the children of each node to see if they have children. if they do search the children and flag them too.
            let findChildren = function(childList) {
                if (!childList) return;

                for (let child of childList) {
                    deleteList.push(child.id);
                    findChildren(child.children);
                }
            }

            findChildren(foundNode.node.children);
        }

        console.log('delete list', deleteList);
        //flattened network may not necessarily exist when nodes are being deleted from the network
        if (this.flattenedNetwork) {
            for (let i = 0; i < this.flattenedNetwork[foundNode.tree].length; i++) {
                for (let j = 0; j < deleteList.length; j++) {
                    if (this.flattenedNetwork[foundNode.tree][i].id === deleteList[j]) {
                        this.flattenedNetwork[foundNode.tree].splice(i, 1);
                        deleteList.splice(j,1);
                        i--; //splice shortens array so have to stay in-place to avoid skipping
                        break;
                    }
                }
            }
        }

        this.drawNetwork();
        return foundNode.parent;
    }



    /**
     * Pops up a modal dialog prompting a user for a new name for the currently selected node in the active pane of the tree viewer. 
     * 
     * Invokes but does not return a promise.
     * @param {HTMLElement<g>} node - The graphics object representing a node on the svg (contains an 'id' property corresponding to its id in this.network) 
     * @param {String} name - The new name for the element. 
     */
    renameInput(node, name) {
        let entry = this.findNodeInFlatNetwork(node.id);
        if (entry) { 
            entry.name = name; 
            this.drawNetwork();
        }
        console.log('network', this.network);
    }

    /**
     * Finds a node in this.network given an id by recursively searching each tree. 
     * 
     * @param {String} id - ID of the node to search for
     * @returns {Object} Node with the given ID in this.network. 
     */
    findNode(id) {
        let foundNode = null, i = 0;

        let findNodeInSubtree = function(node, parent = null, tree = null) {
            if (!node || foundNode) { return; }
            else if (node.id === id) { foundNode = { 'node' : node, 'parent' : parent, 'tree' : tree } ; return; }

            if (node.children) {
                for (let child of node.children) {
                    findNodeInSubtree(child, node, tree);
                }
            }
        };

        while (!foundNode && i < this.network.length) {
            findNodeInSubtree(this.network[i], null, i);
            i++;
        }

        return foundNode;
    }

    /**
     * Finds a node in this.flattenedNetwork and returns it.
     * @param {String} id - ID of the node to search for
     * @returns {Object} - Node with the given ID in this.flattenedNetwork.
     */
    findNodeInFlatNetwork(id) {
        for (let i = 0; i < this.flattenedNetwork.length; i++) {
            for (let node of this.flattenedNetwork[i]) {
                if (node.id === id) { return node; } 
            }
        }
        return null;
    }

    loadNetworkFromFile() {
        let existingNetwork = this.network;
        let hiddenFileButton = webutil.createhiddeninputfile('.txt', (file) => {
            io.read(file).then( (text) => {
                console.log('text', text);
                try {
                    let newNetwork = JSON.parse(text.data).network;

                    //recursive function that will replace the id of a given node then call itself on all the node's children
                    let parseNode = (node) => {
                        node.id = webutil.getuniqueid();
                        if (node.data) {
                            let newData = new BiswebImage();
                            newData.parseFromJSON(node.data);
                            node.data = newData;
                        }
                        if (node.children) {
                            for (let child of node.children)
                                parseNode(child);
                        }
                    }

                    for (let tree of newNetwork) {
                        //replace 'id' field with a new value to ensure internal consistency.
                        parseNode(tree);
                        tree.networkName = tree.networkName ? tree.networkName : 'New Tree';
                        existingNetwork.push(tree);
                    }

                    this.drawNetwork(true);
                } catch (err) {
                    console.log('an error occured when parsing the file', err);
                }
            }); 
        }, false);

        hiddenFileButton.click();

        //BiswebDataObjects are loaded in a slightly nonstandard way here -- the dictionary is parsed by JSON.parse immediately after reader.onload,
        //so all you have to do is assign the keys of the object to properties of a new BiswebDataObject
        function assignDictionaryToObject(dict, obj) {
            for (let key of Object.keys(dict)) {
                obj[key] = dict[key];
            }
        }
    }

    writeNetworkToFile() {
        //create a new network identical to this.network and save it to disk
        let saveNetwork = [];

        //removes extraneous fields from node and serializes the node's data, if it has any.
        let sanitizeNode = (node) => {

            //object destructuring literals inside an anonymous function, applied immediately.
            //https://stackoverflow.com/questions/17781472/how-to-get-a-subset-of-a-javascript-objects-properties?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
            let newNode = ( ({ name, class: objclass, children, data }) => ( {name, class: objclass, children, data}))(node);
            console.log('newNode', newNode);
            if (newNode.data) {
                newNode.data = newNode.data.serializeToJSON();
            }

            if (newNode.children) {
                for (let i = 0; i < newNode.children.length; i++) {
                    newNode.children[i] = sanitizeNode(newNode.children[i]);
                }
            }

            return newNode;
        };

        for (let tree of this.network) {
            let newRoot = sanitizeNode(tree);
            newRoot.networkName = tree.networkName;

            saveNetwork.push(newRoot);
        }

        let saveObj = { 'network' : saveNetwork};
        let outstring = JSON.stringify(saveObj);
        
        let currentTime = new Date().toJSON().slice(0,10);
        io.write('Tree saved on ' + currentTime, outstring);
    }
}

webutil.defineElement('bisweb-treeviewer', TreeViewer);