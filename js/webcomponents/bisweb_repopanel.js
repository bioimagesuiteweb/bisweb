const $ = require('jquery');
const bootbox = require('bootbox');
const webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
const bisweb_taskutils = require('bisweb_taskutils.js');
const bisweb_panel = require('bisweb_panel.js');
const BisWebTaskManager = require('bisweb_studytaskmanager');
const BisWebImage = require('bisweb_image.js');
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
 */




const IMAGETYPES = ['Image', 'Task', 'Rest', 'DWI', '3DAnat', '2DAnat'];
const IMAGEVALUES = ['image', 'task', 'rest', 'dwi', '3danat', '2danat'];

class RepoPanel extends HTMLElement {

    constructor() {
        super();
        this.listContainer = null;
        this.elementsContainer = null;
        this.taskManager = null;
        this.created=false;
        this.filelist=[];
        this.currentlySelectedNode=null;
    }

    createGUI() {

        if (this.created)
            return;
        
        this.viewerid = this.getAttribute('bis-viewerid');
        this.viewertwoid = this.getAttribute('bis-viewerid2');
        this.layoutid = this.getAttribute('bis-layoutwidgetid');
        this.viewerappid = this.getAttribute('bis-viewerapplicationid');
        this.viewer = document.querySelector('#'+this.viewerid);
        this.viewertwo = document.querySelector('#'+this.viewertwoid) || null;
        this.layout = document.querySelector('#'+this.layoutid);
        this.viewerapplication = document.querySelector('#'+this.viewerappid);

        this.panel = new bisweb_panel(this.layout, {
            name: 'Repository Panel',
            permanent: false,
            width: '600',
            dual: false,
            mode: 'sidebar',
            helpButton: true
        });

        let parent=this.panel.getWidget();
        
        const self=this;
        let top= $(`<div></div>`);
        parent.append(top);
        
        webutil.createbutton({
            'name' : 'Connect to Repository',
            'type ' : 'success',
            'parent' : top,
            'callback' : () => { self.openDirectoryPrompt(); }
        });

        parent.append($('<HR width="90%">'));
        this.listContainer = $(`<div></div>`);
        parent.append(this.listContainer);

        parent.append($('<HR width="90%">'));
        
        
        this.contextMenuDefaultSettings = {
            'Info': {
                'separator_before': false,
                'separator_after': false,
                'label': 'File Info',
                'action': (node) => {
                    this.createFileInfoModal(node);
                }
            },
            'Display': {
                'separator_before': false,
                'separator_after': false,
                'label': 'Display Image',
                'action': () => {
                    this.displayImageFromTree(0,false);
                },
            },
            'DisplayOverlay': {
                'separator_before': false,
                'separator_after': false,
                'label': 'Display Overlay',
                'action': () => {
                    this.displayImageFromTree(0,true);
                }
            }
        };
        this.created=true;
    }

    /**
     * Shows file tree panel in the sidebar.
     */
    show() {
        this.createGUI();
        this.panel.show();
        this.openDirectoryPrompt();
    }

    getAttributes(ln) {

        //console.log('=======================\n',ln,'\n');
        const lst=ln.split('</td>');
        const l=lst.length;
        //console.log('lst',lst.join('___'),l);
        const out = [ lst[l-4], lst[l-3] ];
        //console.log('Out=',out);
        for (let i=0;i<=1;i++) {
            let a=(out[i].split('>'));
            //   console.log(a.join('___'));
            a=a[1].trim();
            out[i]=a;
        }
        return '[' + out.join(', ') + ']';
    }

    openDirectoryPrompt() {
        
        bootbox.prompt("Enter the URL to connect. Blank=Dartmouth root.", (result) => {
            if (result=='')
                result='http://bisweb.yale.edu/data/sub-rid000001';
            if (result.lastIndexOf('/')!==result.length-1)
                result=result+'/';
            this.openDirectory(result);
        });
    }

