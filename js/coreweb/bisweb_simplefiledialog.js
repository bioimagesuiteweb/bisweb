const $ = require('jquery');
const bis_genericio = require('bis_genericio');
const webutil = require('bis_webutil.js');
const bootbox=require('bootbox');
const userPreferences=require('bisweb_userpreferences');

require('jstree');

/**
 * When loading a file from the server, the user must be able to browse the files. 
 * This class will render a list of files in a window similar to the file system dialog that opens when a user clicks on an <input type='file'> button.
 * 
 * TODO: Back button breaks after adding supplemental files
*/


class SimpleFileDialog {

    constructor(options = {}) {


        this.separator='/';

        this.mode =  options.mode || 'load',
        this.modalName =  options.modalName || 'File Server Dialog',

        // Key Widgets
        this.modal=null;
        this.okButton=null;
        this.filenameEntry=null;

        
        // This are the callbacks
        // Call this to get updated directory
        this.fileListFn=null;
        // Call this to pass the selected filename back to the main code
        // (this is in fact the final callback from outside code)
        this.fileRequestFn=null;

        // Entries
        this.fileList = null;
        this.currentPath = null;
        this.currentDirectory = null;

        // Filter files
        this.currentFilters=[{ name: 'All Files', extensions: [] }];
        this.newFilters=true;
        this.activeFilterList=this.currentFilters[0].extensions;

        this.currentList = null;
        this.previousList=null;
        this.favorites = [];
        this.lastFavorite=null;

    }

    getCombinedFilename(dname,fname) {

        if (dname.lastIndexOf(this.separator)!==(dname.length - 1))
            return dname+this.separator+fname;
        return dname+fname;
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

        if (this.mode.indexOf('dir')>=0) {
            // Directory Mode
            if (name.length>0) {
                // Make a directory
                return this.createDirectoryCallback(name);
            }

            // We are done
            this.modal.dialog.modal('hide');
            setTimeout( () => {
                this.fileRequestFn(this.currentDirectory);
            },10);
        }
        
        
        if (name.length<1) {
            return;
        }

        let outname=this.getCombinedFilename(this.currentDirectory,name);
        
        let sendCallback= (() => {
            this.modal.dialog.modal('hide');
            setTimeout( () => {
                this.fileRequestFn(outname);
            },10);
        });
        
        
        if (this.mode!=='save') {
            return sendCallback();
        }

        // Save Stuff
        bis_genericio.getFileSize(outname).then( () => {
            bootbox.confirm("The file "+outname+" exists. Are you sure you want to overwrite this?", ( (result) => {
                if (result)  {
                    sendCallback();
                }
            }));
        }).catch( () => {
            outname=this.addExtensionToFilnameIfNeeded(outname,this.activeFilterList);
            sendCallback();
        });
    }


    createDirectoryCallback(name) {

        let newdir=this.getCombinedFilename(this.currentDirectory,name);
        
        bis_genericio.makeDirectory(newdir).then( () => {
            this.changeDirectory(newdir);
            webutil.createAlert('Created directory '+newdir,false);
        }).catch( (e) => {
            webutil.createAlert(e,true);
        });
    }

    /** Request Directory
     * @param {String} dname -- the name of the directory
     */
    changeDirectory(dname) {

        this.fileListFn( dname,false).then( (payload) => {
            this.updateDialog(payload.data,
                              payload.path,
                              payload.root);
        });
    }

    // --------------- Create GUI ------------------------------
    /**
     * Creates the elements of the file dialog that don't need to be redrawn regularly.
     * 
     * @param {Object} options - Options to specify which elements should be drawn to the dialog 
     */
    
