const $ = require('jquery');
const bootbox = require('bootbox');
const bisweb_panel = require('bisweb_panel.js');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const util = require('bis_util');
const bis_genericio = require('bis_genericio.js');
const bis_bidsutils = require('bis_bidsutils.js');
const BiswebImage = require('bisweb_image.js');

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

        this.id = this.getAttribute('id');
        this.viewerid = this.getAttribute('bis-viewerid');
        this.viewertwoid = this.getAttribute('bis-viewerid2');
        this.layoutid = this.getAttribute('bis-layoutwidgetid');
        this.viewerappid = this.getAttribute('bis-viewerapplicationid');
        this.graphelementid = this.getAttribute('bis-graphelementid');
        this.painttoolid = this.getAttribute('bis-painttoolid');
        this.algocontrollerid = this.getAttribute('bis-algocontrollerid'); //included to propagate to filetreepipeline, not used in this file

        bis_webutil.runAfterAllLoaded(() => {

            this.viewer = document.querySelector(this.viewerid);
            this.viewertwo = document.querySelector(this.viewertwoid) || null;
            this.layout = document.querySelector(this.layoutid);
            this.viewerapplication = document.querySelector(this.viewerappid);
            this.graphelement = document.querySelector(this.graphelementid);
            this.painttool = document.querySelector(this.painttoolid) || null;
            this.popoverDisplayed = false;
            this.staticTagSelectMenu = null;
            this.fileTreePipeline = null;

            this.panel = new bisweb_panel(this.layout, {
                name: 'Imported Study Files',
                permanent: false,
                width: '400',
                dual: false,
                mode: 'sidebar',
                helpButton: true
            });


            /*let listElement = this.panel.getWidget();
            let biswebElementMenu = $(`<div class='bisweb-elements-menu'></div>`);
            biswebElementMenu.css({ 'margin-top': '15px' });

            let listContainer = $(`<div class='file-container biswebpanel2'></div>`);
            listContainer.css({ 'height': '100px', 'width': '100%' });
            listElement.append(listContainer);
            listElement.append($('<HR>'));


            listElement.append(biswebElementMenu);
            this.makeStaticButtons(listElement);
            */

            this.setHelpModalMessage();

            //https://stackoverflow.com/questions/11703093/how-to-dismiss-a-twitter-bootstrap-popover-by-clicking-outside
            this.dismissPopoverFn = (e) => {
                if (typeof $(e.target).data('original-title') == 'undefined' && !$(e.target).parents().is('.popover.in')) {
                    if (this.popoverDisplayed) {
                        $('[data-original-title]').popover('hide');
                        this.popoverDisplayed = false;
                    }
                }
            };

            $('html').on('click', this.dismissPopoverFn);
            $('html').on('contextmenu', this.dismissPopoverFn);
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
            },
            'RenameTask': {
                'separator_before': false,
                'separator_after': false,
                'label': 'Rename Task',
                'action': (node) => {
                    this.openTaskRenamingModal(node);
                }
            },
            'StudySettings' : {
                'separator_before': false,
                'separator_after': false,
                'label': 'Show Study Settings',
                'action': () => {
                    this.showStudySettingsModal();
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

    /**
     * Creates the jstree container elements and buttons that will load and save DICOM studies to disk. 
     */
    createFileDisplayElements() {
        let listElement = this.panel.getWidget();
        let biswebElementMenu = $(`<div class='bisweb-elements-menu'></div>`);
        biswebElementMenu.css({ 'margin-top': '15px' });

        let listContainer = $(`<div class='file-container biswebpanel2'></div>`);
        listContainer.css({ 'height': '100px', 'width': '100%' });
        listElement.append(listContainer);
        listElement.append($('<HR>'));


        listElement.append(biswebElementMenu);
        this.makeStaticButtons(listElement);

        if (!this.fileTreePipeline) {
            this.createFileTreePipelinePanel();
        }
    }

    importFilesFromDirectory(filename) {

        getFileList(filename).then((fileinfo) => {
            if (fileinfo.files.length > 0) {
                console.log('contents', fileinfo);
                let baseDir = formatBaseDirectory(filename, fileinfo.files) || filename;

                this.updateFileTree(fileinfo.files, baseDir, fileinfo.type);
                bis_webutil.createAlert('Loaded study from ' + filename, false, 0, 3000);
                return;
            } else {
                bis_webutil.createAlert('Could not find nifti files in ' + filename + ' or any of the folders it contains. Are you sure this is the directory?');
            }
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

            getFileList(parsedData.baseDirectory).then((fileinfo) => {
                console.log('contents', fileinfo);
                let baseDir = formatBaseDirectory(parsedData.baseDirectory, fileinfo.files);
                this.updateFileTree(fileinfo.files, baseDir, fileinfo.type);
            });
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
            baseDirectory = util.filenameWindowsToUnix(baseDirectory);

        this.baseDirectory = baseDirectory;

        this.studyType = type;
        let fileTree = parseFileList(files);

        //check what type of list this is, a list of names or a fully parsed directory
        /*if (typeof files[0] === 'string') {
            fileTree = parseFileList(files);
        } else {
            fileTree = files;
        }*/

        //alpabetize tree entries
        sortEntries(fileTree);

        let listElement = this.panel.getWidget();
        listElement.find('.file-container').remove();

        let listContainer = $(`<div class='file-container'></div>`);
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

            let div = $('<div></div>');
            elementsDiv.append(div);
            div.append(tagSelectDiv);

            elementsDiv.append(loadImageButton);
            elementsDiv.append(`<br><p class = "bisweb-file-import-label" style="font-size:80%; font-style:italic">Currently loaded — ${type}</p>`);
            elementsDiv.append($(`<label>Tag Selected Element:</label></br>`));
            elementsDiv.append(tagSelectDiv);
            loadImageButton.css({ 'margin': '10px' });
            elementsDiv.append($('<HR>'));

            this.renderedTagSelectMenu = true;
        } else {
            $('.bisweb-elements-menu').find('select').prop('disabled', 'disabled');
            $('.bisweb-file-import-label').text(`Currently loaded — ${type}`);
        }


        //attach listeners to new file tree
        this.setOnClickListeners(tree, listContainer);
        this.fileTree = tree;


        function parseFileList(files) {
            let fileTree = [];

            for (let file of files) {
                //trim the common directory name from the filtered out name
                if (bis_genericio.getPathSeparator() === '\\')
                    file = util.filenameWindowsToUnix(file);

                let trimmedName = file.replace(baseDirectory, '');
                let splitName = trimmedName.split('/');
                if (splitName[0] === '')
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

        }

        //sort the tree into alphabetical order, with directories and labeled items first
        function sortEntries(children) {
            if (children) {
                children.sort((a, b) => {
                    if (a.type === 'directory') {
                        if (b.type === 'directory') {
                            return a.text.localeCompare(b.text);
                        } else {
                            return a;
                        }
                    }

                    if (b.type === 'directory') {
                        return b;
                    }

                    return a.text.localeCompare(b.text);
                });


                //sort all nodes below this level in the tree
                for (let node of children) {
                    sortEntries(node.children);
                }
            }
        }

    }

    /**
     * Makes the buttons that import a study into the files tab and load an image. 
     * 
     * @param {HTMLElement} listElement - The element of the files tab where the buttons should be created.
     */
    makeStaticButtons(listElement) {
        let buttonGroupDisplay = $(`
            <div class='btn-group'>
                <div class='btn-group top-bar' role='group' aria-label='Viewer Buttons' style='float: left; margin-left : 0px;'>
                </div>
                <br>
                <div class='btn-group middle-bar' role='group' aria-label='Viewer Buttons' style='float: left; margin-left : 0px;'>
                </div>
                <br> 
            </div>
        `);
        let topButtonBar = buttonGroupDisplay.find('.top-bar');
        let middleButtonBar = buttonGroupDisplay.find('.middle-bar');


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
                'serveronly': true,
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


        saveStudyButton.addClass('bisweb-load-enable');
        saveStudyButton.prop('disabled', 'true');

        topButtonBar.append(loadStudyDirectoryButton);
        topButtonBar.append(loadStudyJSONButton);
        middleButtonBar.append(saveStudyButton);

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
            let tree = this.fileTree.jstree(true);
            let existingTreeSettings = tree.settings.contextmenu.items;
            let enabledButtons = { 'RenameTask': true };

            //console.log('node', tree.get_node(data.node.parent), data.node, existingTreeSettings);
            //dual viewer applications have a 'load to viewer 1' and 'load to viewer 2' button instead of just one load
            if (existingTreeSettings.Load) {
                enabledButtons.Load = true;
            } else {
                enabledButtons.Viewer1 = true;
                enabledButtons.Viewer2 = true;
            }

            if (data.node.original.type === 'directory') {
                if (enabledButtons.Load) { 
                    enabledButtons.Load = false; 
                } else { 
                    enabledButtons.Viewer1 = false; 
                    enabledButtons.Viewer2 = false;
                }
            } if (data.node.parent === '#' || tree.get_node(data.node.parent).original.text !== 'func') {
                //'#' is the parent of the top level node in the tree
                enabledButtons.RenameTask = false;
            }

            this.toggleContextMenuLoadButtons(tree, enabledButtons);
        };

        let handleDblClick = () => {
            if (this.currentlySelectedNode.original.type === 'picture') {
                this.loadImageFromTree();
            }
        };

        listContainer.on('select_node.jstree', (event, data) => {

            $('.bisweb-elements-menu').find('select').prop('disabled', '');
            $('.bisweb-load-enable').prop('disabled', '');

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
        this.currentlyLoadedNode = this.currentlySelectedNode;
        this.viewerapplication.loadImage(nodeName, viewer);
    }

    /**
     * Saves a the current list of study files to whichever storage service the user has selected, e.g. the local file system, Amazon AWS, etc.
     * The list will be saved as a .study file with the study files nested the same way as the file tree.
     * 
     * @param {String} filepath - The path to save the file to. 
     */
    exportStudy(filepath) {

        let reconstructedTree = this.parseTreeToJSON();

        console.log('Base Directory', this.baseDirectory, filepath);

        let base = this.baseDirectory;
        if (bis_genericio.getPathSeparator() === '\\')
            base = util.filenameUnixToWindows(base);

        bis_genericio.getFileStats(base).then((stats) => {

            let dateCreated = new Date(stats.birthtimeMs);
            let treeMetadataContainer = {
                'baseDirectory': this.baseDirectory,
                'dateCreated': parseDate(dateCreated),
                'contents': reconstructedTree
            };

            let stringifiedFiles = JSON.stringify(treeMetadataContainer, null, 2);
            //set the correct file extension if it isn't set yet
            let splitPath = filepath.split('.');
            if (splitPath.length < 2 || splitPath[1] !== 'STUDY' || splitPath[1] !== 'study') {
                splitPath[1] = 'study';
            }

            filepath = splitPath.join('.');
            bis_genericio.write(filepath, stringifiedFiles, false);
        }).catch((e) => {
            console.log('an error occured while saving to disk', e);
            bis_webutil.createAlert('An error occured while saving the study files to disk.', false);
        });
    }

    parseTaskImagesFromTree() {

        //TODO: Figure out why this function hangs sometimes
        if (this.fileTree === null) {
            bis_webutil.createAlert('Error: No study has been loaded. Please load a study before trying to parse task charts.', true);
        }
        let reconstructedTree = this.parseTreeToJSON();
        let taglist = {}, duplicateTags = false;

        checkForDuplicateTags(reconstructedTree);

        if (duplicateTags) {
            bis_webutil.createAlert('Some files in the study have the same tag, e.g. there might be two tagged as \'task_2\'. Please correct this before continuing.', true);
        }

        if (this.viewer.getobjectmap() === null) {
            bis_webutil.createAlert('Error: Cannot create VOI map of task regions without painted regions. Please create an overlay first (e.g. using the paint tool)', true); return;
        } else if (this.graphelement.taskdata === null) {
            bis_webutil.createAlert('Error: Parsing task regions requires information about runs and task timings and durations. Please load a task file using the \'Import task file\' button.', true); return;
        }

        let imgdata = {};
        let promiseArray = [];
        for (let key of Object.keys(taglist)) {
            let img = new BiswebImage();
            promiseArray.push(img.load(this.constructNodeName(taglist[key])));
            imgdata[key] = img;
        }

        bis_webutil.createAlert('Reading all runs marked as \'task\'; this may take a while!', false, 0, 1000000000, { 'makeLoadSpinner': true });
        Promise.all(promiseArray).then(() => {
            bis_webutil.dismissAlerts();

            //safety checks before beginning the long process of loading all the images
            console.log('overlay', this.viewer.getobjectmap());
            this.graphelement.parsePaintedAreaAverageTimeSeries(this.viewer, imgdata);
        });

        //Checks for duplicate tags by filling a dictionary with the tags seen so far. If it encounters a duplicate it returns false.
        function checkForDuplicateTags(node) {

            for (let item of node) {
                if (item.tag) {
                    if (!taglist[item.tag]) { taglist[item.tag] = item; }
                    else if (item.tag.includes('task') || item.tag.includes('rest')) { duplicateTags = true; return; }
                }

                if (item.children) {
                    checkForDuplicateTags(item.children);
                }
            }
        }
    }

    /**
     * Parses the jstree object into a hierarchical object in which child objects are stored recursively inside their parent nodes. 
     * Used when exporting the file tree or when the tree needs to be traversed to ensure certain properties, e.g. to determine which nodes are tagged.
     */
    parseTreeToJSON() {
        //reconstruct tree from jstree
        let rawTree = this.fileTree.jstree(true);
        let rawTreeJSON = rawTree.get_json('#');
        let reconstructedTree = [];

        //console.log('rawTree', rawTree);
        for (let item of rawTreeJSON) {
            fillTreeNode(rawTree, item, reconstructedTree);
        }

        return reconstructedTree;
    }

    /**
     * Parses a move_node event and returns the source and destination of the move. 
     * 
     * @param {Object} data - Data object returned from a move_node.jstree event.
     * @returns Source and destination directory.
     */
    parseSourceAndDestination(data) {

        //old_instance seems to be a copy of new_instance? i.e. they are exactly the same tree
        //so making the name is a little more complicated than just calling get_path twice
        let srcName = this.baseDirectory + '/' + data.old_instance.get_path(data.old_parent, '/', false) + '/' + data.node.text;
        let destName = this.baseDirectory + '/' + data.new_instance.get_path(data.node, '/', false);

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

    openTaskRenamingModal() {

        let tree = this.fileTree.jstree(true);
        let confirmName;
        let renameFn = (name) => {
            console.log('name', name);
            if (name) {
                //get all selected nodes to rename as a group
                let selectedNodes = tree.get_selected(true), movedFiles = [];

                for (let node of selectedNodes) {
                    let originalName = node.text, splitName = node.text.split('_'), taskName = null, index;
                    //task names should be the second or third bullet, so if it's not there then we know not to change them
                    if (splitName.length >= 2 && splitName[1].includes('task')) {
                        taskName = splitName[1];
                        index = 1;
                    } else if (splitName.length >= 3 && splitName[2].includes('task')) {
                        taskName = splitName[2];
                        index = 2;
                    }

                    if (taskName) {
                        //split off the second part of the task tag to change it
                        let splitTag = taskName.split('-');
                        splitTag[1] = name;
                        splitName[index] = splitTag.join('-');
                        let reconstructedName = splitName.join('_');

                        node.original.text = reconstructedName;
                        node.text = reconstructedName;

                        //move the file on disk 
                        let basePath = tree.get_path(node.parent, '/');
                        let srcFile = this.baseDirectory + '/' + basePath + '/' + originalName, dstFile = this.baseDirectory + '/' + basePath + '/' + reconstructedName;
                        bis_genericio.moveDirectory(srcFile + '&&' + dstFile);
                        movedFiles.push({ 'old': srcFile, 'new': dstFile });
                    }
                }

                tree.redraw(true);

                bis_bidsutils.syncSupportingFiles(movedFiles, name, this.baseDirectory).then((supportingFiles) => {
                    for (let file of supportingFiles) {
                        let fileExtension = bis_genericio.getBaseName(file).split('.'); fileExtension = fileExtension[fileExtension.length - 1];
                        if (fileExtension.toLowerCase() === 'json') {

                            //open file, update 'TaskName', then write it to disk
                            let fullname = this.baseDirectory + '/' + file;
                            bis_genericio.read(fullname).then((obj) => {
                                try {
                                    let parsedJSON = JSON.parse(obj.data);
                                    parsedJSON.TaskName = name;
                                    let stringifiedJSON = JSON.stringify(parsedJSON, null, 2);
                                    bis_genericio.write(fullname, stringifiedJSON, false).then(() => { console.log('write for', file, 'done'); });
                                } catch (e) {
                                    console.log('an error occured during conversion to/from JSON', e);
                                }
                            });
                        }
                    }
                });
            }
        };

        bootbox.prompt({
            'size': 'small',
            'title': 'Set task name',
            'message': 'Enter the name for the chosen task(s). Note that you can select multiple tasks by holding shift or ctrl.',
            'show': true,
            'callback': (newName) => {
                if (newName) {
                    confirmName = newName;
                    bootbox.confirm({
                        'size' : 'small',
                        'title' : 'Confirm task rename',
                        'message' : 'Rename task to ' + confirmName + '?',
                        'callback' : renameFn.bind(this, newName)
                    });
                }
            }
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


    /**
     * Changes the context menu buttons (right-click menu) for the file tree currently being displayed according to the keys specified in settings. 
     * 
     * @param {jstree} tree - The file tree that is currently displayed on screen.
     * @param {Object} settings - An object containing the list of settings to set or unset. These keys must be identical to the keys designated for the buttons in the contextmenu.
     */
    toggleContextMenuLoadButtons(tree, settings) {
        let existingTreeSettings = tree.settings.contextmenu.items;
        for (let key of Object.keys(settings)) {
            existingTreeSettings[key]._disabled = !settings[key]; //settings are provided as 'which ones should be enabled'
        }
    }

    /**
     * Constructs the full filename of the node based on
     * @param {Object} node - Object describing the jstree node. If not specified this will infer that the currently selected node is to be used. 
     */
    constructNodeName(node = null) {

        //construct the full name out of the current node 
        let name = '', currentNode = this.currentlySelectedNode;
        let tree = this.panel.widget.find('.file-container').jstree();

        if (node) {
            currentNode = tree.get_node(node.id);
        }

        while (currentNode.parent) {
            name = '/' + currentNode.text + name;
            let parentNode = tree.get_node(currentNode.parent);

            currentNode = parentNode;
        }

        name = this.stripTaskName(name);
        let finalname = this.baseDirectory + name;
        if (bis_genericio.getPathSeparator() === '\\')
            finalname = util.filenameUnixToWindows(finalname);

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

        if (match) {
            imageName = imageName.replace(match[0], '');
            splitName[splitName.length - 1] = imageName;
        }

        return splitName.join('/');
    }

    /**
     * Creates a bisweb-filetreepipeline element and appends it to the body. Also calls its 'createPanel' function. 
     * This is written to avoid circular dependencies from requiring bisweb_filetreepanel in bisweb_filetreepipeline and vice versa. 
     * If filetreepipeline did not require filetreepanel, then the element could exist statically in the DOM.
     */
    createFileTreePipelinePanel() {
        let fileTreePipeline = document.createElement('bisweb-filetreepipeline');
        let id = '#' + this.id;
        fileTreePipeline.setAttribute('id', 'bis_filetreepipeline');
        fileTreePipeline.setAttribute('bis-layoutwidgetid', this.layoutid);
        fileTreePipeline.setAttribute('bis-graphelementid', this.graphelementid);
        fileTreePipeline.setAttribute('bis-algocontrollerid', this.algocontrollerid);
        fileTreePipeline.setAttribute('bis-filetreepanelid', id);

        document.body.appendChild(fileTreePipeline);

        fileTreePipeline.createPanel(this.panel.getWidget());
        this.fileTreePipeline = fileTreePipeline;
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
                createTaskSelectorWindow(this.currentlySelectedNode, this.panel);
            } else if (selectedValue.includes('rest')) {
                clearTagFromTree(this.currentlySelectedNode, this.panel);
            }

            //tag select menus can be created by popovers or statically in the file bar
            //in order for one to change when the other does, they should emit and listen to each other's events
            let tagChangedEvent = new CustomEvent('bisweb.tag.changed', { 'bubbles': true });
            document.dispatchEvent(tagChangedEvent);
        });

        return tagSelectMenu;

        function createTaskSelectorWindow(node, panel) {
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
                title: 'Enter a task number',
                message: 'Please enter the task number.',
                size: 'small',
                callback: () => {
                    //textbox input should override if it's different 
                    let result = box.find('.tag-input')[0].value || box.find('.bootstrap-task-slider').val();

                    let tagName = 'task_' + result, displayedName = '(' + tagName + ')';
                    node.original.tag = tagName;


                    //split off old task name, if any, then update name for underlying data structure and jstree object
                    let splitName = node.text.split(/^\(.*\).*$/), parsedName;
                    if (splitName.length > 1) { parsedName = splitName.slice(1).join(''); }
                    else { parsedName = node.text; }

                    node.original.text = displayedName + parsedName;
                    node.text = node.original.text;

                    //update name displayed on file tree panel
                    let tree = panel.widget.find('.file-container').jstree();
                    tree.redraw(true);
                }
            });

            box.init(() => {
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

        function clearTagFromTree(node, panel) {
            //trim parenthetical tag from name
            let splitName = node.text.split(/^\(task_\d+\)/);
            console.log('split name', splitName);
            if (splitName.length > 1) {
                let trimmedName = splitName.slice(1).join('');
                node.original.text = trimmedName;
                node.text = node.original.text;

                console.log('node', node);

                //update name displayed on file tree panel
                let tree = panel.widget.find('.file-container').jstree();
                tree.redraw(true);

                //dismiss popover manually 
                $('html').find('.popover').popover('hide');
            }
        }
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

    /** Sets the help modal message for the file tree panel. */
    setHelpModalMessage() {
        this.panel.setHelpModalMessage(`
            This panel can help to load and display a variety of studies, especially DICOM and Bruker.
            <br><br>
            To load a study from a set of nested directories, use the 'Import study from directory' button. Note that this will look for any files that are suffixed with .nii under the chosen directory, and will not work with raw image files (BioImage Suite is currently capable of converting DICOM and Bruker image sets, look for those tabs in the right sidebar).
            <br><br>
            Import and export study deal with a special kind of metadata file marked with '.study'. 'Export study' will create one of these files from a file tree that has already been loaded and 'Import study' will load one of these study files into the panel. Any information added to the study will be conserved in the .study file. 
            <br><br>
            'Import task file' and 'Clear tasks' and 'Plot task charts' deal with loading timing charts for studies, see <a href="https://bioimagesuiteweb.github.io/bisweb-manual">the manual</a> for more details.
            <br><br>
            <b>Important Note</b>Certain operations with the file tree panel will modify files on disk, e.g. the 'Rename task' option in the right-click menu will change the name of the image file's supporting files and will change the name in dicom_job_info.json. 
            To ensure these files save properly, make sure the relevant files are not open on your machine, i.e. are not open in a file editor or other such software. 
        `);
    }

    /** Loads dicom_job_info.json (or whatever the most recent settings file is) and displays it. */
    showStudySettingsModal() {
        let settingsFilename = this.baseDirectory + '/' + bis_bidsutils.dicomParametersFilename;
        bis_bidsutils.getSettingsFile(settingsFilename).then( (settings) => {
            let settingsString;
            try {
                settingsString = JSON.stringify(settings, null, 2);
            } catch(e) {
                console.log('An error occured while trying to display settings', e);
            }

            let settingsModal = bootbox.alert({
               'size' : 'large',
               'title' : 'DICOM Job Settings',
               'message' : `<pre>${settingsString}</pre>`,
               'backdrop' : true,
               'scrollable' : true,
            });


            settingsModal.on('shown.bs.modal', () => {
                console.log('modal shown', settingsModal);
                $(settingsModal).scrollTop(0);
            });
        });
    }

    /** Returns the current file tree
     * @returns The current file tree object.
     */
    getFileTree() {
        return this.fileTree;
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

    newNode.id = node.id;
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
    return new Promise((resolve, reject) => {
        bis_genericio.getMatchingFiles(sourceDirectory + '/+(settings|dicom_job)*.json').then((paramFile) => {
            if (paramFile[0]) {
                bis_genericio.read(paramFile[0]).then((obj) => {
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
        }).catch((e) => {
            reject(e);
        });
    });

};

/**
 * Takes the raw directory path returned by the import buttons and calls getmatchingfiles to return the study files. 
 * 
 * @param {String} directory - The name of the directory on which import study is called
 * @returns A promise resolving the study files
 */
let getFileList = (filename) => {
    return new Promise((resolve, reject) => {
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

            let type = data.type || data.acquisition || data.bisformat || 'Unknown type';
            bis_genericio.getMatchingFiles(queryString).then((files) => {

                if (files.length > 0) {
                    resolve({ 'files': files, 'type': type });
                }

                queryString = filename + '/**/*.nii*';
                bis_genericio.getMatchingFiles(queryString).then((newfiles) => {
                    resolve({ 'files': newfiles, 'type': type });
                });
            });
        }).catch((e) => { reject(e); });
    });
};

/**
 * Changes the format of the provided base directory to be rooted at 'sourcedata', modifies the file list appropriately.
 * 
 * @param {String} baseDirectory - Unformatted base directory.
 * @param {Array} contents - Flat list of files.
 * @returns Base directory rooted at 'sourcedata', or null if sourcedata is not in any file's path (not a BIDS directory).
 */
let formatBaseDirectory = (baseDirectory, contents) => {
    let formattedBase = findBaseDirectory(baseDirectory);

    if (!formattedBase) {
        //look for sourcedata in one of the entries in contents (these should be the full path)
        let file = contents[0];
        formattedBase = findBaseDirectory(file);
    }

    console.log('formatted base', formattedBase);
    return formattedBase;

    function findBaseDirectory(directory) {
        let splitBase = directory.split('/'), formattedBase = null;
        for (let i = 0; i < splitBase.length; i++) {
            if (splitBase[i] === 'sourcedata') {
                formattedBase = splitBase.slice(0, i + 1).join('/');
            }
        }

        return formattedBase;
    }
};

bis_webutil.defineElement('bisweb-filetreepanel', FileTreePanel);
