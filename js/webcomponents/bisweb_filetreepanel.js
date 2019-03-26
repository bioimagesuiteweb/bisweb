const $ = require('jquery');
const bootbox = require('bootbox');
const bisweb_panel = require('bisweb_panel.js');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const util=require('bis_util');
const bis_genericio = require('bis_genericio.js');
const BiswebMatrix = require('bisweb_matrix.js');

require('jstree');
require('bootstrap-slider');

/**
 * <bisweb-treepanel
 *  bis-layoutwidgetid = '#viewer_layout'
 *  bis-viewerid = '#orthoviewer'>
 * </bisweb-treepanel>
 *  
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-viewerid2 : the second orthagonal viewer to draw in. Optional.
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class FileTreePanel extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {

        this.viewerid = this.getAttribute('bis-viewerid');
        this.viewertwoid = this.getAttribute('bis-viewerid2');
        this.layoutid = this.getAttribute('bis-layoutwidgetid');
        this.viewerappid = this.getAttribute('bis-viewerapplicationid');
        this.graphelementid = this.getAttribute('bis-graphelement');
        this.painttoolid = this.getAttribute('bis-painttool');

        bis_webutil.runAfterAllLoaded(() => {

            this.viewer = document.querySelector(this.viewerid);
            this.viewertwo = document.querySelector(this.viewertwoid) || null;
            this.layout = document.querySelector(this.layoutid);
            this.viewerapplication = document.querySelector(this.viewerappid);
            this.graphelement = document.querySelector(this.graphelementid);
            this.painttool = document.querySelector(this.painttoolid) || null;
            this.popoverDisplayed = false;
            this.staticTagSelectMenu = null;

            this.panel = new bisweb_panel(this.layout, {
                name: 'File Tree Panel',
                permanent: false,
                width: '400',
                dual: true,
                mode: 'sidebar',
            });


            let listElement = this.panel.getWidget();
            let biswebElementMenu = $(`<div class='bisweb-elements-menu'></div>`);
            biswebElementMenu.css({'margin-top' : '15px'});
            
            let listContainer = $(`<div class='file-container biswebpanel2'></div>`);
            listContainer.css({ 'height' : '100px', 'width': '100%' });
            listElement.append(listContainer);
            listElement.append($('<HR>'));

            
            listElement.append(biswebElementMenu);
            this.makeStaticButtons(listElement);

            //https://stackoverflow.com/questions/11703093/how-to-dismiss-a-twitter-bootstrap-popover-by-clicking-outside
            let dismissPopoverFn = (e) => {
                if (typeof $(e.target).data('original-title') == 'undefined' && !$(e.target).parents().is('.popover.in')) {
                    if (this.popoverDisplayed) {
                        $('[data-original-title]').popover('hide');
                        this.popoverDisplayed = false;
                    }
                }
            };

            $('html').on('click', dismissPopoverFn);
            $('html').on('contextmenu', dismissPopoverFn);
        });

        this.contextMenuDefaultSettings = {
            'Info': {
                'separator_before': false,
                'separator_after': false,
                'label': 'File Info',
                'action': () => {
                    this.showInfoModal();
                }
            },
            'Load': {
                'separator_before': false,
                'separator_after': false,
                'label': 'Load Image',
                'action': () => {
                    this.loadImageFromTree();
                }
            },
            'Tag': {
                'separator_before': false,
                'separator_after': false,
                'label': 'Set Tag',
                'action': (node) => {
                    this.openTagSettingPopover(node);
                }
            }
        };
    }

    /**
     * Shows file tree panel in the sidebar.
     */
    showTreePanel() {
        this.panel.show();
    }

    importFilesFromDirectory(filename) {

        //filter filename before calling getMatchingFiles
        let queryString = filename;
        if (queryString === '') {
            queryString = '*/*.nii*';
        } else {
            if (queryString[queryString.length - 1] === '/') {
                queryString = queryString.slice(0, filename.length - 1) + '/*/*.nii*';
            } else {
                queryString = filename + '/*/*.nii*';
            }
        }

        readParamsFile(filename).then((data) => {

            let type = data.acquisition || data.bisformat || 'Unknown type';

            bis_genericio.getMatchingFiles(queryString).then((files) => {

                if (files.length > 0) {
                    this.updateFileTree(files, filename, type);
                    bis_webutil.createAlert('Loaded study from ' + filename, false, 0, 3000);
                    return;
                }

                queryString = filename + '/*.nii*';
                bis_genericio.getMatchingFiles(queryString).then( (newfiles) => {

                    if (newfiles.length > 0) { 
                        console.log('new files', newfiles);
                        this.updateFileTree(newfiles, filename, type);
                        bis_webutil.createAlert('Loaded study from ' + filename, false, 0, 3000);
                        return;
                    } else {
                        bis_webutil.createAlert('Could not find nifti files in ' + filename + ' or any of the folders it contains. Are you sure this is the directory?');
                    }
                });
            });
        });
    }

    importFilesFromJSON(filename) {
        bis_genericio.read(filename).then((obj) => {
            let jsonData = obj.data, parsedData;
            try {
                parsedData = JSON.parse(jsonData);
            } catch (e) {
                console.log('An error occured trying to parse the exported study file', filename, e);
            }

            let type = parsedData.type || parsedData.acquisition || parsedData.bisformat || 'Unknown type';
            this.updateFileTree(parsedData.contents, parsedData.baseDirectory, type);
        });
    }

    /**
     * Populates the file tree panel with a list of files.
     * @param {Array} files - A list of file names, or a fully parsed tree. 
     * @param {String} baseDirectory - The directory which importFiles was originally called on.
     * @param {String} type - The type of study being loaded.
     */
    updateFileTree(files, baseDirectory, type) {

        if (bis_genericio.getPathSeparator() === '\\') 
            baseDirectory= util.filenameWindowsToUnix(baseDirectory);
        
        let parseFileList = (files) => {
            let fileTree = [];

            for (let file of files) {
                //trim the common directory name from the filtered out name
                if (bis_genericio.getPathSeparator() === '\\') 
                    file= util.filenameWindowsToUnix(file);

                let trimmedName = file.replace(baseDirectory, '');
                let splitName = trimmedName.split('/');
                if (splitName[0]==='') 
                    splitName.shift();

                let index = 0, currentDirectory = fileTree, nextDirectory = null;

                //find the entry in file tree
                while (index < splitName.length) {

                    nextDirectory = findParentAtTreeLevel(splitName[index], currentDirectory);

                    //if the next directory doesn't exist, create it, otherwise return it.
                    if (!nextDirectory) {

                        //type will be file if the current name is at the end of the name (after all the slashes), directory otherwise
                        let newEntry = {
                            'text': splitName[index]
                        };

                        if (index === splitName.length - 1) {
                            let splitEntry = newEntry.text.split('.');
                            if (splitEntry[splitEntry.length - 1] === 'gz' || splitEntry[splitEntry.length - 1] === 'nii')
                                newEntry.type = 'picture';
                            else
                                newEntry.type = 'file';
                        } else {
                            newEntry.type = 'directory';
                            newEntry.children = [];
                        }

                        currentDirectory.push(newEntry);
                        currentDirectory = newEntry.children;
                    } else {
                        currentDirectory = nextDirectory;
                    }

                    index = index + 1;
                }
            }


            //if the file tree is empty, display an error message and return
            if (fileTree.length === 0) {
                bis_webutil.createAlert('No study files could be found in the chosen directory, try a different directory.', false);
                return;
            }

            //some data sources produce trees where the files are contained in an empty directory, so unwrap those if necessary.
            if (fileTree.length === 1 && fileTree[0].text === '') {
                fileTree = fileTree[0].children;
            }

            return fileTree;

            //Searches for the directory that should contain a file given the file's path, e.g. 'a/b/c' should be contained in folders a and b.
            //Returns the children 
            function findParentAtTreeLevel(name, entries) {
                for (let entry of entries) {
                    if (entry.text === name) {
                        return entry.children;
                    }
                }

                return null;
            }

        };

        this.baseDirectory = baseDirectory;
        this.studyType = type;

        let fileTree;

        //check what type of list this is, a list of names or a fully parsed directory
        if (typeof files[0] === 'string') {
            fileTree = parseFileList(files);
        } else {
            fileTree = files;
        }

        let listElement = this.panel.getWidget();
        listElement.find('.file-container').remove();

        let listContainer = $(`<div class='file-container'></div>`);
        //listContainer.css({ 'color': 'rgb(12, 227, 172)' });
        listElement.prepend(listContainer);

        let tree = listContainer.jstree({
            'core': {
                'data': fileTree,
                'dblclick_toggle': true,
                'check_callback': true
            },
            'types': {
                'default': {
                    'icon': 'glyphicon glyphicon-file'
                },
                'file': {
                    'icon': 'glyphicon glyphicon-file'
                },
                'root': {
                    'icon': 'glyphicon glyphicon-home'
                },
                'directory': {
                    'icon': 'glyphicon glyphicon-folder-close'
                },
                'picture': {
                    'icon': 'glyphicon glyphicon-picture'
                },
            },
            'plugins': ["types", "dnd", "contextmenu"],
            'contextmenu': {
                'show_at_node': false,
                'items': this.contextMenuDefaultSettings
            }
        }).bind('move_node.jstree', (e, data) => {
            let moveNodes = this.parseSourceAndDestination(data);
            bis_genericio.moveDirectory(moveNodes.src + '&&' + moveNodes.dest);
        });

        let newSettings = this.contextMenuDefaultSettings;

        //add viewer one and viewer two options to pages with multiple viewers
        if (this.viewertwo) {
            delete newSettings.Load;

            //console.log('new settings', newSettings);
            newSettings = Object.assign(newSettings, {
                'Viewer1': {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Load Image to Viewer 1',
                    'action': () => {
                        this.loadImageFromTree(0);
                    }
                },
                'Viewer2': {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Load Image to Viewer 2',
                    'action': () => {
                        this.loadImageFromTree(1);
                    }
                }
            });
        }

        tree.jstree(true).settings.contextmenu.items = newSettings;
        tree.jstree(true).redraw(true);

        let enabledButtons = this.panel.widget.find('.bisweb-load-enable');
        enabledButtons.prop('disabled', false);

        if (!this.renderedTagSelectMenu) {

            //create load button and static tag select menu
            let tagSelectDiv = $(`<div></div>`);
            this.staticTagSelectMenu = this.createTagSelectMenu({ 'setDefaultValue': false, 'listenForTagEvents': true });
            tagSelectDiv.append(this.staticTagSelectMenu);

            let elementsDiv = $('.bisweb-elements-menu');

            let loadImageButton = $(`<button type='button' class='btn btn-success btn-sm bisweb-load-enable' disabled>Load image</button>`);
            loadImageButton.on('click', () => {
                this.loadImageFromTree();
            });

            let div=$('<div></div>');
            elementsDiv.append(div);
            let lab=$(`<label>Tag Selected Element:</label>`);
            div.append(lab);
            div.append(tagSelectDiv);
            
            elementsDiv.append(loadImageButton);
            elementsDiv.append(`<br><p class = "bisweb-file-import-label" style="font-size:80%; font-style:italic">Currently loaded — ${type}</p>`);
            elementsDiv.append($(`<label>Tag Selected Element:</label></br>`));
            elementsDiv.append(tagSelectDiv);
            loadImageButton.css({'margin' : '10px'});
            lab.css({'margin-left' : '10px'});
            elementsDiv.append($('<HR>'));
            


            this.renderedTagSelectMenu = true;
        } else {
            $('.bisweb-elements-menu').find('select').prop('disabled', 'disabled');
            $('.bisweb-file-import-label').text(`Currently loaded — ${type}`);
        }

        //attach listeners to new file tree
        this.setOnClickListeners(tree, listContainer);
        this.fileTree = tree;
    }

    /**
     * Makes the buttons that import a study into the files tab and load an image. 
     * 
     * @param {HTMLElement} listElement - The element of the files tab where the buttons should be created.
     */
    makeStaticButtons(listElement) {
        let buttonGroupDisplay = $(`
            <div class='btn-group'>
                <div class='btn-group top-bar' role='group' aria-label='Viewer Buttons' style='float: left;'>
                </div>
                <br>
                <div class='btn-group middle-bar' role='group' aria-label='Viewer Buttons' style='float: left;'>
                </div>
                <br> 
                <div class='btn-group bottom-bar' role='group' aria-label='Viewer Buttons' style='float: left;'>
                </div>
            </div>
        `);
        let topButtonBar = buttonGroupDisplay.find('.top-bar');
        let middleButtonBar = buttonGroupDisplay.find('.middle-bar');
        let bottomButtonBar = buttonGroupDisplay.find('.bottom-bar');


        //Route study load and save through bis_webfileutil file callbacks
        let loadStudyDirectoryButton = bis_webfileutil.createFileButton({
            'type': 'info',
            'name': 'Import study from directory',
            'callback': (f) => {
                this.importFilesFromDirectory(f);
            },
        }, {
            'title': 'Import study from directory',
            'filters': 'DIRECTORY',
            'suffix': 'DIRECTORY',
            'save': false,
            'serveronly' : true,
        });

        //Route study load and save through bis_webfileutil file callbacks
        let loadStudyJSONButton = bis_webfileutil.createFileButton({
            'type': 'primary',
            'name': 'Import study',
            'callback': (f) => {
                this.importFilesFromJSON(f);
            },
        }, {
                'title': 'Import study',
                'filters': [
                    { 'name': 'Study Files', extensions: ['study'] }
                ],
                'suffix': 'study',
                'save': false,
        });

        let saveStudyButton = bis_webfileutil.createFileButton({
            'type': 'info',
            'name': 'Export study',
            'callback': (f) => {
                this.exportStudy(f);
            },
        },
            {
                'title': 'Export study',
                'filters': 'DIRECTORY',
                'suffix': 'DIRECTORY',
                'save': true,
                initialCallback: () => { return this.getDefaultFilename(); },
            });

        let importTaskButton = bis_webfileutil.createFileButton({
                'type' : 'info',
                'name' : 'Import task file',
                'callback' : (f) => {
                        this.loadStudyTaskData(f);
                },
            },
            {
                'title': 'Import task file',
                'filters': [
                    { 'name': 'Task Files', extensions: ['json'] }
                ],
                'suffix': 'json',
                'save': false,
            });

        let clearTaskButton = bis_webutil.createbutton({ 'name' : 'Clear tasks', 'type' : 'primary' });
        clearTaskButton.on('click', () => {
            bootbox.confirm({
                'message' : 'Clear loaded task data?',
                'buttons' : {
                    'confirm' : {
                        'label' : 'Yes',
                        'className' : 'btn-success'
                    },
                    'cancel': {
                        'label' : 'No',
                        'className' : 'btn-danger'
                    }
                },
                'callback' : (result) => {
                    if (result) { this.graphelement.taskdata = null; }
                }
            });
            this.graphelement.taskdata = null;
        });

        let plotTasksButton = bis_webutil.createbutton({ 'name' : 'Plot task charts', 'type' : 'info'});
        plotTasksButton.on('click', () => {
            this.parseTaskImagesFromTree();
        });


        saveStudyButton.addClass('bisweb-load-enable');
        plotTasksButton.addClass('bisweb-load-enable')
        saveStudyButton.prop('disabled', 'true');
        plotTasksButton.prop('disabled', 'true');

        topButtonBar.append(loadStudyDirectoryButton);
        topButtonBar.append(loadStudyJSONButton);
        middleButtonBar.append(importTaskButton);
        middleButtonBar.append(clearTaskButton);
        middleButtonBar.append(saveStudyButton);
        bottomButtonBar.append(plotTasksButton);

        listElement.append(buttonGroupDisplay);
    }

    /**
     * Sets the jstree select events for a new jstree list container. 
     * 
     * @param {HTMLElement} listContainer - The div that contains the jstree object.
     */
    setOnClickListeners(tree, listContainer) {

        let handleLeftClick = (data) => {
            if (data.node.original.type === 'directory') {
                data.instance.open_node(this, false);
                this.currentlySelectedNode = data.node;
            }
            //node is already selected by select_node event handler so nothing to do for selecting a picture
        };


        let handleRightClick = (data) => {
            if (data.node.original.type === 'directory') {
                this.toggleContextMenuLoadButtons(tree, 'off');
            } else {
                this.toggleContextMenuLoadButtons(tree, 'on');
            }
        };

        let handleDblClick = () => {
            if (this.currentlySelectedNode.original.type === 'picture') {
                this.loadImageFromTree();
            }
        };

        listContainer.on('select_node.jstree', (event, data) => {

            $('.bisweb-elements-menu').find('select').prop('disabled', '');
            $('.load-image-button').prop('disabled', '');

            this.currentlySelectedNode = data.node;

            this.changeTagSelectMenu(this.staticTagSelectMenu, data.node);

            if (data.event.type === 'click') {
                handleLeftClick(data);
            } else if (data.event.type === 'contextmenu') {
                handleRightClick(data);
            }
        });

        tree.bind('dblclick.jstree', () => {
            handleDblClick();
        });
    }

    /**
     * Adds jstree contextmenu items depending on what type of data is loaded and which viewer the application is in.
     * 
     * @param {String} type - The type of the data being loaded.
     */
    createContextmenuItems(/*type*/) {
        let newSettings = this.contextMenuDefaultSettings;

        //add viewer one and viewer two options to pages with multiple viewers
        if (this.viewertwo) {
            delete newSettings.Load;

            console.log('new settings', newSettings);
            newSettings = Object.assign(newSettings, {
                'Viewer1': {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Load Image to Viewer 1',
                    'action': () => {
                        this.loadImageFromTree(0);
                    }
                },
                'Viewer2': {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Load Image to Viewer 2',
                    'action': () => {
                        this.loadImageFromTree(1);
                    }
                }
            });
        }

        /*if (type === 'ParavisionJob') {
            newSettings = Object.assign(newSettings, {
                'LoadTask': {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Load Study Task Info',
                    'action': () => {
                        this.loadStudyTaskData();
                    }
                }
            });
        }*/

        return newSettings;
    }

    /**
     * Loads an image selected in the file tree and displays it on the viewer. 
     * 
     * @param {Number} - The number of the viewer to load to. Optional, defaults to viewer one. 
     */
    loadImageFromTree(viewer = 0) {
        let nodeName = this.constructNodeName();
        this.viewerapplication.loadImage(nodeName, viewer);
    }


    /**
     * Loads the data for each task from a file on disk. 
     * Turns a JSON file into an array of 1's and zeroes denoting regions of task and rest.
     * 
     * @param {String} name - The name of the task file.
     */
    loadStudyTaskData(name) {

        let lowRange = -1, highRange = -1, parsedData;
        bis_genericio.read(name, false).then((obj) => {

            //parse raw task data
            try {
                parsedData = JSON.parse(obj.data);
                let runs = Object.keys(parsedData.runs);

                let parsedRuns = {};
                for (let key of runs) {

                    //parse data for each run
                    let tasks = Object.keys(parsedData.runs[key]);
                    for (let task of tasks) {
                        let range = parsedData.runs[key][task];
                        if (!parsedRuns[key]) { parsedRuns[key] = {}; }
                        parsedRuns[key][task] = parseEntry(range);
                    }
                }

                console.log('parsed runs', parsedRuns)
                this.parsedData = parsedRuns;

                //parse ranges into 0 and 1 array
                let parsedRanges = [], labelsArray = [], tasks = [], range;
                for (let run of runs) {
                    console.log('run', run);
                    range = createArray(parsedRuns[run]);
                    parsedRanges.push(range);
                    labelsArray.push(run);
                    tasks.push({ 'data': range, 'label': run, 'regions' :  parsedData.runs[run]});
                }

                console.log('parsedRanges', parsedRanges, labelsArray, tasks);

                //array to designate that all the arrays are meant to be included while formatting data
                let includeArray = new Array(parsedRanges.length).fill(1);
                this.graphelement.formatChartData(parsedRanges, includeArray, labelsArray, false);

                //set the task range for the graph element to use in future images
                this.graphelement.taskdata =  { 'formattedTasks' : tasks, 'rawTasks' : parsedData};
                this.graphelement.createChart({ xaxisLabel: 'frame', yaxisLabel: 'On', isFrameChart : true});
            } catch (e) {
                console.log('An error occured while parsing the task file', e);
            }
        });

        function parseEntry(entry) {

            if (Array.isArray(entry)) {
                let entryArray = [];
                for (let item of entry) 
                    entryArray.push(parseEntry(item));
                
                return entryArray;
            }
            
            let range = entry.split('-');
            for (let i = 0; i < range.length; i++) { range[i] = parseInt(range[i]); }

            if (lowRange < 0 || lowRange > range[0]) { lowRange = range[0]; }
            if (highRange < range[1]) { highRange = range[1]; }

            return range;
        }

        function createArray(run) {
            let taskArray = new Array(highRange).fill(0);
            let keys = Object.keys(run);
            for (let task of keys) {
                if (Array.isArray(run[task][0])) {
                    for (let item of run[task])
                        addToArray(item);
                } else {
                    addToArray(run[task]);
                }
            }

            //take the offset from the front before returning
            taskArray = taskArray.slice(parsedData.offset);
            return taskArray;

            function addToArray(range) {
                for (let i = range[0]; i < range[1]; i++) {
                    taskArray[i] = 1;
                }
            }
        }

    }


    /**
     * Saves a the current list of study files to whichever storage service the user has selected, e.g. the local file system, Amazon AWS, etc.
     * The list will be saved as a .study file with the study files nested the same way as the file tree.
     * 
     * @param {String} filepath - The path to save the file to. 
     */
    exportStudy(filepath) {

        console.log('Filepath=',filepath);        
        
        //reconstruct tree from jstree
        let rawTree = this.fileTree.jstree(true);
        let rawTreeJSON = rawTree.get_json('#');
        let reconstructedTree = [];
        
        //console.log('rawTree', rawTree);
        for (let item of rawTreeJSON) {
            fillTreeNode(rawTree, item, reconstructedTree);
        }
        
        //console.log('reconstructed tree', reconstructedTree);
        console.log('Base Directory', this.baseDirectory,filepath);

        let base=this.baseDirectory;
        if (bis_genericio.getPathSeparator() === '\\') 
            base= util.filenameUnixToWindows(base);
        
        bis_genericio.getFileStats(base).then((stats) => {
            
            let dateCreated = new Date(stats.birthtimeMs);
            let treeMetadataContainer = {
                'baseDirectory': this.baseDirectory,
                'dateCreated': parseDate(dateCreated),
                'contents': reconstructedTree
            };
            
            let stringifiedFiles = JSON.stringify(treeMetadataContainer,null,2);
            //set the correct file extension if it isn't set yet
            let splitPath = filepath.split('.');
            if (splitPath.length < 2 || splitPath[1] !== 'STUDY' || splitPath[1] !== 'study') {
                splitPath[1] = 'study';
            }
            
            filepath = splitPath.join('.');
            bis_genericio.write(filepath, stringifiedFiles, false);
        }).catch( (e) => {
            console.log('an error occured while saving to disk', e);
            bis_webutil.createAlert('An error occured while saving the study files to disk.', false);
        });
    }

    parseTaskImagesFromTree() {
        let tree = this.fileTree;
        console.log('tree', tree);
    }

    /**
     * Parses a move_node event and returns the source and destination of the move. 
     * 
     * @param {Object} data - Data object returned from a move_node.jstree event.
     * @returns Source and destination directory.
     */
    parseSourceAndDestination(data) {
        let srcName, destName;

        let movingNode = $(`#${data.node.id}`);
        let nodeName = movingNode.find(`#${data.node.id}_anchor`).text();

        //id of the base directory will be '#', so if we see that we don't have to resolve it
        console.log('data.old_parent', data.old_parent, 'data.parent', data.parent);
        if (data.old_parent === '#') {
            srcName = this.baseDirectory + '/' + nodeName;
        } else {
            let oldParentNode = $(`#${data.old_parent}`);
            let oldParentName = oldParentNode.find(`#${data.old_parent}_anchor`).text();
            srcName = this.baseDirectory + '/' + oldParentName + '/' + nodeName;
        }

        if (data.parent === '#') {
            destName = this.baseDirectory + '/' + nodeName;
        } else {
            let newParentNode = $(`#${data.parent}`);
            let newParentName = newParentNode.find(`#${data.parent}_anchor`).text();
            destName = this.baseDirectory + '/' + newParentName + '/' + nodeName;
        }

        console.log('srcName', srcName, 'destName', destName);
        return { 'src': srcName, 'dest': destName };
    }

    showInfoModal() {

        bis_genericio.isDirectory(this.constructNodeName()).then((isDirectory) => {
            bis_genericio.getFileStats(this.constructNodeName()).then((stats) => {

                console.log('stats', stats, 'node', this.currentlySelectedNode);
                //make file size something more readable than bytes
                let displayedSize, filetype;
                let kb = stats.size / 1000;
                let mb = kb / 1000;
                let gb = mb / 1000;

                if (gb > 1) { displayedSize = gb; filetype = 'GB'; }
                else if (mb > 1) { displayedSize = mb; filetype = 'MB'; }
                else { displayedSize = kb; filetype = 'KB'; }

                let roundedSize = Math.round(displayedSize * 10) / 10;
                let accessedTime = new Date(stats.atimeMs);
                let createdTime = new Date(stats.birthtimeMs);
                let modifiedTime = new Date(stats.mtimeMs);
                let parsedIsDirectory = isDirectory ? 'Yes' : 'No';

                console.log('accessed time', accessedTime.toDateString(), 'created time', createdTime, 'modified time', modifiedTime);

                //make info dialog
                let infoDisplay = `Name: ${this.currentlySelectedNode.text}<br> File Size: ${roundedSize}${filetype}<br> First Created: ${createdTime}<br> Last Modified: ${modifiedTime}<br> Last Accessed: ${accessedTime} <br> Is a Directory: ${parsedIsDirectory} <br> Tag: ${this.currentlySelectedNode.original.tag || 'None'}`;

                bootbox.dialog({
                    'title': 'File Info',
                    'message': infoDisplay
                });
            });
        });

    }

    openTagSettingPopover(node) {
        let popover = $(`<a href='#' data-toggle='popover' title='Select Tag'></a>`);
        let dropdownMenu = this.createTagSelectMenu({ 'enabled': true, 'setDefaultValue': true });

        $(node.reference.prevObject[0]).append(popover);
        popover.popover({
            'html': true,
            'content': dropdownMenu,
            'trigger': 'manual',
            'container': 'body'
        });

        //set flag to dismiss popover if user clicks area outside
        popover.on('shown.bs.popover', () => {
            this.popoverDisplayed = true;
        });

        dropdownMenu[0].addEventListener('change', () => {
            popover.popover('hide');
        });

        popover.popover('show');
    }

    toggleContextMenuLoadButtons(tree, toggle) {
        let existingTreeSettings = tree.jstree(true).settings.contextmenu.items;
        if (toggle === 'on') {
            if (existingTreeSettings.Load) {
                existingTreeSettings.Load._disabled = false;
            } else {
                existingTreeSettings.Viewer1._disabled = false;
                existingTreeSettings.Viewer2._disabled = false;
            }
        } else if (toggle === 'off') {
            if (existingTreeSettings.Load) {
                existingTreeSettings.Load._disabled = true;
            } else {
                existingTreeSettings.Viewer1._disabled = true;
                existingTreeSettings.Viewer2._disabled = true;
            }
        }
    }

    constructNodeName() {
        //construct the full name out of the current node 
        let name = '', currentNode = this.currentlySelectedNode;
        let tree = this.panel.widget.find('.file-container').jstree();

        while (currentNode.parent) {
            name = '/' + currentNode.text + name;
            let parentNode = tree.get_node(currentNode.parent);

            console.log('parentNode', parentNode);
            currentNode = parentNode;
        }

        name = this.stripTaskName(name);
        let finalname=this.baseDirectory + name;
        if (bis_genericio.getPathSeparator() === '\\') 
            finalname= util.filenameUnixToWindows(finalname);

        return finalname;

    }

    /**
     * 
     * @param {String} name - A full path for an image file, separated by slashes.
     */
    stripTaskName(name) {

        let splitName = name.split('/');
        let imageName = splitName[splitName.length - 1];
        let matchString = /^(\(task_\d+|rest_\d+)\)/;
        let match = matchString.exec(imageName);

        console.log('match', match);
        if (match) {
            imageName = imageName.replace(match[0], '');
            splitName[splitName.length - 1] = imageName;
        }

        return splitName.join('/');
    }

    createTagSelectMenu(options = {}) {

        let tagSelectMenu = $(
            `<select class='form-control' disabled> 
            <option value='image'>Image</option>
            <option value='task'>Task</option>
            <option value='rest'>Rest</option>
            <option value='dwi'>DWI</option>
            <option value='3danat'>3DAnat</option>
            <option value='2danat'>2DAnat</option>
        </select>`);

        if (options.enabled) { 
            tagSelectMenu.prop('disabled', '');
        }

        if (options.setDefaultValue) {
            this.changeTagSelectMenu(tagSelectMenu, this.currentlySelectedNode);
        }

        if (options.listenForTagEvents) {
            document.addEventListener('bisweb.tag.changed', () => {
                this.changeTagSelectMenu(tagSelectMenu, this.currentlySelectedNode);
            });
        }

        tagSelectMenu.on('change', () => {
            let selectedValue = tagSelectMenu.val();
            this.currentlySelectedNode.original.tag = selectedValue;

            //create bootbox modal with task select slider
            if (selectedValue.includes('task')) {

                let minSliderValue = 1;
                let maxSliderValue = 10;

                let sliderInput = $(`<input 
                        class='bootstrap-task-slider'
                        data-slider-min='${minSliderValue}'
                        data-slider-max='${maxSliderValue}'
                        data-slider-value='1'
                        data-slider-step='1'>
                    </input>`);
    
                //create secondary menu to select task number
                let box = bootbox.alert({ 
                    title : 'Enter a task number', 
                    message : 'Please enter the task number.',
                    size : 'small',
                    callback: () => {
                        //textbox input should override if it's different 
                        let result =  box.find('.tag-input')[0].value || box.find('.bootstrap-task-slider').val();
                        console.log('result', result);
                        let tagName = selectedValue + '_' + result, displayedName = '(' + tagName + ')';
                        this.currentlySelectedNode.original.tag = tagName;

                        //update name for underlying data structure and jstree object
                        this.currentlySelectedNode.original.text = displayedName + this.currentlySelectedNode.text;
                        this.currentlySelectedNode.text = this.currentlySelectedNode.original.text;

                        //update name displayed on file tree panel
                        let tree = this.panel.widget.find('.file-container').jstree();
                        tree.redraw(true);
                    }
                });

                box.init( () => {
                    console.log('box', box);
                    box.find('.modal-body').append(sliderInput);
                    box.find('.bootstrap-task-slider').slider({
                        'formatter': (value) => {
                            return value;
                        }
                    });

                    box.find('.slider.slider-horizontal').css('width', '75%');                    
                    let numberInput = $(`<input type='number' class='form-control-sm tag-input' style='float: right; display: inline; width: 20%;'>`);
                    box.find('.modal-body').append(numberInput);
                    
                    numberInput.on('keyup change', () => {
                        console.log('val', numberInput.val());
                        let val = Math.abs(parseInt(numberInput.val(), 10) || minSliderValue);
                        val = val > maxSliderValue ? maxSliderValue : val;
                        box.find('.bootstrap-task-slider').slider('setValue', val);
                    });

                    box.find('.bootstrap-task-slider').on('slide', (event) => {
                        console.log('value', event.value);
                        numberInput.val(event.value);
                    });
                });

                box.modal('show');
            }

            //tag select menus can be created by popovers or statically in the file bar
            //in order for one to change when the other does, they should emit and listen to each other's events
            let tagChangedEvent = new CustomEvent('bisweb.tag.changed', { 'bubbles': true });
            document.dispatchEvent(tagChangedEvent);     
        });

        return tagSelectMenu;
    }

    changeTagSelectMenu(menu, node) {
        let selection = node.original.tag || "image";

        //clear selected options
        let options = menu.find('option');
        for (let i = 0; i < options.length; i++) {
            options[i].removeAttribute('selected');
        }

        if (selection.includes('task')) { selection = 'task'; }
        menu.find(`option[value=${selection}]`).prop('selected', true);
    }

    getDefaultFilename() {
        let date = new Date();
        let parsedDate = 'ExportedStudy' + parseDate(date);
        console.log('date', parsedDate);
        return parsedDate + '.study';
    }

    getPanelWidth() {
        console.log('width', parseInt(this.panel.getWidget().css('width'), 10));
        return parseInt(this.panel.getWidget().css('width'), 10);
    }

}


