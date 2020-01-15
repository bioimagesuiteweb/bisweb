const $ = require('jquery');
const bootbox = require('bootbox');

const webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
const bis_bidsutils = require('bis_bidsutils.js');
const bisweb_taskutils = require('bisweb_taskutils.js');
const bisweb_panel = require('bisweb_panel.js');
const bisweb_serverutils = require('bisweb_serverutils.js');
const bisweb_popoverhandler = require('bisweb_popoverhandler.js');

const DicomModule = require('dicommodule.js');
const BisWebTaskManager = require('bisweb_studytaskmanager');
const BiswebImage = require('bisweb_image.js');

const SEPARATOR = bis_genericio.getPathSeparator();

/** 
 * TODO: 
 *  Have Steph read the help file.
 */

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

const IMAGETYPES = ['Image', 'Task', 'Rest', 'DWI', '3DAnat', '2DAnat'];
const IMAGEVALUES = ['image', 'task', 'rest', 'dwi', '3danat', '2danat'];

class StudyPanel extends HTMLElement {

    constructor() {
        super();
        this.rendered = false;
        this.listContainer = null;
        this.elementsContainer = null;
        this.taskManager = null;
        this.dicomModal = null;
    }

    connectedCallback() {

        webutil.runAfterAllLoaded(() => {
            this.id = this.getAttribute('id');
            this.viewerid = this.getAttribute('bis-viewerid');
            this.viewertwoid = this.getAttribute('bis-viewerid2');
            this.layoutid = this.getAttribute('bis-layoutwidgetid');
            this.viewerappid = this.getAttribute('bis-viewerapplicationid');
            this.viewer = document.querySelector(this.viewerid);
            this.viewertwo = document.querySelector(this.viewertwoid) || null;
            this.layout = document.querySelector(this.layoutid);
            this.viewerapplication = document.querySelector(this.viewerappid);
            this.popoverDisplayed = false;
            this.staticTagSelectMenu = null;

            this.panel = new bisweb_panel(this.layout, {
                name: 'Study Panel',
                permanent: false,
                width: '400',
                dual: false,
                mode: 'sidebar',
                //helpButton: true
            });

            bisweb_popoverhandler.addPopoverDismissHandler();
        });

        this.contextMenuDefaultSettings = {
            'Info': {
                'separator_before': false,
                'separator_after': false,
                'label': 'File Info',
                'action': (node) => {
                    this.createFileInfoModal(node);
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
            /*'StudySettings': {
                'separator_before': false,
                'separator_after': false,
                'label': 'Show Study Settings',
                'action': (node) => {
                    this.showStudySettingsModal(node);
                }
            }*/
        };

    }

    /**
     * Shows file tree panel in the sidebar.
     */
    show() {
        this.panel.show();
        if (!this.rendered) {
            this.createcreateGUI();
        }

    }

    /**
     * Creates the jstree container elements and buttons that will load and save DICOM studies to disk. 
     */
    createcreateGUI() {
        let parent = this.panel.getWidget();
        this.createStudyButtons(parent);
        parent.append($('<HR width="90%">'));

        //file list container is generated each time because jstree cannot reuse the same div to make a new tree
        this.listContainerDivID = webutil.getuniqueid();
        let listContainerDiv = $(`<div id=${this.listContainerDivID}></div>`);
        parent.append(listContainerDiv);

        parent.append($('<HR width="90%">'));
        this.elementsContainer = webutil.creatediv(
            {
                parent: parent,
                css: {
                    'height': '200px',
                    'max-height': '1500px',
                    'overflow': 'auto',
                    'width': '95%',
                    'margin-top': '5px'
                }
            });

        parent.append($('<HR width="90%">'));
        this.taskManager = new BisWebTaskManager(this, this.viewerid);
        this.rendered = true;
    }

    importBIDSDirectory(filename) {

        getFileList(filename).then((fileinfo) => {
            if (fileinfo.files.length > 0) {
                console.log('contents', fileinfo);
                let baseDir = formatBaseDirectory(filename, fileinfo.files) || filename;
                fileinfo.type = 'directory import';
                this.updateFileTree(fileinfo.files, baseDir, fileinfo.type);
                console.log('BaseDir=', baseDir);
                webutil.createAlert('Loaded study from ' + filename, false, 0, 3000);

                //look in the study file for tsv files, then parse them and add them as this study's current task data
                let tasksfound = false;
                this.parseStudyTSVFiles(baseDir).then((obj) => {
                    if (obj)
                        tasksfound = true;
                }).catch((e) => {
                    console.log('An error occured while trying to parse tsv files', e);
                }).finally(() => {
                    this.taskManager.createGUI();
                    this.taskManager.plotTaskData();

                    let a = '(No Tasks defined)';
                    if (tasksfound)
                        a = '(Study includes task definitions)';
                    webutil.createAlert('Loaded study from ' + filename + ' ' + a, false, 0, 3000);

                });

            } else {
                webutil.createAlert('Could not find nifti files in ' + filename + ' or any of the folders it contains. Are you sure this is the directory?');
            }
        });
    }

    loadStudy(filename) {
        bis_genericio.read(filename).then((obj) => {
            let jsonData = obj.data, parsedData;
            try {
                parsedData = JSON.parse(jsonData);
            } catch (e) {
                console.log('An error occured trying to parse the exported study file', filename, e);
            }

            getFileList(parsedData.baseDirectory).then((fileinfo) => {
                let baseDir = formatBaseDirectory(parsedData.baseDirectory, fileinfo.files);
                this.updateFileTree(fileinfo.files, baseDir, fileinfo.type);

                if (parsedData.tasks) {
                    bisweb_taskutils.parseFile(parsedData.tasks).then( (formattedTasks) => {
                        this.taskManager.setTaskData(formattedTasks, false);
                        this.taskManager.plotTaskData();
                        this.taskManager.createGUI();
                    });
                }
            });
        });
    }

    /**
     * Searches a BIDS directory for the directory containing tsv files, then parses these into a task file.
     */
    parseStudyTSVFiles(basedir) {
        return new Promise((resolve, reject) => {
            let matchstring = basedir + '/**/*.tsv';
            bis_genericio.getMatchingFiles(matchstring).then((match) => {

                //TODO: This assumes that there is only one directory that contains TSV files while in a study with multiple subjects there may be more than one
                //This would require changing the task definition file in the future!
                if (match.length > 0) {
                    let splitTsvDirname = match[0].split('/');
                    let tsvDirname = splitTsvDirname.slice(0, splitTsvDirname.length - 1).join('/');

                    bis_bidsutils.parseTaskFileFromTSV(tsvDirname, '', false).then((obj) => {
                        bisweb_taskutils.parseFile(obj).then((formattedObj) => {
                            this.taskManager.setTaskData(formattedObj, false);
                            resolve(formattedObj);
                        }).catch((e) => { reject(e); });
                    }).catch((e) => {
                        reject(e);
                    });

                } else {
                    //console.log('No tsv files found for this study, cannot parse tasks.');
                    resolve();
                }

            }).catch((e) => {
                reject(e);
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

        if (bis_genericio.getPathSeparator() === '\\') {
            baseDirectory = baseDirectory.trim().replace(/\\/g, '/');
        }
        this.baseDirectory = baseDirectory;

        this.studyType = type;
        let fileTree = parseFileList(files);

        //alpabetize tree entries
        sortEntries(fileTree);
        let len = fileTree.length;
        for (let i = 0; i < len; i++) {
            let elem = fileTree[i];
            if (!elem.state)
                elem.state = {};
            elem['state']['opened'] = true;
        }

        let listContainerDiv = this.panel.getWidget().find('#' + this.listContainerDivID);
        listContainerDiv.empty();

        this.listContainer = webutil.creatediv(
            {
                parent: listContainerDiv,
                css: {
                    'height': '350px',
                    'max-height': '1500px',
                    'width': '95%',
                    'overflow': 'auto',
                    'margin-top': '5px'
                }
            });

        let tree = this.listContainer.jstree({
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

        console.log('tree', tree);
        tree.jstree(true).settings.contextmenu.items = newSettings;
        tree.jstree(true).redraw(true);

        let enabledButtons = this.panel.widget.find('.bisweb-load-enable');
        enabledButtons.prop('disabled', false);

        if (!this.renderedTagSelectMenu) {

            let elementsDiv = this.elementsContainer;
            let loadImageButton = $(`<button type='button' class='btn btn-success btn-sm bisweb-load-enable' disabled>Load image</button>`);
            loadImageButton.on('click', (e) => { e.preventDefault(); this.loadImageFromTree(); });

            let loaddiv = webutil.creatediv({ parent: elementsDiv, css: { 'width': '95%' } });
            loaddiv.append(loadImageButton);
            loaddiv.append(`<span class = "bisweb-file-import-label" style="font-size:80%; margin-left:20px; font-style:italic">Current — ${type}</span>`);

            //create load button and static tag select menu
            let tagSelectDiv = webutil.creatediv({ parent: elementsDiv, css: { 'width': '95%' } });
            let lab = $(`<label>Tag of Selected Image:</label>`);
            lab.css({ 'margin': '5px' });
            tagSelectDiv.append(lab);
            this.staticTagSelectMenu = this.createTagSelectMenu({ 'setDefaultValue': false, 'listenForTagEvents': true });
            tagSelectDiv.append(this.staticTagSelectMenu);

            this.renderedTagSelectMenu = true;
        } else {
            this.elementsContainer.find('select').prop('disabled', 'disabled');
            $('.bisweb-file-import-label').text(`Currently loaded — ${type}`);
        }


        //attach listeners to new file tree
        this.setOnClickListeners(tree, this.listContainer);
        this.fileTree = tree;


        function parseFileList(files) {
            let fileTree = [];

            for (let file of files) {
                //trim the common directory name from the filtered out name
                if (bis_genericio.getPathSeparator() === '\\')
                    file = file.trim().replace(/\\/g, '/');

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
                webutil.createAlert('No study files could be found in the chosen directory, try a different directory.', false);
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
    createStudyButtons(listElement) {

        let topbar = webutil.creatediv({ 'parent': listElement, 'css' :  { 'text-align' : 'center' } });

        //Route study load and save through bis_webfileutil file callbacks
        bis_webfileutil.createFileButton({
            'type': 'info',
            'css' : { 'margin-top' : '10px' },
            'name': 'Load study file',
            'parent': topbar,
            'callback': (f) => {
                this.loadStudy(f);
            },
        }, {
                'title': 'Load study',
                'filters': [
                    { 'name': 'Study Files', extensions: ['biswebstudy'] }
                ],
                'suffix': 'study',
                'save': false,
            });

        let saveStudyButton = bis_webfileutil.createFileButton({
            'type': 'danger',
            'name': 'Save study file',
            'css' : { 'margin-left' : '5px', 'margin-top' : '10px' },
            'parent': topbar,
            'callback': (f) => {
                this.exportStudy(f);
            },
        },
            {
                'title': 'Save study',
                'filters': 'DIRECTORY',
                'suffix': 'DIRECTORY',
                'save': true,
                initialCallback: () => { return this.getDefaultFilename(); },
            });

        //.bisweb-load-enable becomes enabled once a study has been loaded
        saveStudyButton.addClass('bisweb-load-enable');
        saveStudyButton.prop('disabled', 'true');

        bis_webfileutil.createFileButton({
            'type': 'success',
            'parent': topbar,
            'name': 'Import directory',
            'css' : { 'margin-left' : '5px', 'margin-top' : '10px' },
            'callback': (f) => {
                this.importBIDSDirectory(f);
            },
        }, {
                'title': 'Import study from directory',
                'filters': 'DIRECTORY',
                'suffix': 'DIRECTORY',
                'save': false,
                'serveronly': true,
            });

    }

    showDICOMImportModal() {
        if (!this.dicomModal) {
            let dicomModal = webutil.createmodal('DICOM Import', 'modal-md');

            let text = $(`<P align="center"><B>This invokes <a target="_blank" href="https://github.com/rordenlab/dcm2niix">dcm2niix</a> as an external process.<B></p>

            <p>Choose a directory that contains raw DICOM images and a directory where you would like to save the converted NIFTI .nii.gz images, then press 'Convert' to start the process. 
            This process requires you to (i) either be connected to the BioImage Suite Web File Server Helper, or (ii) to be running the application via Electron (the Electron app <a href="binaries.html" target="_blank">may be found here</a>).</p>
 
            <p><B>Note:</B> If the "BIDS" checkbox is selected, the NIFTI .nii.gz files will be sorted to create a directory structure that is based on <a href="https://bids.neuroimaging.io/">the BIDS specification</a> after converting the raw files. </p>`);
            
            dicomModal.body.append(text, $(`<HR width="90%"></HR>`));
            let inputDirectoryTextboxId = webutil.getuniqueid(), outputDirectoryTextboxId = webutil.getuniqueid();
            let inputSearchButtonId = webutil.getuniqueid(), outputSearchButtonId = webutil.getuniqueid();
            let doBidsId=webutil.getuniqueid();
                        
            let inputGroups = $(`
                <div style='width: 90%; margin: 0 auto;'>
                    <label>Input directory</label>
                    <div class='input-group bisweb-filepath'>
                        <input id=${inputDirectoryTextboxId} type='search' class='form-control' placeholder='Enter an input directory...'>
                        <span class='input-group-btn'>
                            <button id=${inputSearchButtonId} class='btn btn-primary' type='button'>. . .</button>
                        </span>
                    </div>
                    <label>Output directory</label>
                    <div class='input-group bisweb-filepath'>
                        <input id=${outputDirectoryTextboxId} type='search' class='form-control' placeholder='Enter an output directory...'>
                        <span class='input-group-btn'>
                            <button id=${outputSearchButtonId} class='btn btn-primary' type='button'>. . .</button>
                        </span>
                    </div>
                    <div>
                    <input id="${doBidsId}" style="margin-left:30%" type="checkbox">
                    <label style="margin-left:5px;">Reorganize Files to BIDS</label>
                    </div>
                </div>
            `);

            let inputSearchButton = $(inputGroups).find(`#${inputSearchButtonId}`); 
            let outputSearchButton = $(inputGroups).find(`#${outputSearchButtonId}`);  
            this.setDICOMConversionListeners(inputSearchButton, outputSearchButton, inputDirectoryTextboxId, outputDirectoryTextboxId);

            let bidsCheck=$(inputGroups).find('#'+doBidsId);
            dicomModal.body.append(inputGroups);
            dicomModal.footer.empty();

            bidsCheck.trigger('click');
            webutil.createbutton({
                'name' : 'Convert',
                'type' : 'success',
                parent : dicomModal.footer,
                'callback' : () => {
                    let inputDirectoryName = $('#' + inputDirectoryTextboxId).val();
                    let outputDirectoryName = $('#' + outputDirectoryTextboxId).val();
                    let toggleState = bidsCheck.prop('checked') || false;

                    console.log('input directory name', inputDirectoryName, outputDirectoryName);
                    if (!inputDirectoryName || inputDirectoryName === '') {
                        webutil.createAlert('No input directory defined. Please define an input directory before converting',true); return;
                    } else if (!outputDirectoryName || outputDirectoryName === '') {
                        webutil.createAlert('No output directory defined. Please define an output directory before converting',true); return;
                    }

                    dicomModal.dialog.modal('hide');
                    this.importDICOMImages(inputDirectoryName, outputDirectoryName, toggleState);
                }
            });
            
            
            dicomModal.dialog.modal('show');
            this.dicomModal = dicomModal;
        }

        this.dicomModal.dialog.modal('show');
    }

    /**
     * Sets the listeners onto the DICOM import search buttons, i.e. the '...' buttons next to input directory and output directory. 
     * 
     * @param {JQuery} inputSearchButton - The search button next to the input directory field. 
     * @param {JQuery} outputSearchButton - The search button next to the output directory field.
     * @param {String} inputDirectoryTextboxId - The id of the input directory textbox.
     * @param {String} outputDirectoryTextboxId - The id of the output directory textbox.
     */
    setDICOMConversionListeners(inputSearchButton, outputSearchButton, inputDirectoryTextboxId, outputDirectoryTextboxId) {
        bis_webfileutil.attachFileCallback(inputSearchButton, 
            (dirname) => {
                console.log('dirname', dirname);
                let inputTextbox = $('#' + inputDirectoryTextboxId);
                let currentIndirVal = $(inputTextbox).val();

                if (currentIndirVal && currentIndirVal !== '') {
                    bootbox.dialog({
                        'title' : 'Replace or add?',
                        'message' : 'Replace the current value with the new value, or add it to the original?',
                        'size' : 'small',
                        'onEscape' : true,
                        'buttons' : {
                            'replace' : {
                                'label' : 'Replace', 
                                'className' : 'btn-warning',
                                'callback' : () => {
                                    $(inputTextbox).val(dirname);
                                }
                            },
                            'add' : {
                                'label' : 'Add',
                                'className' : 'btn-success',
                                'callback' : () => {
                                    $(inputTextbox).val(currentIndirVal + ',' + dirname);
                                }
                            }
                        }
                    });
                } else {
                    $('#' + inputDirectoryTextboxId).val(dirname);
                } 
            },
            {
                'title': 'Select a directory containing raw DICOM images',
                'filters': 'DIRECTORY',
                'suffix': 'DIRECTORY',
                'save': false,
                'mode' : 'load',
                'altkeys' : true,
                'serveronly': true,
            });
        
        bis_webfileutil.attachFileCallback(outputSearchButton,
            (dirname) => {
                $('#' + outputDirectoryTextboxId).val(dirname);
            },
            {
                'title': 'Select a directory to output the converted images to',
                'filters': 'DIRECTORY',
                'suffix': 'DIRECTORY',
                'save': false,
                'mode' : 'load',
                'serveronly': true,
            });
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
            let enabledButtons = { 'RenameTask': true, 'ShowTaskChart' : true };

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
                enabledButtons.ShowTaskChart = false;
            }

            this.toggleContextMenuLoadButtons(tree, enabledButtons);
        };

        let handleDblClick = () => {
            if (this.currentlySelectedNode.original.type === 'picture') {
                this.loadImageFromTree();
            }
        };

        listContainer.on('select_node.jstree', (event, data) => {

            this.elementsContainer.find('select').prop('disabled', '');
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
        let base = this.baseDirectory;

        bis_genericio.getFileStats(base).then((stats) => {

            let dateCreated = new Date(stats.birthtimeMs);
            let treeMetadataContainer = {
                'baseDirectory': this.baseDirectory,
                'dateCreated': parseDate(dateCreated),
                'contents': reconstructedTree
            };

            let taskInfo = this.taskManager.getTaskData() || null;
            if (taskInfo) {
                //trim unnecessary fields from task info and join all the array in runs to match the format expected for task files on disk
                let runs = taskInfo.runs, keys = Object.keys(runs);
                for (let i = 0; i < keys.length; i++) {
                    delete runs[keys[i]].parsedRegions;
                    for (let taskKey of Object.keys(runs[keys[i]])) {
                        runs[keys[i]][taskKey] = joinArray(runs[keys[i]][taskKey]);
                    }
                }
                console.log('runs', runs);
                treeMetadataContainer.tasks = { 'runs': runs };
            }

            let stringifiedFiles = JSON.stringify(treeMetadataContainer, null, 2);

            //set the correct file extension if it isn't set yet
            let splitPath = filepath.split('.');
            if (splitPath.length < 2 || splitPath[1] !== 'biswebstudy' || splitPath[1] !== 'biswebstudy') {
                splitPath[1] = 'biswebstudy';
            }

            filepath = splitPath.join('.');
            bis_genericio.write(filepath, stringifiedFiles, false).then(() => {
                webutil.createAlert('Saved study file ' + filepath + ' successfully');
            });
        }).catch((e) => {
            console.log('an error occured while saving to disk', e);
            webutil.createAlert('An error occured while saving the study files to disk.', false);
        });

        function joinArray(array) {
            console.log('array', array);
            if (Array.isArray(array[0])) {
                for (let i = 0; i < array.length; i++) {
                    array[i] = joinArray(array[i]);
                }
                return array;
            }

            return array.join('-');
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

    createFileInfoModal(node) {
        console.log('node', node);
        let fileModal = webutil.createmodal('File info', 'modal-lg');
        let nodeName = this.constructNodeName(node); 

        let fileInfoLayout = $(`
            <div class='container-fluid'> 
                <div class='row justify-content-start'>
                    <div class='col-lg-4'>
                        <ul class='list-group bisweb-file-list'>
                        </ul>
                    </div>
                    <div class='col-lg-8 bisweb-file-info'>
                        <pre>Content here...</pre>
                    </div>
                </div>
            </div>
        `);

        fileModal.body.append(fileInfoLayout);

        bis_bidsutils.getSettingsEntry(this.baseDirectory, nodeName).then( (settingsEntry) => {
            let filelist = fileModal.body.find('.bisweb-file-list');
            filelist.empty();


            //add image file to file list, then the supporting files
            let imageli = $(`<li class='list-group-item bisweb-li'>${bis_genericio.getBaseName(nodeName)}</li>`);
            filelist.append(imageli);
            for (let file of settingsEntry.supportingfiles) {
                let basename = bis_genericio.getBaseName(file);
                let li = $(`<li class='list-group-item bisweb-li'>${basename}</li>`);
                filelist.append(li);
            }
            

            //add 'active' class to element on click and remove 'active' from all others
            //then change bisweb-file-info to be the info of the selected item
            fileModal.body.find('.bisweb-file-list>.list-group-item').on('click', function() {
                console.log('this text', $(this));
                fileInfoLayout.find('.bisweb-file-list>.list-group-item').removeClass('active');
                $(this).addClass('active');
                let basename = $(this).html();
                changeDisplayedInfo(basename);
            });

            fileModal.dialog.modal('show');
        }).catch( (e) => { console.log('An error occured while creating the file info modal', e); });

        const self = this;
        function changeDisplayedInfo(basename) {
            console.log('base name', basename, 'node name', nodeName);
            //create full name of file in list by replacing base of node name with basename
            let splitName = nodeName.split(SEPARATOR); 
            splitName[splitName.length - 1] = basename;
            let filename = splitName.join(SEPARATOR); 


            let fileInfoPane = fileModal.body.find('.bisweb-file-info');
            fileInfoPane.empty();

            if (filename.includes('.nii.gz')) {

                self.getFileInfo(filename).then( (fileInfo) => {
                    let fileInfoContent = $(`<p>${fileInfo}</p>`);
                    fileInfoPane.append(fileInfoContent);
                });
            } else {
                bis_genericio.read(filename).then( (obj) => {
                        let data = obj.data;
                        console.log('data', data);

                        let fileInfoPane = fileModal.body.find('.bisweb-file-info');
                        let content = $(`<pre>${data}</pre>`);
                        fileInfoPane.append(content);
                });
            }
        }
    }

    getFileInfo(filename) {
        return new Promise((resolve, reject) => {
            bis_genericio.getFileStats(filename).then((stats) => {

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

                //make info dialog
                let infoDisplay = `Name: ${filename}<br> File Size: ${roundedSize}${filetype}<br> First Created: ${createdTime}<br> Last Modified: ${modifiedTime}<br> Last Accessed: ${accessedTime}`;
                resolve(infoDisplay);
            }).catch((e) => { reject('There was an error getting file stats', e); });
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

                        //replace forward slashes with separator character for the given platform
                        srcFile = srcFile.replace(/[/]/g, SEPARATOR), dstFile = dstFile.replace(/[/]/g, SEPARATOR);

                        console.log('source', srcFile, 'dest', dstFile);
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
                            let fullname = this.baseDirectory + SEPARATOR + file;
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
                        'size': 'small',
                        'title': 'Confirm task rename',
                        'message': 'Rename task to ' + confirmName + '?',
                        'callback': renameFn.bind(this, newName)
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

        dropdownMenu[0].addEventListener('change', (e) => {
            e.preventDefault();
            popover.popover('hide');
        });

        popover.popover('show');
    }

    /**
     * Loads task data from a given task image in the tree, finds the appropriate task timings from the imported task file, and graphs it. 
     * Opened from the jstree context menu.
     * 
     * @param {Object} node - The node given by the contextmenu.
     */
    openTaskChart(node) {

        if (this.graphelement.hasTaskData()) {
                let parsedNode = this.fileTree.jstree(true).get_node(node.reference[0]);
            let filename = this.constructNodeName(parsedNode);

            console.log('filename', filename);
            let img = new BiswebImage();
            img.load(filename).then( () => {
                this.graphelement.parsePaintedAreaAverageTimeSeries(this.viewer, img);
            });
        } else {
            console.log('Could not find task data');
        }
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
     * Constructs the full filename of the node based on an identifier from a node in the tree. 
     * @param {Object} node - Object describing the jstree node, from tree.get_node, a reference passed by the contextmenu, etc. If not specified this will infer that the currently selected node is to be used. 
     */
    constructNodeName(node = null) {

        //construct the full name out of the current node 
        let name = '', currentNode = this.currentlySelectedNode;
        let tree = this.listContainer.jstree();

        if (node && node.id) {
            currentNode = tree.get_node(node.id);
        } else if (node && node.reference) {
            currentNode = tree.get_node(node.reference);
        }

        while (currentNode.parent) {
            name = '/' + currentNode.text + name;
            let parentNode = tree.get_node(currentNode.parent);

            currentNode = parentNode;
        }

        name = this.stripTaskName(name);
        let finalname = this.baseDirectory + name;

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


    createTagSelectMenu(options = {}) {

        let tagSelectMenu = webutil.createselect({
            values: IMAGETYPES,
            index: 0
        });
        tagSelectMenu.prop('disabled', '1');

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

        tagSelectMenu.on('change', (e) => {
            e.preventDefault();

            let index = tagSelectMenu.val();
            let selectedValue = IMAGEVALUES[index].toLowerCase();
            console.log('Index=', index, selectedValue);
            this.currentlySelectedNode.original.tag = selectedValue;

            //create bootbox modal with task select slider
            if (selectedValue.includes('task')) {
                createTaskSelectorWindow(this.currentlySelectedNode, this.listContainer);
            } else if (selectedValue.includes('rest')) {
                clearTagFromTree(this.currentlySelectedNode, this.listContainer);
            }

            //tag select menus can be created by popovers or statically in the file bar
            //in order for one to change when the other does, they should emit and listen to each other's events
            let tagChangedEvent = new CustomEvent('bisweb.tag.changed', { 'bubbles': true });
            document.dispatchEvent(tagChangedEvent);
        });

        return tagSelectMenu;



        function createTaskSelectorWindow(node, listContainer) {
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
                    let tree = listContainer.jstree();
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

                numberInput.on('keyup change', (e) => {
                    e.preventDefault();
                    let val = Math.abs(parseInt(numberInput.val(), 10) || minSliderValue);
                    val = val > maxSliderValue ? maxSliderValue : val;
                    box.find('.bootstrap-task-slider').slider('setValue', val);
                });

                box.find('.bootstrap-task-slider').on('slide', (e) => {
                    e.preventDefault();
                    numberInput.val(e.value);
                });
            });

            box.modal('show');
        }

        function clearTagFromTree(node, listContainer) {
            //trim parenthetical tag from name
            let splitName = node.text.split(/^\(task_\d+\)/);
            console.log('split name', splitName);
            if (splitName.length > 1) {
                let trimmedName = splitName.slice(1).join('');
                node.original.text = trimmedName;
                node.text = node.original.text;

                console.log('node', node);

                //update name displayed on file tree panel
                let tree = listContainer.jstree();
                tree.redraw(true);

                //dismiss popover manually 
                $('html').find('.popover').popover('hide');
            }
        }
    }

    changeTagSelectMenu(menu, node) {
        let selection = node.original.tag || 'image';
        selection = selection.toLowerCase();
        if (selection.includes('task')) {
            selection = 'Task';
        }

        let index = IMAGEVALUES.indexOf(selection);
        if (index < 0)
            index = 0;
        menu.val(index);
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
    showStudySettingsModal(node) {
        let nodeName = this.constructNodeName(node); 

        bis_bidsutils.getSettingsFile().then( (settings) => {
            let filename = bis_genericio.getBaseName(nodeName).split('.')[0]; //sometimes name may not include the extension
            
            //find the entry with the same filename as the one invoked from the contextmenu
            for (let file of settings.files) {
                if (file.name.includes(filename)) {
                    settings = file;
                    break;
                }
            }

            let settingsString;
            try {
                settingsString = JSON.stringify(settings, null, 2);
            } catch (e) {
                console.log('An error occured while trying to display settings', e);
            }

            bootbox.alert({
                'title': 'DICOM Job Settings',
                'message': `<pre>${settingsString}</pre>`,
                'backdrop': true,
                'scrollable': true,
            });
        });
    }

    /** Returns the current file tree
     * @returns The current file tree object.
     */
    getFileTree() {
        return this.fileTree;
    }


    /**
     * Invokes the program DCM2NII to parse raw DICOM images to NIFTI format.
     * Relies on the server for file system operations, e.g. running DCM2NII, creating temporary directories(see bin/bisfileserver.js for more details). 
     * When finished, this function will automatically invoke bis_bidsutils.dicom2BIDS to organize the flat file structure in the temp directory into BIDS format.
     * 
     * @param {String} inputDirectory 
     * @param {String} outputDirectory 
     */
    importDICOMImages(inputDirectory, outputDirectory, doBIDS = true) {

        if (!bis_webfileutil.candoComplexIO(true)) {
            console.log('Error: cannot import DICOM study without access to file server.');
            return;
        }

        let a = '';
        if (doBIDS)
            a = '/BIDS';

        webutil.createAlert('Converting raw DICOM files to NII' + a + ' format...', false, 0, 1000000000, { 'makeLoadSpinner': true });

        if (!bis_genericio.isDirectory(inputDirectory)) {
            inputDirectory = bis_genericio.getDirectoryName(bis_genericio.getNormalizedFilename(inputDirectory));
        }
        if (!bis_genericio.isDirectory(outputDirectory)) {
            outputDirectory = bis_genericio.getDirectoryName(bis_genericio.getNormalizedFilename(outputDirectory));
        }


        let promise = null;
        console.log('input directory', inputDirectory, 'output directory', outputDirectory);
        if (bis_genericio.getenvironment() === 'browser') {

            promise = bisweb_serverutils.runDICOMConversion({
                'fixpaths': true,
                'inputdirectory': inputDirectory,
                'outputdirectory': outputDirectory,
                'convertbids': doBIDS
            });
        } else {
            //if on electron just run the module directly
            let dicomModule = new DicomModule();
            promise = dicomModule.execute({}, { 'inputdirectory': inputDirectory, 'outputdirectory': outputDirectory, 'convertbids': doBIDS });
        }

        promise.then((fileConversionOutput) => {
            webutil.dismissAlerts();
            webutil.createLongInfoText(`<PRE>${fileConversionOutput.output}</PRE>`,'Dicom Conversion Output');
            let output = fileConversionOutput.output ? fileConversionOutput.output : fileConversionOutput;
            this.show();
            if (doBIDS)
                this.importBIDSDirectory(output);
        }).catch((e) => {
            webutil.createLongInfoText(`<PRE>${e.output}</PRE>`,'Dicom Conversion Output Error');
        });
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
        let splitBase = directory.split(SEPARATOR), formattedBase = null;
        for (let i = 0; i < splitBase.length; i++) {
            if (splitBase[i] === 'sourcedata') {
                formattedBase = splitBase.slice(0, i + 1).join(SEPARATOR);
            }
        }

        return formattedBase;
    }
};

webutil.defineElement('bisweb-studypanel', StudyPanel);
