const $ = require('jquery');
const bisweb_panel = require('bisweb_panel.js');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
require('jstree');

/**
 * <bisweb-treepanel
 *  bis-layoutwidgetid = '#viewer_layout'
 *  bis-viewerid = '#orthoviewer'>
 * </bisweb-treepanel>
 *  
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 *      bis-menubarid: menu to which to add a tab that will open the panel
 */
class FileTreePanel extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {

        this.viewerid=this.getAttribute('bis-viewerid');
        this.layoutid=this.getAttribute('bis-layoutwidgetid');
        this.menubarid = this.getAttribute('bis-menubarid');
        this.viewerappid = this.getAttribute('bis-viewerapplicationid');

        bis_webutil.runAfterAllLoaded( () => {

            this.viewer = document.querySelector(this.viewerid);
            this.layout = document.querySelector(this.layoutid);
            this.menubar = document.querySelector(this.menubarid);
            this.viewerapplication = document.querySelector(this.viewerappid);

            this.panel=new bisweb_panel(this.layout,
                {  name  : 'Files',
                   permanent : false,
                   width : '290',
                   dual : false,
                   mode : 'sidebar',
                });
            
            
            this.addMenuItem(this.menubar.getMenuBar());

            let listElement = this.panel.getWidget();
            this.makeButtons(listElement);
        });

    }

    /**
     * Inspects the top menubar for a 'File' item and adds the 'Show File Tree Panel' menu item under it. 
     * @param {JQuery} menubar - The menubar at the top of the document.
     */
    addMenuItem(menubar) {
        let menuItems = menubar[0].children;

        for (let item of menuItems) {

            //Look for the word 'File' in the menu item
            if (item.innerText.indexOf('File') !== -1) {
                //get .dropdown-menu from HTMLCollection item.children
                for (let childItem of item.children) {
                    if (childItem.className.indexOf('dropdown-menu') !== -1) {

                        let dropdownItem = bis_webutil.createMenuItem($(childItem), 'File Tree Panel');
                        dropdownItem.on('click', (e) => {
                            e.preventDefault();
                            this.panel.show();
                        });

                        return true;
                    }
                }
            }
        }

        console.log('could not find \'File\' menu item, cannot add File Tree Panel item to it');
        return false;
    }

    importFiles(filename) {
        console.log('filename', filename);
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

        //if it does then update the file tree with just that file. otherwise look one level deeper for the whole study
        bis_genericio.getMatchingFiles(queryString).then( (files) => {
            if (files.length > 0) {
                this.updateFileTree(files, filename);
                return;
            } 
            
            queryString = filename + '/*.nii*';
            bis_genericio.getMatchingFiles(queryString).then( (newFiles) => {
                console.log('filename', filename);
                this.updateFileTree(newFiles, filename);
            });
            
        });

    }

    /**
     * Populates the file tree panel with a list of files.
     * @param {Array} files - A list of file names. 
     * @param {String} baseDirectory - The directory which importFiles was originally called on.
     */
    updateFileTree(files, baseDirectory) {
        this.baseDirectory = baseDirectory;

        let fileTree = [];

        for (let file of files) {
            //trim the common directory name from the filtered out name
            let trimmedName = file.replace(baseDirectory, '');
            let splitName = trimmedName.split('/');

            let index = 0, currentDirectory = fileTree, nextDirectory = null;

            //find the entry in file tree
            while (index < splitName.length) {

                nextDirectory = findParentAtTreeLevel(splitName[index], currentDirectory);
                
                //if the next directory doesn't exist, create it, otherwise return it.
                if (!nextDirectory) {

                    //type will be file if the current name is at the end of the name (after all the slashes), directory otherwise
                    let newEntry = {
                        'text' : splitName[index]
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
        if (!fileTree[0] || !fileTree[0].children) {
            bis_webutil.createAlert('No study files could be found in the chosen directory, try a different directory.', false);
            return;
        }

        let listElement = this.panel.getWidget();
        listElement.find('.file-container').remove();

        let listContainer = $(`<div class='file-container'></div>`);
        listContainer.css({ 'color' : 'rgb(12, 227, 172)' });
        listElement.prepend(listContainer);
        

        //some data sources produce trees where the files are contained in an empty directory, so unwrap those if necessary.
        if (fileTree.length === 1 && fileTree[0].text === '') { 
            fileTree = fileTree[0].children; 
        }

        let tree = listContainer.jstree({
            'core': {
                'data': fileTree,
                'dblclick_toggle': true,
                'check_callback' : true
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
            'plugins': ["types", "dnd", "contextmenu"]
        }).bind('move_node.jstree', (e, data) => {
            console.log('e', e, 'data', data);
            let moveNodes = this.parseSourceAndDestination(data);
            bis_genericio.moveDirectory(moveNodes.src + '&&' + moveNodes.dest);
        });

        listContainer.bind('dblclick.jstree', (e) => {
            console.log('event', e);
            this.loadImageFromTree();
        });

        let loadImageButton = this.panel.widget.find('.load-image-button');
        loadImageButton.prop('disabled', false);

        let saveStudyButton = this.panel.widget.find('.save-study-button');
        saveStudyButton.prop('disabled', false);

        this.setOnClickListeners(listContainer);

        this.fileTree = fileTree;

        //Searches for the directory that should contain a file given the file's path, e.g. 'a/b/c' should be contained in folders a and b.
        //Returns the children 
        function findParentAtTreeLevel(name, entries) {
            for (let entry of entries) {
                if (entry.text === name) {
                    return entry.children;
                }
            }

            return false;
        }
    }

    /**
     * Makes the buttons that import a study into the files tab and load an image. 
     * 
     * @param {HTMLElement} listElement - The element of the files tab where the buttons should be created.
     */
    makeButtons(listElement) {
        let buttonGroupDisplay = $(`
            <div class='btn-group'>
                <div class='btn-group top-bar' role='group' aria-label='Viewer Buttons' style='float: left;'>
                </div>
                <br>
                <div class='btn-group bottom-bar' role='group' aria-label='Viewer Buttons' style='float: left;'>
                </div>
            </div>
        `);
        let topButtonBar = buttonGroupDisplay.find('.top-bar');
        let bottomButtonBar = buttonGroupDisplay.find('.bottom-bar');

        //Route study load and save through bis_webfileutil file callbacks
        let loadStudyButton = bis_webfileutil.createFileButton({
            'type': 'info',
            'name': 'Import study',
            'callback': (f) => {
                this.importFiles(f);
            },
        }, {
                'title': 'Import study',
                'filters': 'DIRECTORY',
                'suffix': 'DIRECTORY',
                'save': false,
        });

        let saveStudyButton = bis_webfileutil.createFileButton({
            'type': 'primary',
            'name': 'Export study',
            'callback': (f) => {
                this.exportStudy(f);
            },
        }, {
                'title': 'Export study',
                'filters': 'DIRECTORY',
                'suffix': 'DIRECTORY',
                'save': true,
        });

        saveStudyButton.addClass('save-study-button');
        saveStudyButton.prop('disabled', 'true');


        let loadImageButton = $(`<button type='button' class='btn btn-success btn-sm load-image-button' disabled>Load image</button>`);
        loadImageButton.on('click', () => {
            this.loadImageFromTree();
        });

        topButtonBar.append(loadImageButton);
        topButtonBar.append(loadStudyButton);
        bottomButtonBar.append(saveStudyButton);

        listElement.append(`<br>`);
        listElement.append(buttonGroupDisplay);
    }
    /**
     * Sets the jstree select events for a new jstree list container. 
     * 
     * @param {HTMLElement} listContainer - The div that contains the jstree object.
     */
    setOnClickListeners(listContainer) {
        listContainer.on('select_node.jstree', (event, data) => {
            console.log('select node', data);

            if (data.node.original.type === 'directory') {
                data.instance.open_node(this, false);
                this.currentlySelectedNode = data.node
            } else if (data.node.original.type === 'picture') {
                this.currentlySelectedNode = data.node;
            }
        });
    }

    /**
     * Loads an image selected in the file tree and displays it on the viewer. 
     */
    loadImageFromTree() {
        console.log('currently selected node', this.currentlySelectedNode, 'base directory', this.baseDirectory);
        if (this.currentlySelectedNode.original.type === 'picture') {
            //construct the full name out of the current node 
            let name = '', currentNode = this.currentlySelectedNode;
            let tree = this.panel.widget.find('.file-container').jstree();

            while (currentNode.parent) {
                name = '/' + currentNode.text + name;
                let parentNode = tree.get_node(currentNode.parent);

                console.log('parentNode', parentNode);
                currentNode = parentNode;
            }

            this.viewerapplication.loadImage(this.baseDirectory + name);
        }
    }

    /**
     * Saves a the current list of study files to whichever storage service the user has selected, e.g. the local file system, Amazon AWS, etc.
     * The list will be saved as a .json file with the study files nested the same way as the file tree.
     * 
     * @param {String} filepath - The path to save the file to. 
     */
    exportStudy(filepath) {
        try {
            let stringifiedFiles = JSON.stringify(this.fileTree);
            console.log('stringified files', stringifiedFiles, 'path', filepath);

            //set the correct file extension if it isn't set yet
            let splitPath = filepath.split('.');
            if (splitPath.length < 2 || splitPath[1] !== 'JSON' || splitPath[1] !== 'json') {
                splitPath[1] = 'json';
            }

            filepath = splitPath.join('.');
            bis_genericio.write(filepath, stringifiedFiles, false);
        } catch(e) {
            console.log('an error occured while saving to disk', e);
            bis_webutil.createAlert('An error occured while saving the study files to disk.', false);
        }
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
        return { 'src' : srcName, 'dest' : destName};
    }

}

bis_webutil.defineElement('bisweb-filetreepanel', FileTreePanel);