/**
 * Recursive function to fill out a tree node then fill out the nodes below it. If called on the root node it will construct the whole tree.
 * Creates a single node and attaches it to a new tree.
 * 
 * @param {JSTree} rawTree - The existing jstree object.
 * @param {HTMLElement} node - The node in the existing tree.
 * @param {Array} parentNode - The node to attach the new new node to.
 */
let fillTreeNode = (rawTree, node, parentNode = null) => {
    let item = rawTree.get_node(node.id);
    let newNode = item.original;

    if (item.children.length > 0) {
        newNode.children = [];
        for (let child of node.children) {
            fillTreeNode(rawTree, child, newNode);
        }
    }

    if (parentNode.children) {
        parentNode.children.push(newNode);
    } else {
        parentNode.push(newNode);
    }

};

/**
 * Parses a javascript date object and returns a properly formatted BIDS date.
 * 
 * @param {Date} date - Javascript date object to parse.
 */
let parseDate = (date) => {
    return date.getFullYear() + '-' + date.getMonth() + 1 + '-' + zeroPadLeft(date.getDate()) + 'T' + zeroPadLeft(date.getHours()) + '_' + zeroPadLeft(date.getMinutes()) + '_' + zeroPadLeft(date.getSeconds());

    function zeroPadLeft(num) {
        let pad = '00', numStr = '' + num;
        return pad.substring(0, pad.length - numStr.length) + numStr;
    }
};

/**
 * Reads the parameters file in the BIDS source directory and returns its data. The parameter file should be the only JSON file in the directory.
 * 
 * @param {String} sourceDirectory - The source directory of the study.
 */
let readParamsFile = (sourceDirectory) => {

    //find the parameters file in the source directory
    return new Promise( (resolve, reject) => {
        bis_genericio.getMatchingFiles(sourceDirectory + '/+(settings|dicom_job)*.json').then( (paramFile) => {
            if (paramFile[0]) {
                bis_genericio.read(paramFile[0]).then( (obj) => {
                    let jsonData;
                    try {
                        jsonData = JSON.parse(obj.data);
                        resolve(jsonData);
                    } catch (e) {
                        console.log('An error occured while reading parameters file', paramFile[0], e);
                        reject(e);
                    }
                });
            } else {
                resolve('no params file');
            }
        }).catch( (e) => {
            reject(e);
        });
    });

};


bis_webutil.defineElement('bisweb-filetreepanel', FileTreePanel);
