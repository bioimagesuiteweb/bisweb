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

        bis_webutil.runAfterAllLoaded( () => {

            this.viewer = document.querySelector(this.viewerid);
            this.layout = document.querySelector(this.layoutid);
            this.menubar = document.querySelector(this.menubarid);

            this.panel=new bisweb_panel(this.layout,
                {  name  : 'Files',
                   permanent : false,
                   width : '290',
                   dual : false,
                   mode : 'sidebar',
                });
            
            
            this.addMenuItem(this.menubar.getMenuBar());

            let list = [
                {
                    'text' : 'a file',
                    'type' : 'directory',
                    'children' : [
                        {
                            'text' : 'a child file',
                            'type' : 'file'
                        }
                    ]
                },
                {
                    'text' : 'picture',
                    'type' : 'picture'
                }
            ];

            let listElement = this.panel.getWidget();
            let listContainer = $(`<div class='file-container'></div>`);
            listContainer.css({ 'color' : 'rgb(12, 227, 172)' });
            listElement.append(listContainer);

            listContainer.jstree({
                'core': {
                    'data': list,
                    'dblclick_toggle': true
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
                'plugins': ["types"]
            });

            let buttonBar =  $(`<div class='btn-group' role=group' aria-label='Viewer Buttons' style='float: left'></div>`);

            //Route study load through bis_webfileutil file callbacks
            let loadButton = bis_webfileutil.createFileButton({
                'type': 'info',
                'name': 'Import Study',
                'callback' : (f) => {
                        this.importFiles(f);
                    },
                }, {
                    title: 'Import study',
                    'filters': 'DIRECTORY',
                    'suffix': 'DIRECTORY',
                    'save': false,
                });

            /*bis_webfileutil.attachFileCallback(loadButton, null, {
                'title' : 'Load Study',
                'filter' : 'DIRECTORY',
                'suffix' : 'DIRECTORY',
                'callback' : () => {
                    console.log('hello from filetreepanel callback');
                }
            });*/

            buttonBar.append(loadButton);
            listElement.append(`<br>`);
            listElement.append(buttonBar);
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

                        console.log('adding file tree panel menu item');
                        let dropdownItem = bis_webutil.createDropdownItem($(childItem), 'File Tree Panel');
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
        let queryString = filename + '/*';
        console.log('query string', queryString);
        bis_genericio.getMatchingFiles(queryString).then( (files) => {
            console.log('files', files);
        });

    }

    /**
     * Populates the file tree panel with a list of files.
     * @param {Object} files 
     */
    updateFileTree(files) {

    }


}

bis_webutil.defineElement('bisweb-treepanel', FileTreePanel);