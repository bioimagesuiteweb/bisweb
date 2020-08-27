
const $ = require('jquery');
const bootbox = require('bootbox');
const webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const bis_genericio = require('bis_genericio');
const bisweb_panel = require('bisweb_panel.js');
const BisWebImage = require('bisweb_image');
const bisweb_bidsutils= require('bis_bidsutils');
const BisWebTaskManager = require('bisweb_studytaskmanager');

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


class RepoPanel extends HTMLElement {

    constructor() {
        super();
        this.listContainer = null;
        this.elementsContainer = null;
        this.taskManager = null;
        this.created=false;
        this.filelist=[];
        this.currentlySelectedNode=null;
        this.currentBottomChoice=null;
        this.plotobj= null;
        this.bottom=null;
        this.directoryMode=null;
    }

    createGUI() {

        if (this.created)
            return;
        
        this.viewerid = this.getAttribute('bis-viewerid');
        this.viewertwoid = this.getAttribute('bis-viewerid2');
        this.layoutid = this.getAttribute('bis-layoutwidgetid');
        this.viewerappid = this.getAttribute('bis-viewerapplicationid');
        this.viewers = [  document.querySelector('#'+this.viewerid),
                          document.querySelector('#'+this.viewertwoid) || null   ];
        this.layoutcontroller = document.querySelector('#'+this.layoutid);
        this.viewerapplication = document.querySelector('#'+this.viewerappid);

        this.panel = new bisweb_panel(this.layoutcontroller, {
            name: 'File Tree Panel',
            permanent: false,
            width: '400',
            dual: false,
            mode: 'sidebar',
            helpButton: true
        });


        let str='';
        if (!webutil.inElectronApp) {
            str=`
2            <H3> Local Directory </H3>
            <p>Since you running this appication as a web-application, you will need to:</p> <UL> <LI>  Start an instance of the BioImage Suite Web File Server to allow you to access files from disk directly. </LI><LI> Set this as the file source using the "Set FileSource" option under the "Help" menu</LI></UL>. `;
        }

        
        this.panel.setHelpModalMessage(`
<H2>FIle Tree Panel</H2>
This repository either connects to a local folder or to a datalad.org folder.
${str}
<H3> DataLad.Org</H3><P> This control enables browsing of the <a href="https://datasets.datalad.org" target="_blank" rel="noopener">Repository</a>.</P><P> To access a dataset click "Connect to Repository" and enter the URL of the subject/study (e.g. "https://datasets.datalad.org/labs/haxby/attention/sub-rid000001/") in the dialog box.</P>`);        
        let parent=this.panel.getWidget();
        
        const self=this;
        let top= $(`<div></div>`);
        parent.append(top);


        webfileutil.createFileButton({ type : "success",
                                       name : 'Import Folder',
                                       parent : top,
                                       css : { 'width' : '40%' , 'margin' : '3px' },
                                       callback : function(f) {
                                           self.importFolder(f);
                                       },
                                     },{
                                         title: 'Directory to import data from',
                                         filters:  'DIRECTORY',
                                         suffix:  'DIRECTORY',
                                         save : false,
                                     });

        webutil.createbutton({
            'name' : 'Connect to DataLad',
            css : { 'width' : '40%' , 'margin' : '3px' },
            'type' : 'danger',
            'parent' : top,
            'callback' : () => { self.openDataLadDirectoryPrompt(); },
        });

        parent.append($('<HR width="90%">'));
        this.bottom= $(`<div></div>`);
        parent.append(this.bottom);
        parent.append($('<HR width="90%">'));
        this.listContainer = $(`<div></div>`);

        parent.append(this.listContainer);

        this.created=true;
    }

    
    /**
     * Shows file tree panel in the sidebar.
     */
    show() {
        this.createGUI();
        this.panel.show();
    }

    getAttributes(ln) {

        const lst=ln.split('</td>');
        const l=lst.length;
        const out = [ lst[l-4], lst[l-3] ];
        for (let i=0;i<=1;i++) {
            let a=(out[i].split('>'));
            a=a[1].trim();
            out[i]=a;
        }
        return '[' + out.join(', ') + ']';
    }

    openDataLadDirectoryPrompt() {
        
        bootbox.prompt("Enter the URL to connect. Blank=Default", (result) => {
            //console.log('result=',result);
            if (result===null)
                return;

            if (result==='SAVE') {
                bis_genericio.write('current.json',JSON.stringify(this.filelist,null,4));
                return;
            }
            
            if (result==='')
                result='https://datasets.datalad.org/labs/haxby/attention/sub-rid000001/';
            this.directoryMode==='datalad';
            this.openDataLadDirectory(result);
        });
    }

