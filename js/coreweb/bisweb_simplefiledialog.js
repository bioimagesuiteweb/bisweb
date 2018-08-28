const $ = require('jquery');
const localforage = require('localforage');
const webutil = require('bis_webutil.js');


require('jstree');

/**
 * When loading a file from the server, the user must be able to browse the files. 
 * This class will render a list of files in a window similar to the file system dialog that opens when a user clicks on an <input type='file'> button.
 * 
 * TODO: Back button breaks after adding supplemental files

 TODO:

 Eventually move save filename inside the dialog box -- one dialog box on save
 Have option to apply the filter on not 
 It would be nice to show date and filesize eventually (and sort by size)

*/


class SimpleFileDialog {

    constructor(options = {}) {


        this.separator='/';


        this.options= {
            'makeFavoriteButton' : options.makeFavouriteButton || false,
            'mode' :  options.mode || 'load',
            'modalName' :  options.modalName || 'File Server Dialog',
        };

        // Key Widgets
        this.modal=null;
        this.okButton=null;
        this.filenameEntry=null;

        
        // This are the callbacks 
        this.fileListFn=null;
        this.fileRequestFn=null;

        // Entries
        this.fileList = null;
        this.currentPath = null;
        this.currentDirectory = null;

        // Filter files
        this.filters='';
        this.filterMode=true;
        this.oldfilters='';
        this.previousList=null;
        console.log("Simple File Dialog Created",this.options);
    }

    // --------------- GUI Callbacks ------------------------
    /** 
     * Request Filename from GUI
     */
    filenameCallback(name=null) {

        if (name===null) {
            name='';
            try {
                name = this.filenameEntry.val() || '';
            } catch(e) {
                console.log("error",e);
                return;
            }
        }
        if (name.length>0) {
            this.modal.dialog.modal('hide');
            setTimeout( () => {

                console.log("Shipping=",this.currentDirectory+this.separator+name);
                console.log("To",this.fileRequestFn);
                
                this.fileRequestFn(this.currentDirectory+this.separator+name);
            },10);
        }
    }

    /** Request Directory
     * @param {String} dname -- the name of the directory
     */
    changeDirectory(dname) {
        this.fileListFn(this.options.mode, dname);
    }

    // --------------- Create GUI ------------------------------
    /**
     * Creates the elements of the file dialog that don't need to be redrawn regularly.
     * 
     * @param {Object} options - Options to specify which elements should be drawn to the dialog 
     */
    
    createDialogUserInterface() {

        this.modal = webutil.createmodal(this.options.modalName, 'modal-lg');
        $('body').append(this.modal);
        
        this.contentDisplayTemplate = 
        `<div class='col-sm-9 bisweb-file-display'>
            <div><p>Content goes here...</p></div>
        </div>`;

        //make the skeleton for the box
        this.container = $(
            `<div class='container-fluid'>
                <div class='row justify-content-start' style='margin-bottom:10px'>
                   <div class='col-sm-12 bisweb-file-navbar'></div>
                </div>

                <div class='row justify-content-start content-box'>
                    <div class='col-sm-3 favorite-bar'></div>
                    <div class='col-sm-9 bisweb-file-display'>
                      <div class='bisweb-file-list'><p>Content goes here...</p></div>
                    </div>
                </div>

                <div class='row justify-content-start content-box'>
                    <div class='col-sm-3'></div>
                    <div class='col-sm-9 bisweb-file-filterbar' style='margin-top:10px'></div>
                </div>
             </div>`);

        
        
        let favoriteBar = this.container.find('.favorite-bar');

        if (this.options.makeFavoriteButton) {
            let favoriteButton = $(`<button type='button' class='btn btn-sm btn-link'><span class='glyphicon glyphicon-star-empty'></span> Mark folder as favorite</button>`);
            favoriteBar.append(favoriteButton);
            
            let pillsHTML = $(`<ul class='nav nav-pills nav-stacked'></ul>`);
            favoriteBar.append(pillsHTML);
            
            let selectPillFromPills = (pill, pills) => {
                for (let otherPill of pills) {
                    $(otherPill).removeClass('active');
                }
                $(pill).addClass('active');
            };

            //TODO: add folder to localforage ...
            favoriteButton.on('click', (event) => {
                event.preventDefault();
                let key = webutil.getuniqueid(), name = this.currentPath[this.currentPath.length - 1];
                let favorite = {
                    'name' : name,
                    'path' : Array.from(this.currentPath),
                    'key' : key
                };

                localforage.setItem(key, JSON.stringify(favorite));

                //create the pill
                let pillsBar = favoriteBar.find('.nav.nav-pills');
                let newPill = $(`<li><a href='#'>${name}</a></li>`);
                newPill.on('click', (event) => {
                    event.preventDefault();
                    selectPillFromPills(newPill, pillsBar.find('li'));
                    localforage.getItem(key, (err, value) => {
                        let favoriteFolder;
                        try {
                            favoriteFolder = JSON.parse(value);
                            this.changeDirectory(favoriteFolder.path);
                        } catch(e) {
                            console.log('error parsing JSON', value);
                        }
                        
                    });
                });

                pillsBar.append(newPill);
            });
        }

        this.okButton = $(`<button type='button' class='btn btn-success'>Load</button>`);
        this.okButton.on('click', (event) => {
            event.preventDefault();
            this.filenameCallback();
        });

        this.modal.footer.append(this.okButton);        
        this.modal.body.append(this.container);        

    }
    
