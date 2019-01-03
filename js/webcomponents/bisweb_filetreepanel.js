const $ = require('jquery');
const bootbox = require('bootbox');
const bisweb_panel = require('bisweb_panel.js');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
const userPreferences = require('bisweb_userpreferences.js');

require('jstree');

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
 *      bis-menubarid: menu to which to add a tab that will open the panel
 */
class FileTreePanel extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {

        this.viewerid=this.getAttribute('bis-viewerid');
        this.viewertwoid = this.getAttribute('bis-viewerid2');
        this.layoutid=this.getAttribute('bis-layoutwidgetid');
        this.menubarid = this.getAttribute('bis-menubarid');
        this.viewerappid = this.getAttribute('bis-viewerapplicationid');

        bis_webutil.runAfterAllLoaded(() => {
			console.log('run after all loaded');
            userPreferences.safeGetItem("internal").then((f) => {
                this.viewer = document.querySelector(this.viewerid);
                this.viewertwo = document.querySelector(this.viewertwoid) || null;
                this.layout = document.querySelector(this.layoutid);
                this.menubar = document.querySelector(this.menubarid);
                this.viewerapplication = document.querySelector(this.viewerappid);
                this.popoverDisplayed = false;
                this.staticTagSelectMenu = null;

                this.panel = new bisweb_panel(this.layout,
                    {
                        name: 'Files',
                        permanent: false,
                        width: '400',
                        dual: true,
                        mode: 'sidebar',
                    });

                if (f) {
                    this.addMenuItem(this.menubar.getMenuBar());
                }

                let listElement = this.panel.getWidget();
                let biswebElementMenu = $(`<div class='bisweb-elements-menu'></div>`);

                listElement.append(biswebElementMenu);
                this.makeButtons(listElement);
            });

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
            'Info' : {
                'separator_before': false,
                'separator_after': false,
                'label': 'File Info',
                'action': () => {
                    this.showInfoModal();
                }
            },
            'Load' : {
                'separator_before': false,
                'separator_after': false,
                'label': 'Load Image',
                'action': () => {
                    this.loadImageFromTree();
                }
            },
            'Tag' : {
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
                bis_webutil.createAlert('Loaded study from ' + filename, false, 0, 3000);
                return;
            } 
            
            queryString = filename + '/*.nii*';
            bis_genericio.getMatchingFiles(queryString).then( (newFiles) => {
                console.log('filename', filename);

                bis_webutil.createAlert('Loaded study from ' + filename, false, 0, 3000);
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

        console.log('files', files);
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
                'show_at_node' : false,
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

            console.log('new settings', newSettings);
            newSettings = Object.assign(newSettings, {
                'Viewer1' : {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Load Image to Viewer 1',
                    'action': () => {
                        this.loadImageFromTree(0);
                    }
                },
                'Viewer2' : {
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

        let loadImageButton = this.panel.widget.find('.load-image-button');
        loadImageButton.prop('disabled', false);

        let saveStudyButton = this.panel.widget.find('.save-study-button');
        saveStudyButton.prop('disabled', false);

        if (!this.renderedTagSelectMenu) {

            //append the tag selecting menu to the bottom of the file tree div
            let tagSelectDiv = $(`<div></div>`);
            this.staticTagSelectMenu = this.createTagSelectMenu({ 'setDefaultValue' : false, 'listenForTagEvents' : true });
            tagSelectDiv.append(this.staticTagSelectMenu);

            let elementsDiv = $('.bisweb-elements-menu');
            elementsDiv.prepend(tagSelectDiv);
            elementsDiv.prepend($(`<br><label>Tag Selected Element:</label></br>`));
            this.renderedTagSelectMenu = true;
        } else {
            $('.bisweb-elements-menu').find('select').prop('disabled', 'disabled');
        }

        //attach listeners to new file tree
        this.setOnClickListeners(tree, listContainer);
        this.fileTree = tree;

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
        }, 
        {
            'title': 'Export study',
            'filters': 'DIRECTORY',
            'suffix': 'DIRECTORY',
            'save': true,
            initialCallback: () => { return this.getDefaultFilename(); },
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
            console.log('select_node', data);
            $('.bisweb-elements-menu').find('select').prop('disabled', '');
            this.currentlySelectedNode = data.node;

            this.changeTagSelectMenu(this.staticTagSelectMenu, data.node);

            if (data.event.type === 'click') {
                handleLeftClick(data);
            } else if (data.event.type === 'contextmenu') {
                handleRightClick(data);
            }
        });

        tree.bind('dblclick.jstree', (e) => {
            console.log('dblclick', e);
            handleDblClick();
        });
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
     * Saves a the current list of study files to whichever storage service the user has selected, e.g. the local file system, Amazon AWS, etc.
     * The list will be saved as a .json file with the study files nested the same way as the file tree.
     * 
     * @param {String} filepath - The path to save the file to. 
     */
    exportStudy(filepath) {
        try {

            //reconstruct tree from jstree
            let rawTree = this.fileTree.jstree(true);
            let rawTreeJSON = rawTree.get_json('#'); 
            let reconstructedTree = [];

            let fillTreeNode = (node, parentNode) => {
                console.log('fill tree node', node);
                let item = rawTree.get_node(node.id);
                let newNode = item.original;
                if (item.children.length > 0) {
                    newNode.children = [];
                    for (let child of node.children) {
                        fillTreeNode(child, newNode);
                    }
                }

                if (parentNode) {
                    parentNode.children.push(newNode);
                } else {
                    reconstructedTree.push(newNode);
                }
                    
            }; 

            console.log('raw tree json', rawTreeJSON);
            for (let item of rawTreeJSON) { fillTreeNode(item); }

            console.log('reconstructed tree', reconstructedTree);

            //all BIDS files are presumably created at the same time so just use the timestamp for one of them
            bis_genericio.getFileStats(this.baseDirectory).then( (stats) => {
            	let date = new Date(stats.birthtimeMs);
            	let dataContainer = {
            		'date' : parseDate(date),
            		'study' : reconstructedTree
            	}

            	let stringifiedFiles = JSON.stringify(dataContainer);
	            //set the correct file extension if it isn't set yet
	            let splitPath = filepath.split('.');
	            if (splitPath.length < 2 || splitPath[1] !== 'JSON' || splitPath[1] !== 'json') {
	                splitPath[1] = 'json';
            	}

	            filepath = splitPath.join('.');
	            bis_genericio.write(filepath, stringifiedFiles, false);
            });
            
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

    showInfoModal() {

        bis_genericio.isDirectory(this.constructNodeName()).then( (isDirectory) => {
            bis_genericio.getFileStats(this.constructNodeName()).then( (stats) => { 

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
                let infoDisplay = `File Size: ${roundedSize}${filetype}<br> First Created: ${createdTime}<br> Last Modified: ${modifiedTime}<br> Last Accessed: ${accessedTime} <br> Is a Directory: ${parsedIsDirectory} <br> Tag: ${this.currentlySelectedNode.original.tag}`;
    
                bootbox.dialog({
                    'title' : 'File Info',
                    'message' : infoDisplay
                });
            });
        });
        
    }

    openTagSettingPopover(node) {
        let popover = $(`<a href='#' data-toggle='popover' title='Select Tag'></a>`);
        let dropdownMenu = this.createTagSelectMenu({ 'enabled' : true, 'setDefaultValue' : true });

        $(node.reference.prevObject[0]).append(popover);
        popover.popover({ 
            'html' : true,
            'content' : dropdownMenu,
            'trigger' : 'manual', 
            'container' : 'body'
        });
        
        //set flag to dismiss popover if user clicks area outside
        popover.on('shown.bs.popover', () => {
            this.popoverDisplayed = true;
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

        return this.baseDirectory + name;

    }

    createTagSelectMenu(options = {}) {

        let tagSelectMenu = $(
        `<select class='form-control' disabled> 
            <option value='none'></option>
            <option value='sagittal'>Sagittal</option>
            <option value='coronal'>Coronal</option>
        </select>`
        );
        
        console.log('options', options, 'tag select menu', tagSelectMenu);
        if (options.enabled) { tagSelectMenu.prop('disabled', ''); }

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

            //tag select menus can be created by popovers or statically in the file bar
            //in order for one to change when the other does, they should emit and listen to each other's events
            let tagChangedEvent = new CustomEvent('bisweb.tag.changed', { 'bubbles' : true });
            document.dispatchEvent(tagChangedEvent);
        });

        return tagSelectMenu;
    }

    changeTagSelectMenu(menu, node) {
        let defaultSelection = node.original.tag || "none";

        //clear selected options
        let options = menu.find('option');
        for (let i = 0; i < options.length; i++) {
            options[i].removeAttribute('selected');
        }

        menu.find(`option[value=${defaultSelection}]`).prop('selected', true);
        //menu.html(defaultSelection);
        console.log('default selection', defaultSelection);
    }
    
    getDefaultFilename() {
        let date = new Date();
        let parsedDate = 'ExportedStudy' + date.getFullYear() + '-' + date.getMonth() + 1 + '-' + zeroPadLeft(date.getDate()) + 'T' + zeroPadLeft(date.getHours()) + ':' + zeroPadLeft(date.getMinutes()) + ':' + zeroPadLeft(date.getSeconds());
        console.log('date', parsedDate);
        return parsedDate + '.json';

        
    }
}

let parseDate = (date) => {
	return date.getFullYear() + '-' + date.getMonth() + 1 + '-' + zeroPadLeft(date.getDate()) + 'T' + zeroPadLeft(date.getHours()) + ':' + zeroPadLeft(date.getMinutes()) + ':' + zeroPadLeft(date.getSeconds());
	
	function zeroPadLeft(num) { 
		let pad = '00', numStr = '' + num;
        return pad.substring(0, pad.length - numStr.length) + numStr;
    }
}

bis_webutil.defineElement('bisweb-filetreepanel', FileTreePanel);