    async parseItem(url,depth=0,maxdepth=2) {

        let lst = [];
        let obj=null;

        console.log('R E A D I N G '+url);
        
        try {
            obj=await bis_genericio.read(url);
        } catch(e) {
            console.log('Error'+e);
            return lst;
        }

        const extlist = [ 'json','bval','bvec' ];
        
        console.log('Continuing'+obj.filename);
        
        let data=obj.data.split('\n');
        for (let i=0;i<data.length;i++) {
            let index=data[i].indexOf('href');
            let index2=data[i].indexOf('alt');
            if (index>=0 && index2>=0) {

                let link=data[i].substr(index+6,1000);
                let endind=link.indexOf('"');
                link=link.substr(0,endind).trim();
                
                let tp=data[i].substr(index2+6,20);
                let endind2=tp.indexOf(']');
                tp=tp.substr(0,endind2).trim();

                let lastdot=link.lastIndexOf('.');
                let extension=link.substr(lastdot+1,1000).trim().toLowerCase();
                if (extlist.indexOf(extension)>=0) {
                    tp='TXT';
                }


                let isback=(data[i].indexOf('icons/back.gif')>=0);
                if (tp==="DIR" || tp==="PARENTDIR"  || tp=='' || tp==='TXT') {

                    let fullurl=url+link;
                    let nm=fullurl.lastIndexOf('/',url);
                    fullurl=fullurl.substr(0,nm)+'/';

                    
                    if (tp==='DIR') {
                        if (!isback) {
                            let a=link.lastIndexOf('/index.html');
                            let linkname=link.substr(0,a);
                            
                            let dt={
                                'type' : 'directory',
                                'text' : '['+linkname+']',
                                'link' : fullurl,
                                'opened': false,
                                'selected': false
                            };
                            if (depth<maxdepth) {
                                dt.children=await this.parseItem(fullurl,depth+1,maxdepth);
                                dt.link='';
                            }
                            lst.push(dt);
                        }
                    } else if (tp==="PARENTDIR") {
                        if (depth===0) { 
                            //let fullurl=url;
                            let nm=url.substr(0,url.length-1).lastIndexOf('/',url);
                            fullurl=url.substr(0,nm)+'/';
                            lst.push({
                                'type' : 'default',
                                'text' : '[UP ONE LEVEL]',
                                'link' : link,
                            });
                        } 
                    } else if (tp==='TXT') {

                        lst.push({
                            'type' : 'file',
                            'text' : link,
                            'attr' : this.getAttributes(data[i]),
                            'link' : fullurl+link,
                        });
                    } else {
                        this.getAttributes(data[i]);
                        lst.push({
                            'type' : 'image',
                            'text' : link,
                            'attr' : this.getAttributes(data[i]),
                            'link' : fullurl+link,
                            'children' : [],
                        });
                    }
                }
            }
        }
        return lst;
     

    }

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
            //let existingTreeSettings = tree.settings.contextmenu.items;
            //console.log('data',data);
        };

        let handleDblClick = () => {
            if (this.currentlySelectedNode.original.type === 'image') {
                this.loadImageFromTree();
            }
        };

        listContainer.on('select_node.jstree', (event, data) => {

            this.currentlySelectedNode = data.node;
            console.log('Node=',JSON.stringify(this.currentlySelectedNode));
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

    createTree(fileTree) {
        
        this.listContainer.empty();
        
        let treeDiv = webutil.creatediv(
            {
                parent: this.listContainer,
                css: {
                    'height': '350px',
                    'max-height': '1500px',
                    'width': '95%',
                    'overflow': 'auto',
                    'margin-top': '5px'
                }
            });
        
        let tree = treeDiv.jstree({
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
                'image': {
                    'icon': 'glyphicon glyphicon-picture'
                },
            },
            'plugins': ["types", "dnd", "contextmenu"],
            'contextmenu': {
                'show_at_node': false,
                'items': this.contextMenuDefaultSettings,
            },
        });

        let newSettings = this.contextMenuDefaultSettings;
        //add viewer one and viewer two options to pages with multiple viewers
        if (this.viewertwo) {
            newSettings['Display2']= {
                'separator_before': false,
                'separator_after': false,
                'label': 'Load Image (2)',
                'action': () => {
                    this.displayImageFromTree(1,false);
                },
            };
            newSettings['DisplayOverlay2'] = {
                'separator_before': false,
                'separator_after': false,
                'label': 'Load Overlay (2)',
                'action': () => {
                    this.displayImageFromTree(1,true);
                }
            };
        }

        tree.jstree(true).settings.contextmenu.items = newSettings;
        tree.jstree(true).redraw(true);

        let enabledButtons = this.panel.widget.find('.bisweb-load-enable');
        enabledButtons.prop('disabled', false);

        this.setOnClickListeners(tree, treeDiv);
        this.fileTree = tree;

    }


    reorderItems(filelist) {

        let remove=[];
        console.log('In reorder items',filelist.length);
        
        for (let i=0;i<filelist.length;i++) {

            let c=filelist[i].children || [];
            if (c.length>0) {
                filelist[i].children=this.reorderItems(filelist[i].children);
            } else {
                let item=filelist[i];
                let tp=item.type;
                if (tp==='file') {

                    let fname=item.link;
                    let ind=fname.lastIndexOf('.');
                    let base1=fname.substr(0,ind);
                    let ind2=fname.lastIndexOf('_');
                    let base2=fname.substr(0,ind2);
                    
                    console.log('fname',fname,base1,base2);
                    
                    let found=false, foundindex=-1, j=0;
                    while (j<filelist.length && found===false) {
                        let item2=filelist[j];
                        if (item2.type==='image') {
                            let fname2=item2.link;
                            
                            if (base1+'.nii.gz' === fname2 ||
                                base1+'.nii' === fname2 ||
                                base2+'.nii.gz' === fname2 ||
                                base2+'.nii' === fname2 ||
                                base2+'_bold.nii.gz' === fname2 ||
                                base2+'_bold.nii' === fname2) {
                                found=true;
                                foundindex=j;
                                console.log('Found',base1,base2,fname);
                            }
                        }
                        j=j+1;
                    }
                    
                    if (found) {
                        console.log('Found=',found,foundindex,filelist[foundindex]);
                        filelist[foundindex].children.push(JSON.parse(JSON.stringify(filelist[i])));
                        console.log('Adding to ',filelist[foundindex]);
                        remove.push(i);
                    }
                }
            }
        }
        
        let outlist=[];
        for (let i=0;i<filelist.length;i++) {
            let ind=remove.indexOf(i);
            if (ind<0) {
                outlist.push(filelist[i]);
            }
        }
        return outlist;
        
    }
    
    async openDirectory(url) {

        console.log('-------------------------------------------');
        let filelist=await this.parseItem(url,0,2);
        console.log('-------------------------------------------');
        console.log(this.filelist);

        filelist=this.reorderItems(filelist);

        this.createTree(filelist);
    }
}

webutil.defineElement('bisweb-repopanel', RepoPanel);