    /**
     * Adds the files specified by list to the file dialog. If the dialog is empty this effectively creates the dialog.
     * The list may also specify extra files fetched by the server, in which case startDirectory will designate the path at which they should be added.
     * 
     * NOTE: The file server that creates the file dialog will provide a few of its functions with the socket bound, e.g. fileListFn, to avoid sharing too many of its internal structures.
     * @param {Array} list - An array of file entries. 
     * @param {String} list.text - The name of the file or folder.
     * @param {String} list.type - What type of file or folder the entry represents. One of 'picture', 'html', 'js', 'text', 'video', 'audio', 'file', or 'directory'.
     * @param {String} list.path - The full path indicating where the file is located on the server machine.
     * @param {Array} list.children - File entries for each file contained in the list entry. Only for list entries of type 'directory'.
     * @param {Object} startDirectory - File entry representing the directory at which the files in list should be added. Undefined means the files represent the files in the current directory
     * @param {Object} opts - filter options
     */
    openDialog(list, startDirectory = null, opts=null) {

        if (this.modal===null)
            this.createDialogUserInterface();

        this.oldfilters=null;
        let initialfilename=null;
        
        if (opts!==null) {
            this.filters=opts.suffix || '';
            let newtitle=opts.title || null;
            if (newtitle) {
                let title = this.modal.header.find('.modal-title');
                title.text(newtitle+ ' (using bisweb fileserver)');
            }
            
            this.options.mode = opts.mode || 'load';
            
            if (this.options.mode === 'save') {
                this.okButton.text('Save');
                this.displayFiles = true;
            } else if (this.options.mode === 'dir') {
                this.okButton.text('Select Directory');
                this.displayFiles = false;
            } else {
                this.okButton.text('Load');
                this.displayFiles = true;
            }

            if (opts.initialFilename)
                initialfilename=opts.initialFilename;
            
        }
        console.log('Opts=',opts.initialfilename);
        
        this.fileList = list;
        this.currentDirectory = startDirectory;


        //keep track of the current directory for the navbar
        this.currentPath = startDirectory;
        this.container.find('.bisweb-file-navbar').empty();

        this.updateTree(list,initialfilename);

        if (!this.isVisible()) {
            this.modal.dialog.modal('show');
        }
    }