    createDialogUserInterface() {

        this.modal = webutil.createmodal(this.modalName, 'modal-lg');
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

             <div class='row justify-content-start content-box'>
                <div class='col-sm-3 favorite-buttons'></div>
                <div class='col-sm-9 bisweb-file-filterbar' style='margin-top:5px'></div>
                </div>
            </div>`);

        
        
        this.createFavorites();

        
        this.okButton = $(`<button type='button' class='btn btn-success'>Load</button>`);
        this.okButton.css( { "margin-right" : "10px",
                             "width" : "200px",
                           });
        this.okButton.on('click', (event) => {
            event.preventDefault();
            this.filenameCallback();
        });

        
        this.modal.footer.prepend(this.okButton);
        this.modal.body.append(this.container);        


    }

    /**
     * Create Filters 
     * @param {Array} filters - An unparsed list of filters (Electron style)
     */
    createFilters(filters=null) {

        if (filters) {

            if (filters === 'DIRECTORY' || filters === 'directory') {
                this.currentFilters = [{ name: 'Directories', extensions: []}];
            } else {
                this.currentFilters=JSON.parse(JSON.stringify(filters));
            }
            
        }  else {
            this.currentFilters=[];
        }

        this.currentFilters.push({ name: 'All Files', extensions: [] });

        this.newFilters=true;
        this.activeFilterList=this.currentFilters[0].extensions;
    }
    
    /**
     * Adds the files specified by list to the file dialog. If the dialog is empty this effectively creates the dialog.
     * The list may also specify extra files fetched by the server, in which case startDirectory will designate the path at which they should be added.
     * 
     * NOTE: The file server that creates the file dialog will provide a few of its functions with the socket bound, e.g. fileListFn, to avoid sharing too many of its internal structures.
     * @param {Array} list - An array of file entries. 
     * @param {String} list.text - The name of the file or folder.
     * @param {String} list.path - The full path indicating where the file is located on the server machine.
     * @param {Object} opts - A parameter object for the file dialog.
     * @param {String} opts.mode - What mode the modal is in, either 'load' or 'save'.
     * @param {String} opts.title - The name to display at the top of the file dialog modal.
     * @param {Array} opts.filters - A list of filters for the file dialog. Only files that end in a filetype contained in opts.filters will be displayed. These are Electron style
     * @param {String} opts.startDirectory - This is the directory at which the file dialog will start (i.e. a user supplied path. If none supplied then this goes to the base directory of the server)
     * @param {Object} opts.rootDirectory - In case where the server has multiple "drives" or baseDirectories (/home /tmp --- rootDirectory of /home/xenios/Desktop is /home)
     */
    openDialog(list,opts=null) {

        if (this.modal===null) {
            this.createDialogUserInterface();
        }
        
        this.newFilters=true;
        //null or undefined startDirectory and rootDirectory should default to null;
        let startDirectory = opts.startDirectory || '';
        let rootDirectory = opts.rootDirectory || '';

        if (opts!==null) {
            opts.filters=opts.filters || null;

            console.log('opts.filters', opts.filters);
            this.createFilters(opts.filters);

            if (opts.title) {
                let newtitle=opts.title;
                if (newtitle) {
                    let title = this.modal.header.find('.modal-title');
                    if (opts.server === 'amazonaws') {
                        title.text(newtitle+ ' (using Amazon S3)');
                    } else {
                        title.text(newtitle + ' (using bisweb fileserver)');
                    }
                }
            }

            console.log('mode', opts.mode);
            if (opts.mode) 
                this.mode = opts.mode;

            if (this.mode === 'save') {
                this.okButton.text('Save');
            } else if (this.mode.indexOf('dir')>=0) {
                this.okButton.text('Select Directory');
            } else {
                this.okButton.text('Load');
            }
        }

        let initialfilename=null;
        if (opts!==null) {
            if (opts.initialFilename)
                initialfilename=opts.initialFilename;
        }

        console.log('opts.mode', opts.mode);
        if (opts.mode === 'directory') 
            this.activeFilterList = ['directories'];
        

        this.updateDialog(list,startDirectory,rootDirectory,initialfilename);
        this.modal.dialog.modal('show');
    }
    
    updateDialog(list,startDirectory,rootDirectory,initialfilename=null) {
        
        this.fileList = list;
        this.currentDirectory = startDirectory;
        
        //keep track of the current directory for the navbar
        this.currentPath = startDirectory;
        this.container.find('.bisweb-file-navbar').empty();
        
        
        let filterbar=this.container.find('.bisweb-file-filterbar');
        if (this.currentFilters.length<1) { 
            filterbar.empty();
            this.activeFilterList=[];
        } else if (this.newFilters===true) {
            filterbar.empty();
            this.newFilters=false;
            
            let filter_label=$("<span>Filter Files: </span>");
            filter_label.css({'padding':'10px'});
            filterbar.append(filter_label);
            let sel=webutil.createselect({
                parent : filterbar,
                values : [],
                callback : (e) => {
                    e.preventDefault();
                    let ind=parseInt(e.target.value);
                    if (ind>=0 && ind<this.currentFilters.length) {
                        if (this.currentFilters[ind].name === 'Directories') {
                            this.activeFilterList = ['directories'];
                        } else {
                            this.activeFilterList=this.currentFilters[ind].extensions;
                        }
                        this.updateTree(this.previousList,name,rootDirectory);
                    }
                }
            });
            sel.empty();

            let addOption= ((b) => {
                sel.append($(b));
            });

            for (let i=0;i<this.currentFilters.length;i++) {

                if (this.currentFilters[i].extensions.length>0) {
                    addOption(`<option value="${i}">${this.currentFilters[i].name}, (${this.currentFilters[i].extensions.join(',')})</option>`);
                } else {
                    addOption(`<option value="${i}">${this.currentFilters[i].name}</option>`);
                }
            }
        }

        /*if (this.mode === 'directory') {
            let filteredData = [];
            for (let file of list) {
                if (file.type === 'directory')
                    filteredData.push(file);
            }

            list = filteredData;
        }*/

        this.updateTree(list,initialfilename,rootDirectory);


    }

    /**
     * Creates the visual representation of the files specified by list. Called from createFileList (see notes there for format of file entries).
     * Uses jstree to render the list.
     * 
     * Sorts contents before display so that folders are shown first.
     * @param {Array} list - An array of file entries. 
     * @param {String} lastfilename - the last selected filename
     * @param {String} rootDirectory - "the drive" we are looking in

     */
    updateTree(list,lastfilename=null,rootDirectory=null) {

        this.previousList=JSON.parse(JSON.stringify(list));

        if (this.activeFilterList.length>0) {
            let len=list.length-1;
            for (let i = len; i >=0; i=i-1) {
                let ok = this.checkFilenameForFilter(list[i], this.activeFilterList);
                if (!ok) {
                    list.splice(i, 1);
                }
            }
        }
        
        //sort folders ahead of files
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


        
        let fileList = this.container.find('.bisweb-file-list');
        fileList.remove();
        fileList = $(`<div class='bisweb-file-list'></div>`);
        
        let fileDisplay = this.container.find('.bisweb-file-display');
        fileList.empty();
        


        let templates=webutil.getTemplates();
        let newid=webutil.createWithTemplate(templates.bisscrolltable,$('body'));
        let stable=$('#'+newid);
        let thead = stable.find(".bisthead");
        let tbody = stable.find(".bistbody",stable);
        let tmain = stable.find(".bistscroll",stable);

        tmain.css({ 'max-height' : '300px',
                    'height'     : '300px',
                    'max-width'  : '600px',
                    "color" : "#0ce3ac",
                    "background-color": "#444444"
                     });


        thead.empty();
        tbody.empty();
        tbody.css({'font-size':'13px',
                   'user-select': 'none'});
        thead.css({'font-size':'14px',
                   'user-select': 'none'});

        let elementlist=[];

        let callback = (e,doubleclick=false) => {
            e.preventDefault();
            e.stopPropagation();
            let id=e.target.id;
            if (!id) {
                id=e.target.parentElement.id;
                if (!id)
                    id=e.target.parentElement.parentElement.id;
            }

            let elem=elementlist[id];
            let fname=elem.path;
            if (elem.type === 'file' || elem.type ==='picture') {

                let ind=fname.lastIndexOf(this.separator);
                let dname=fname;
                if (ind>0)
                    dname=fname.substr(ind+1,fname.length);
                this.filenameEntry.val(dname);
                if (doubleclick) 
                    this.filenameCallback();

            } else if ( elem.type=== 'directory') {
                this.changeDirectory(fname);
            }
        };


        let max=list.length;
        for (let i=0;i<max;i++) {

            let elem=list[i];
            let nid=webutil.getuniqueid();

            let name=elem.text;
            let sz="";
            let c="";
            if (elem.type === 'directory') {
                c=`<span class='glyphicon glyphicon-folder-close'></span>&nbsp;`;
                name='<B>['+name+']</B>';
            } else {
                c=`<span class='glyphicon glyphicon-file'></span>&nbsp;`;
                sz=Number.parseFloat(list[i].size/(1024)).toFixed(2);
            }

            
            let w=$(`<tr>
                    <td width="80%"><span id="${nid}">${c} ${name}</span></td>
                    <td width="20%" align="right">${sz}</td></tr>
                    </tr>`);
            tbody.append(w);
            $('#'+nid).click( (e) => { callback(e,false); });
            $('#'+nid).dblclick( (e) => { callback(e,true);});

            elementlist[nid]=elem;
        }


        fileDisplay.append(fileList);
        fileList.append(stable);
        this.updateFileNavbar(lastfilename,rootDirectory);
    }

    /**
     * Updates the list of folders at the top of the file dialog to reflect the folders in the current path.
     * @param {String} lastfilename - the last selected filename
     * @param {String} rootDirectory - "the drive" we are looking in
     */
    updateFileNavbar(lastfilename=null,rootDirectory='/') {
        let navbar = this.modal.body.find('.bisweb-file-navbar');
        navbar.empty();

        if (this.currentPath===null)
            return;
        
        rootDirectory = rootDirectory || '';
        
        let folders=null;
        
        if (rootDirectory.length>1 && this.currentPath.length>=rootDirectory.length) {

            let p=this.currentPath.substr(rootDirectory.length+1,this.currentPath.length);
            let f=p.split(this.separator);
            folders=[ rootDirectory.substr(1,rootDirectory.length)].concat(f);
        } else {
            folders=this.currentPath.split(this.separator);
        }

        
        
        for (let i=folders.length-1;i>=0;i=i-1) {
            if (folders[i].length<1)
                folders.splice(i,1);
        }

        for (let i=-1;i<folders.length;i++) {

            let newPath ='';
            let b="";
            let name="";
            if (i===-1)
                b=`<span class='glyphicon glyphicon-folder-close'></span>`;
            if (i>=0) {
                for (let k=0;k<=i;k++) 
                    newPath=newPath+'/'+folders[k];

                name=folders[i]+'/';
            } else {
                newPath="[Root]";
                name=" [Root]";
            }
            let button = $(`<button type='button' class='btn btn-sm btn-link' style='margin:0px'>${b}${name}</button>`);
            button.on('click', (event) => {
                event.preventDefault();
                this.changeDirectory(newPath);
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

    addFavorite(pillsBar,elem) {

        let selectPillFromPills = (pill, pills) => {
            for (let otherPill of pills) {
                $(otherPill).removeClass('active');
            }
            $(pill).addClass('active');
        };

        let newPill = $(`<li><a href='#' class="active" style="padding: 2px 2px 2px 2px">${elem.name}</a></li>`);
        this.lastFavorite=elem.path;
        
        newPill.on('click', (event) => {
            event.preventDefault();
            selectPillFromPills(newPill, pillsBar.find('li'));
            this.changeDirectory(elem.path);
            this.lastFavorite=elem.path;
        });
        pillsBar.append(newPill);
    }

    addAllFavorites(pillsBar) {
        pillsBar.empty();
        let l=this.favorites.length;
        for (let i=0;i<l;i++) {
            this.addFavorite(pillsBar,this.favorites[i]);
        }
        this.lastFavorite=null;

    }
    
    createFavorites() {

        let favoriteBar = this.container.find('.favorite-bar');
        let favoriteButtons = this.container.find('.favorite-buttons');

        favoriteBar.css({ 'max-height' : '300px',
                          'height'     : '300px',
                          'max-width'  : '250px',
                          "overflow-y": "auto",
                          "overflow-x": "auto",
                          "color" : "#0ce3ac",
                          "background-color": "#444444"
                    });

        let favoriteButton = $(`<button type='button' class='btn btn-sm btn-link'><span class='glyphicon glyphicon-star-empty'></span>Bookmark</button>`);
        favoriteButtons.append(favoriteButton);
        let favoriteButton2 = $(`<button type='button' class='btn btn-sm btn-link'><span class='glyphicon glyphicon-remove'></span> Remove</button>`);
        favoriteButtons.append(favoriteButton2);

        let pillsHTML = $(`<ul class='nav nav-pills nav-stacked btn-sm'></ul>`);
        favoriteBar.append(pillsHTML);
        
        let pillsBar = favoriteBar.find('.nav.nav-pills');        
        
        //TODO: add folder to localforage ...
        favoriteButton.on('click', (event) => {
            event.preventDefault();
            if (this.favorites.length>8)
                return;
            let name = this.currentDirectory;
            if (name.length>23)
                name='___'+name.substr(name.length-23,name.length);
            let elem = {
                'name' : name,
                'path' : this.currentDirectory,
            };
            if (!this.favorites)
                this.favorites = [];

            let i=0,found=false;
            while (i<this.favorites.length && found===false) {
                if (elem.path===this.favorites[i].path)
                    found=true;
                i=i+1;
            }
            if (!found) {
                this.favorites.push(elem);
                this.addFavorite(pillsBar,elem);
                userPreferences.setItem('favoriteFolders',this.favorites,true);
            }
        });

        favoriteButton2.on('click', (event) => {
            event.preventDefault();
            let i=0;
            while (i<this.favorites.length) {
                if (this.lastFavorite===this.favorites[i].path) {
                    this.favorites.splice(i,1);
                    this.addAllFavorites(pillsBar);
                    userPreferences.setItem('favoriteFolders',this.favorites,true);
                    this.lastFavorite=null;
                    return;
                } 
                i=i+1;
            }
        });
            

        userPreferences.safeGetItem('favoriteFolders').then( (f) => {
            if (f) {
                this.favorites=f;
                this.addAllFavorites(pillsBar);
            }
        }).catch( (e) => {
            console.log('Error',e);
        });
    }
    

    /**
     * Checks a proposed filename against a set of file extension filters to determine whether name should have another kind of filetype applied to it.
     * 
     * @param {String} name - A tentative filename
     * @param {Array} filtersList- A string set of file extensions
     * @returns A properly formatted filename
     */
    addExtensionToFilnameIfNeeded(name, filterList) {
        if (!filterList)
            return name;

        if (filterList.length<1)
            return name;
        
        for (let i=0;i<filterList.length;i++) {
            let filter=filterList[i];
            let nl=name.length;
            let fl=filter.length;
            if (nl>fl) {
                let subname=name.substr(nl-fl,fl);
                if (subname===filter) {
                    //console.log('Matched filter',filter,subname,' returning',name);
                    return name;
                }
            }
        }
        return name + '.'+ filterList[0];
    }

    checkFilenameForFilter(entry, filterList) {
        let name = entry.text;
        if (filterList.length<1)
            return true;
        
        //if checking for directories only return names with no extension
        if (filterList === 'directory') {
            return entry.type === 'directory';
        }

        //otherwise check if non-directories match the filters and return true for directories
        if (name.split('.').length > 1) {
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
        } else {
            return true;
        }

        return false;
    }
    



}

 /**
     * Creates the visual representation of the files specified by list. Called from createFileList (see notes there for format of file entries).
     * Uses jstree to render the list.
     * 
     * Sorts contents before display so that folders are shown first.
     * @param {Array} list - An array of file entries. 
     * @param {String} lastfilename - the last selected filename
     * @param {String} rootDirectory - "the drive" we are looking in

     */
   /* updateTreeOld(list,lastfilename=null,rootDirectory=null) {

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


        if (this.activeFilterList.length>0) {
            let len=list.length-1;
            for (let i = len; i >=0; i=i-1) {
                if (list[i].type !== 'directory') {
                    let ok=this.checkFilenameForFilter(list[i].text,this.activeFilterList);
                    if (!ok) {
                        list.splice(i,1);
                    }
                }
            }
        }
        
        //sort folders ahead of files
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
        this.updateFileNavbar(lastfilename,rootDirectory);
    } */

module.exports = SimpleFileDialog;