    async parseURL(url,depth=0,maxdepth=2) {

        let oldurl=url;
        url=oldurl.replace(/\?dir=\//g,'');
        //console.log('old=',oldurl,'-->',url);
        
        let lst = [];
        let obj=null;

        //console.log('Parsing ',url,'depth=',depth,maxdepth);
        if (depth>maxdepth)
            return lst;
        
        
        
        try {
            obj=await bis_genericio.read(url);
        } catch(e) {
            console.log('Error'+e);
            return null;
        }

        if (url.lastIndexOf('.html')===url.length-5) {
            let ind=url.lastIndexOf('/');
            url=url.substr(0,ind+1);
        }

        console.log('Object=',JSON.stringify(obj,null,2));
        const extlist = [ 'json','bval','bvec' ];
        
        let data=obj.data.split('\n');
        let parent=lst;

        if (depth==1) {
            //console.log('Must find either anat or func in href , else set maxdepth to 0');
            let found=false,i=0;
            while (i<data.length && found===false) {
                let index=data[i].indexOf('href');
                if (index>=0) {
                    let link=data[i].substr(index+6,1000);
                    let endind=link.indexOf('"');
                    link=link.substr(0,endind).trim();
                    let l=link.length;
                    if (link.indexOf('anat/')===l-5 ||
                        link.indexOf('func/')===l-5 || 
                        link.indexOf('anat/index.html')===l-15 ||
                        link.indexOf('func/index.html')===l-15) {
                        //console.log('Found anat or func in',data[i]);
                        found=true;
                    }
                }
                i=i+1;
            }
            if (found) {
                return [];
            }
        }

        if (depth===0) {


            let link=url.substr(0,url.length-1);
            let a=link.lastIndexOf('/');
            link=link.substr(0,a+1);
            //console.log('Up Link=',link);
            lst.push({
                'type' : 'default',
                'text' : '[UP]',
                'link' : link,
            });

            let extra={
                'type' : 'directory',
                'text' : url,
                'state' : {
                    'opened'    : true
                },
                'children' : [],
            }; 
            lst.push(extra);
            parent=extra.children;
        }
        
            
        for (let i=0;i<data.length;i++) {
            let index=data[i].indexOf('href');
            let index2=data[i].indexOf('alt');
            if (index>=0 && index2>=0) {

                let istsv=false;
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
                if (extension==='tsv' || extension==='TSV') {
                    istsv=true;
                }


                let isback=(data[i].indexOf('icons/back.gif')>=0);
                if (tp==="DIR" || tp=='' || tp==='TXT') {

                    let fullurl=url+link;
                    let nm=fullurl.lastIndexOf('/',url);
                    fullurl=fullurl.substr(0,nm)+'/';

                    
                    if (tp==='DIR') {
                        if (!isback) {
                            let a=link.lastIndexOf('/index.html');
                            let linkname=link;
                            if (a>0) {
                                linkname=link.substr(0,a);
                            } else {
                                a=link.lastIndexOf('/');
                                if (a>0) {
                                    linkname=link.substr(0,a);
                                }
                            }

                            
                            let dt={
                                'text' : '['+linkname+']',
                                'link' : fullurl,
                                'state' : {
                                    'opened'    : true
                                },
                            };

                            if (depth<maxdepth) {
                                dt['type']= 'directory';
                                try {
                                    dt.children=await this.parseURL(fullurl,depth+1,maxdepth);
                                    if (dt.children.length>0) {
                                        dt.link='';
                                    } else {
                                        dt['type']='default';
                                    }
                                } catch(e) {
                                    dt['type']='default';
                                }
                            } else {
                                dt['type']='default';
                            }
                            parent.push(dt);
                        }
                    }  else if (tp==='TXT') {
                        if (!istsv) {
                            parent.push({
                                'type' : 'file',
                                'text' : link,
                                'attr' : this.getAttributes(data[i]),
                                'link' : fullurl+link,
                            });
                        } else {
                            parent.push({
                                'type' : 'tsv',
                                'text' : link,
                                'attr' : this.getAttributes(data[i]),
                                'link' : fullurl+link,
                            });
                        }
                    } else {
                        this.getAttributes(data[i]);
                        parent.push({
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

    getMenu(tp) {

        if (tp==='image') {

            let imageMenu = {
                'Info': {
                    'label': 'File Info',
                    'separator_after': true,
                    'action': () => {this.fileInfo();  },
                },
                'Display': {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Display Image',
                    'action': () => {
                        this.displayImageFromTree(this.currentlySelectedNode.link,0,false);
                    },
                },
                'DisplayOverlay': {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Display Overlay',
                    'action': () => {
                        this.displayImageFromTree(this.currentlySelectedNode.link,0,true);
                    }
                }
            };

            
            if (this.viewers[1]!==null) {
                
                imageMenu['Display2']= {
                    'separator_before': true,
                    'separator_after': false,
                    'label': 'Display Image (2)',
                    'action': () => {
                        this.displayImageFromTree(this.currentlySelectedNode.link,1,false);
                    },
                };
                imageMenu['DisplayOverlay2'] = {
                    'separator_before': false,
                    'separator_after': false,
                    'label': 'Display Overlay (2)',
                    'action': () => {
                        this.displayImageFromTree(this.currentlySelectedNode.link,1,true);
                    }
                };
            }
            return imageMenu;
        }
        
        if (tp==='tsv') {

            return {
                'Info': {
                    'label': 'File Info',
                    'separator_after': true,
                    'action': () => {this.fileInfo();  },
                },
                    'Show': {
                        'label': 'Show File Contents',
                        'action': () => {
                            this.displayFile(this.currentlySelectedNode.link);
                        },
                    },
                'Plot': {
                    'label': 'Plot TSV File',
                    'action': () => {
                        this.displayFile(this.currentlySelectedNode.link,true);
                    },
                },
            };
        }

        if (tp==='file') {
            return {
                    'Info': {
                    'label': 'File Info',
                        'separator_after': true,
                        'action': () => {this.fileInfo();  },
                    },
                    'Show': {
                        'label': 'Show File Contents',
                        'action': () => {
                            this.displayFile(this.currentlySelectedNode.link);
                        },
                    },
            };
        }

        if (tp==='default') {
            return {
                'Open': {
                    'label': 'Load Repo',
                    'action': () => {
                        this.openLink(this.currentlySelectedNode.link);
                    }
                }
            };
        }

        return {};
    }
    
    treeCallback(node) {

        this.currentlySelectedNode=node.original;
        let tp=this.currentlySelectedNode.type;
        return this.getMenu(tp);
    }

    showBottom() {

        let tp=this.currentlySelectedNode.type;
        if (this.currentBottomChoice===tp)
            return;
        
        this.bottom.empty();
        //console.log('Tp=',tp);
        
        if (tp === 'default') {
            this.openLink(this.currentlySelectedNode.link);
            return;
        }

        
        let lst=this.getMenu(tp);
        let keys=Object.keys(lst);
        for (let i=0;i<keys.length;i++) {
            let elem=lst[keys[i]];
            webutil.createbutton({
                'name' : elem.label,
                'type ' : 'success',
                'parent' : this.bottom,
                'callback' : elem.action,
                'css' : {
                    'margin-left' : '5px',
                    'margin-bottom' : '10px'
                },
            });
            if (tp==='image' && i===2) {
                this.bottom.append('<BR>');
            }
        }
    }
        
        
    createTree(fileTree) {

        this.filelist=fileTree;
        this.plotobj= null;
        this.currentlySelectedNode=null;
        this.currentBottomChoice=null;
        this.listContainer.empty();
        let treeOptionsCallback=this.treeCallback.bind(this);
        
        let treeDiv = webutil.creatediv(
            {
                parent: this.listContainer,
                css: {
                    'height' : '600px',
                    'max-height': '1500px',
                    'width': '99%',
                    'overflow': 'auto',
                    'margin-top': '5px'
                }
            });
        
        let tree = treeDiv.jstree({
            'core': {
                'data': this.filelist,
                'dblclick_toggle': true,
                'check_callback': true
            },
            'types': {
                'default': {
                    'icon': 'glyphicon glyphicon-new-window'
                },
                'file': {
                    'icon': 'glyphicon glyphicon-file'
                },
                'tsv': {
                    'icon': 'glyphicon glyphicon-list'
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
                'items': treeOptionsCallback,
            },
        });

        tree.jstree(true).redraw(true);

        tree.on("select_node.jstree", (e, data) => {
            this.currentlySelectedNode=data.node.original;
            this.showBottom();
        });
    }


    reorderItems(filelist) {

        let remove=[];
        
        for (let i=0;i<filelist.length;i++) {

            let c=filelist[i].children || [];
            if (c.length>0) {
                filelist[i].children=this.reorderItems(filelist[i].children);
            } else {
                let item=filelist[i];
                let tp=item.type;
                if (tp==='file' || tp === 'tsv')  {

                    let fname=item.link;
                    let ind=fname.lastIndexOf('.');
                    let base1=fname.substr(0,ind);
                    let ind2=fname.lastIndexOf('_');
                    let base2=fname.substr(0,ind2);
                    
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
                            }
                        }
                        j=j+1;
                    }
                    
                    if (found) {
                        filelist[foundindex].children.push(JSON.parse(JSON.stringify(filelist[i])));
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
    
    async openDataLadDirectory(url) {

        let l=url.length;
        if (url.lastIndexOf('.json')===l-5) {
            return this.openJSONFile(url);
        }
        
        if (url.lastIndexOf('/')!==url.length-1 && url.lastIndexOf('.html')!==url.length-5)
            url=url+'/';

        
        let filelist=await this.parseURL(url,0,1);
        if (filelist!==null) {
            filelist=this.reorderItems(filelist);
            this.createTree(filelist);
        } else {
            webutil.createAlert('Failed to read '+url,true);
        }
    }

    async openJSONFile(url) {

        let obj=null;
        try {
            obj=await bis_genericio.read(url);
        } catch(e) {
            bootbox.alert('Failed to read file '+url);
            return;
        }

        try {
            obj=JSON.parse(obj.data);
        } catch(e) {
            bootbox.alert('Failed to parse file '+url);
            return;
        }

        this.createTree(obj);
    }


    // ----------------------- Local Folder ----------------------------
    
    async parseFolder(dname,depth=0,maxdepth=2) { 

        
        if (depth>maxdepth) {
            console.log('Depth=',depth,maxdepth);
            return [];
        }
        const SEP=bis_genericio.getPathSeparator();

        let matchstring=dname+SEP+'*';
        if (dname.lastIndexOf(SEP)===dname.length-1)
            matchstring=dname+'*';

        let data = [];
        try {
            data=await bis_genericio.getMatchingFiles(matchstring);
        } catch(e) {
            console.log('Error'+e);
            return null;
        }

        let parent=[];
        const extlist = [ 'json','bval','bvec','txt' ];

        for (let i=0;i<data.length;i++) {
            
            let tp='';
            let link=data[i];
            let istsv=false;
            
            let isdir=await bis_genericio.isDirectory(link);
            if (isdir) {
                tp='dir';
            } else {
                let lastdot=link.lastIndexOf('.');
                let extension=link.substr(lastdot+1,1000).toLowerCase();

                if (extlist.indexOf(extension)>=0) {
                    tp='TXT';
                } else if (extension==='nii') {
                    tp='image';
                } else if (extension==='gz') {
                    if (link.indexOf('.nii.gz')>0)
                        tp='image';
                } 
                
                if (extension==='tsv' || extension==='TSV') {
                    istsv=true;
                }
            }

            let linkname='';
            let index=link.lastIndexOf(SEP);
            linkname=link.substr(index+1,link.length);

            //console.log('Fname=',data[i],'linkname=',linkname,' tp=',tp,' istsv=',istsv);
            
            if (tp==='dir') {
                
                let dt={
                    'text' : '['+linkname+']',
                    'link' : link,
                    'state' : {
                        'opened'    : true
                    }
                };

                if (depth<maxdepth) {
                    dt['type']= 'directory';
                    try {
                        dt.children=await this.parseFolder(link,depth+1,maxdepth);
                        if (dt.children.length>0) {
                            dt.link='';
                        } else {
                            dt['type']='default';
                        }
                    } catch(e) {
                        dt['type']='default';
                    }
                } else {
                    dt['type']='default';
                }
                parent.push(dt);
            }  else if (tp==='TXT') {
                if (!istsv) {
                    parent.push({
                        'type' : 'file',
                        'text' : linkname,
                        'attr' : '',
                        'link' : link,
                    });
                } else {
                    parent.push({
                        'type' : 'tsv',
                        'text' : linkname,
                        'attr' : '',
                        'link' : link,
                    });
                }
            } else if (tp==='image') {

                let sz=parseInt(await bis_genericio.getFileSize(link));
                let tp='';
                if (sz> 1024*1024*1024) {
                    sz=sz/(1024*1024*1024);
                    tp='GB';
                } else if (sz>1024*1024) {
                    sz=sz/(1024*1024);
                    tp='MB';
                } else if (sz>1024) {
                    sz=sz/(1024);
                    tp='KB';
                }
                sz=Math.round(sz*10)/10;
                
                
                parent.push({
                    'type' : 'image',
                    'text' : linkname,
                    'attr' : ' size='+sz+' '+tp,
                    'link' : link,
                    'children' : [],
                });
            }
        }
        
        return parent;


    }

    async openFolder(folder) {
    
        let filelist=await this.parseFolder(folder,0,1);
        const SEP=bis_genericio.getPathSeparator();
        let ind=folder.lastIndexOf(SEP);
        if (ind>0) {
            let updir=folder.substr(0,ind);
            if (updir.length>0) {
                filelist.unshift({
                    'text' : '['+updir+']',
                    'link' : updir,
                    'state' : {
                        'opened'    : false
                    },
                    'type' : 'default'
                });
            }
        }

        
        //console.log('Flist',JSON.stringify(filelist,null,2));
        if (filelist!==null) {
            filelist=this.reorderItems(filelist);
            this.createTree(filelist);
        } else {
            webutil.createAlert('Failed to read '+folder,true);
        }
    }
    
    async importFolder(dname) {

        let s=webfileutil.candoComplexIO();
        if (!s)  {
            console.log('Cannot do ',s);
            return;
        }

        this.directoryMode==='local';
        this.openFolder(dname);
    }

    // -------------------------------------------------------------------------------------------------------

    fileInfo() {
        let attr=this.currentlySelectedNode.attr || null;
        if (attr) {
            webutil.createAlert('File attributes '+this.currentlySelectedNode.link+':'+attr);
        } 
    }
    
    async displayImageFromTree(fname,viewer,overlay) {

        let img=new BisWebImage();
        try {
            webutil.createAlert('Loading image from ' + fname,'progress', 30, 0, { 'makeLoadSpinner' : true });
            await img.load(fname);
            webutil.createAlert('Loaded image from ' + fname);
        } catch(e) {
            webutil.createAlert('Failed to load image '+fname);
            return;
        }

        if (!overlay) {
            this.viewers[viewer].setimage(img);
            img=null;
        } else {
            this.viewers[viewer].setobjectmap(img);
            img=null;
        }

    }

    openLink(link) {

        if (this.directoryMode==='datalad')
            this.openDataLadDirectory(link);
        else
            this.openFolder(link);
    }

    async displayFile(fname,plot=false) {

        let obj=null;
        try {
            obj=await bis_genericio.read(fname);
        } catch(e) {
            bootbox.alert('Failed to read file '+fname);
            return;
        }

        if (plot) {

            let tsk=bisweb_bidsutils.parseIndividualTaskFileFromTSV(obj.data);
            let ind=fname.lastIndexOf('/');
            let filename=fname.substr(ind+1,ind+1000);

            if (this.plotobj===null) {
            
                this.plotobj = {
                    "units" : "frames",
                    "TR" : 1.0,
                    "offset": 0,
                    "taskNames" : Object.keys(tsk),
                    "runs" : { }
                };
                this.plotobj['runs'][filename]=tsk;
            } else {
                let tsknames=Object.keys(tsk);
                for (let tname of tsknames) {
                    if (this.plotobj['taskNames'].indexOf(tname)<0)
                        this.plotobj['taskNames'].push(tname);
                }
                this.plotobj['runs'][filename]=tsk;
            }

            if (this.taskManager===null) 
                this.taskManager = new BisWebTaskManager(null, '#'+this.viewerid);
            this.taskManager.createGUI();
            this.taskManager.setTaskData(this.plotobj, true);
            this.taskManager.plotTaskDataRun(filename);

        } else {
        
            let txt=obj.data;
            let ext=fname.split('.');
            let l=ext.length;
            if (ext[l-1]==='json' || ext[l-1]==='JSON') {
                try {
                    txt=JSON.stringify(JSON.parse(txt),null,2);
                } catch(e) {
                    console.log(e);
                }
            }
            
            
            let dh=Math.round(this.layoutcontroller.getviewerheight()*0.7);
            webutil.createLongInfoText('<PRE>'+txt+'</PRE>',fname,dh);
        }
    }
        
}

webutil.defineElement('bisweb-repopanel', RepoPanel);