    /**
     * Creates the visual representation of the files specified by list. Called from createFileList (see notes there for format of file entries).
     * Uses jstree to render the list.
     * 
     * Sorts contents before display so that folders are shown first.
     * @param {Array} list - An array of file entries. 
     */
    updateTree(list,lastfilename=null) {

        this.previousList=JSON.parse(JSON.stringify(list));
        
        let fileList = this.container.find('.bisweb-file-list');
        fileList.remove();
        fileList = $(`<div class='bisweb-file-list'></div>`);


        let fileDisplay = this.container.find('.bisweb-file-display');
        fileList.empty();
        fileList.css({ 'max-height' : '300px',
                       'height'     : '300px',
                       'max-width'  : '600px',
                       "overflow-y": "auto",
                       "overflow-x": "auto",
                       "color" : "#0ce3ac",
                       "background-color": "#444444"
                     });

        
        //sort folders ahead of files

        if (!this.displayFiles) {
            let len=list.length-1;
            for (let i = len; i >=0; i=i-1) {
                if (list[i].type !== 'directory') {
                    list.splice(i, 1);
                    i--;
                } 
            }
            
            let filterbar=this.container.find('.bisweb-file-filterbar');
            filterbar.empty();
        } else if (this.filters) {

            if (this.filterMode===true) {
                let splitFilters = this.filters.split(',');
                if (splitFilters.length>0) {
                    let len=list.length-1;
                    for (let i = len; i >=0; i=i-1) {
                        if (list[i].type !== 'directory') {
                            let ok=this.checkFilenameForFilter(list[i].text,splitFilters);
                            if (!ok) {
                                list.splice(i,1);
                            }
                        }
                    }
                }
            }

            if (this.oldfilters !== this.filters) {
                let filterbar=this.container.find('.bisweb-file-filterbar');
                filterbar.empty();
                this.oldfilters=this.filters;
                
                let values = [ 'Selected: '+this.filters.split(',').join(', '),
                               'Show All Files' ];
                
                let filter_label=$("<span>Filter Files: </span>");
                filter_label.css({'padding':'10px'});
                filterbar.append(filter_label);
                let sel=webutil.createselect({
                    parent : filterbar,
                    values : [],
                    callback : (e) => {
                        if (e.target.value>0)
                            this.filterMode=false;
                        else
                            this.filterMode=true;
                        let name = this.filenameEntry.val() || '';
                        this.updateTree(this.previousList,name);
                    }
                });
                sel.empty();
                sel.append($(`<option value="0">${values[0]}</option>`));
                sel.append($(`<option value="1">${values[1]}</option>`));
            }
        }

        list.sort( (a, b) => {

            let isadir=(a.type === 'directory');
            let isbdir=(b.type === 'directory');

            if (isadir && !isbdir)
                return -1;
            if (isbdir && !isadir)
                return 1;

            let at=a.text.toLowerCase();
            let bt=b.text.toLowerCase();
            
            if (at>bt)
                return 1;
            if (at<bt)
                return -1;
            return 0;
        });

        
        fileList.jstree({
            'core': {
                'data': list,
                'dblclick_toggle': false
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

        //determine based on the type of the node what should happen when the user clicks on it
        $(fileList).on('select_node.jstree', (event, data) => {

            let fname=data.node.original.path;
            if (data.node.type === 'file' || data.node.type ==='picture') {

                let ind=fname.lastIndexOf(this.separator);
                let dname=fname;
                if (ind>0)
                    dname=fname.substr(ind+1,fname.length);
                this.filenameEntry.val(dname);
            } else if ( data.node.type=== 'directory') {
                this.changeDirectory(fname);
            }
        });


        fileDisplay.append(fileList);
        this.updateFileNavbar(lastfilename);
    }

    /**
     * Updates the list of folders at the top of the file dialog to reflect the folders in the current path.
     */
    updateFileNavbar(lastfilename=null) {
        let navbar = this.modal.body.find('.bisweb-file-navbar');
        navbar.empty();
        
        //create navbar buttons for each folder in the current path

        let folders=this.currentPath.split(this.separator);

        for (let i=folders.length-1;i>=0;i=i-1) {
            if (folders[i].length<1)
                folders.splice(i,1);
        }

        for (let i=0;i<folders.length;i++) {

            let newPath ='';
            for (let k=0;k<=i;k++) 
                newPath=newPath+'/'+folders[k];

            let button = $(`<button type='button' class='btn btn-sm btn-link'><span class='glyphicon glyphicon-folder-close'></span> ${folders[i]}</button>`);
            button.on('click', (event) => {
                event.preventDefault();
                this.fileListFn(this.options.mode, newPath);
            });
            
            navbar.append(button);
        }

        
        this.filenameEntry=$(`<input type='text'class="btn-link btn-sm" style="width:500px; border-style : dotted; border-color: white">`);
        if (!lastfilename)
            this.filenameEntry.val('');
        else
            this.filenameEntry.val(lastfilename);
        navbar.append(this.filenameEntry);
        this.filenameEntry.keypress( ( (ev) => {
            if ( ev.which == 13 ) {
                this.filenameCallback();
            }
        }));
    }


    /**
       * @returns {Boolean} if visible return true
       */
    isVisible() {
        let vis=this.modal.dialog.css('display');
        if (vis==='block') {
            return true;
        } 

        return false;
    }
    

    /**
     * Checks a proposed filename against a set of file extension filters to determine whether name should have another kind of filetype applied to it.
     * 
     * @param {String} name - A tentative filename
     * @param {String} filters - A set of file extensions separated by commas.
     * @returns A properly formatted filename
     */
    fixFilename(name, filters='') {

        console.log('name=',name,filters);
        
        let splitFilters = filters.split(',');
        if (splitFilters.length < 1) {
            console.log('No filters returning',name);
            return name;
        }
        
        for (let i=0;i<splitFilters.length;i++) {
            let filter=splitFilters[i];
            let nl=name.length;
            let fl=filter.length;
            if (nl>fl) {
                let subname=name.substr(nl-fl,fl);
                if (subname===filter) {
                    console.log('Matched filter',filter,subname,' returning',name);
                    return name;
                }
            }
        }

        console.log('Adding ',splitFilters[0]);
        return name + splitFilters[0];
    }

    checkFilenameForFilter(name,filterList) {

        if (filterList.length<1)
            return true;
        
        for (let i=0;i<filterList.length;i++) {
            let filter=filterList[i];
            let nl=name.length;
            let fl=filter.length;
            if (nl>fl) {
                let subname=name.substr(nl-fl,fl);
                if (subname===filter) {
                    return true;
                }
            }
        }
        return false;
        
    }
    



}

module.exports = SimpleFileDialog;
