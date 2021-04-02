"use strict";

const $=require('jquery');
const webutil=require('bis_webutil');
const bisgenericio=require('bis_genericio');
const BisWebPanel = require('bisweb_panel.js');
const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const BisWebLinearTransformation = require('bisweb_lineartransformation.js');
const numeric=require('numeric');
const resliceImage=require('resliceImage');
const webfileutil = require('bis_webfileutil');

/**
 *
 * A web element that creates a console that optionally captures console.log messages
 * By default this creates an invisible dialog. Call the show method to make it appear
 *
 * @example
 *    <bisweb-console
 *      id="console"
 *    </bisweb-console>
 */
class MisacTool extends HTMLElement {

    constructor() {

        super();


        this.setup ={
            images : {
                'Reference' : { obj : null, filename : '' },
                'Anatomical' : { obj : null, filename : '' },
                'Conventional' : { obj : null, filename : '' },
                'AngioAnat' : { obj : null, filename : '' },
                'Angio' : { obj : null, filename : '' },
                'AngioMask' : { obj : null, filename : '' },
                'ProjAngio' : { obj : null, filename : '' },
                'MeanfMRI' : { obj : null, filename : '' },
                'fMRIParcellation' : { obj : null, filename : '' },
                'RotOptical' : { obj : null, filename : '' },
                'Optical'  : { obj : null, filename : '' },
                'OpticalParcellation'  : { obj : null, filename : '' },
                'StimROI'  : { obj : null, filename : '' },
                'PET'  : { obj : null, filename : '' },
            },
            transforms : {
                'Ref2Anat' : {
                    obj : null,
                    filename : '',
                    reference : 'Reference',
                    target : 'Anatomical',
                },
                'Anat2Conv' : {
                    obj : null,
                    filename : '',
                    reference : 'Anatomical',
                    target : 'Conventional'
                },
                'Conv2fMRI' : {
                    obj : null,
                    filename : '',
                    reference : 'Conventional',
                    target : 'MeanfMRI'
                },
                'Anat2Angio' : {
                    obj : null,
                    filename : '',
                    reference : 'Anatomical',
                    target : 'AngioAnat'
                },
                'Angio2RotOptical' : {
                    obj : null,
                    filename : '',
                    reference : 'ProjAngio',
                    target : 'RotOptical'
                },
                'RotOptical2Optical' : {
                    obj : null,
                    filename : '',
                    reference : 'RotOptical',
                    target : 'Optical',
                },
                'Angio2fMRI' :  {
                    obj : null,
                    filename : '',
                    reference : 'Angio',
                    target : 'MeanfMRI',
                },
                '3D2fMRI' :  {
                    obj : null,
                    filename : '',
                    reference : 'Anatomical',
                    target : 'MeanfMRI',
                },

                'Angio2Optical' : {
                    obj : null,
                    filename : '',
                    reference : 'ProjAngio',
                    target : 'Optical'
                },
                'Pet2Anatomical' : {
                    obj : null,
                    filename : '',
                    reference : 'Anatomical',
                    target : 'PET',
                },

            }
        };

        
        this.infoElement={};
        this.data= {};
        this.internal={};
        this.viewers=[ null,null];
        this.algoController=null;

        this.filters = {
            'image' : 'NII',
            'transform' : [ { name: 'Transformation Files', extensions: [ "bisxform","matr","grd"]},
                            { name: 'All Files', extensions: [ "*"]}
                          ],
        };

        this.extensions = {
            'transform': [ "bisxform","matr","grd" ],
            'images' : ['nii.gz','tiff','tif'],
        };

        this.panel=null;
    }

    show() {
        if (this.panel)
            this.panel.show();
    }

    clearItem(key1,key2) {

        this.setup[key1][key2] = {
            obj : null,
            filename : ''
        };
        this.infoElement[key2].empty();
        this.infoElement[key2].append("Empty");
    }
    

    loadItem(f,key1,key2,objtype) {

        const self=this;
        return new Promise( (resolve,reject) => {
            BisWebDataObjectCollection.loadObject(f,objtype).then( (obj) => {
                if (obj) {
                    self.setup[key1][key2].obj=obj;
                    self.setup[key1][key2].filename=obj.getFilename();
                    self.infoElement[key2].empty();
                    self.infoElement[key2].append(obj.getDescription(true));
                    resolve();
                } else {
                    reject('Failed to load '+objtype+' from '+f+' ',true);
                }
            }).catch( (e) => {
                console.log(e.stack);
                reject(e);
            });
        });
    }

    saveItem(f,key1,key2) {

        const self=this;
        let obj=self.setup[key1][key2].obj;
        if (!obj)
            return;
        
        obj.save(f).then( () => {
            obj.setFilename(f);
            self.setup[key1][key2].filename=f;
            self.infoElement[key2].empty();
            self.infoElement[key2].append(obj.getDescription(true));
        }).catch( (e) => {
            console.log(e.stack);
            webutil.createAlert(e,true);
        });
        return false;
    }
    
    showImage(key1,key2,viewer,overlay=false) {

        const self=this;
        let obj=self.setup[key1][key2].obj;
        if (!obj)
            return;

        if (!overlay)
            this.viewers[viewer].setimage(obj);
        else
            this.viewers[viewer].setobjectmap(obj);
    }


    setItem(obj,key1,key2) {
        
        const self=this;
        if (obj) {
            self.setup[key1][key2].obj=obj;
            self.infoElement[key2].empty();
            self.infoElement[key2].append(obj.getDescription(true));
            webfileutil.electronFileCallback({
                filename : obj.getFilename(),
                title    : 'Select filename to save this to',
                filters  : self.filters[obj.getObjectType()] || 'NII',
                save : true,
            },function(f) { self.saveItem(f,key1,key2); });
        }
    }
    
    grabImage(key1,key2,viewer) {

        let img=this.viewers[viewer].getimage();
        if (img)
            this.setItem(img,key1,key2);
    }


    testTransform(key) {

        const self=this;
        return new Promise( (resolve,reject) => {
            
            let item=self.setup['transforms'][key];
            let xform=item.obj;
            
            if (xform === null) {
                webutil.createAlert('No transformation to test',true);
                reject('No transform in memory');
            } else {
                let ref=self.setup.images[item.reference].obj;
                let targ=self.setup.images[item.target].obj;
                self.showImage('images',item.reference,'viewer1');

                console.log('Reslicing ',targ.getFilename(),' to match', ref.getFilename(), ' using', xform.getFilename());
                
                let resl=new resliceImage();
                resl.execute(
                    { 'input' : targ,
                      'reference' : ref,
                      'xform' : xform
                    }, {
                        interpolation : 1
                    }).then( () => {
                        self.viewers['viewer2'].setimage(resl.getOutputObject('output'));
                        resl.cleanupMemory();
                        resolve();
                    }).catch( (e) => {
                        console.log(e.stack);
                        reject(e);
                    });
            }
        });
    }

    
    saveSetup(f) {


        let out={
            'images' : {},
            'transforms' : {},
        };
        let names = [ 'images','transforms' ];
        for (let i=0;i<names.length;i++) {
            let keys=Object.keys(this.setup[names[i]]);
            for (let j=0;j<keys.length;j++) {

                let first=names[i];
                let second=keys[j];
                out[first][second]=this.setup[first][second].filename;
            }
        }
        
        let obj = {
            "bisformat" : 'MISAC',
            "setup" : out
        };
        
        let txt=JSON.stringify(obj,null,2);
        bisgenericio.write(f,txt).then( () => {
            console.log('Saved job in',f,'\n',txt);
        });
    }

    loadSetup(f) {

        const self=this;

        
        return new Promise( (resolve,reject) => {
            
            bisgenericio.readJSON(f,"MISAC").then( (obj) => {
                
                obj=obj.data.setup;
                
                let out={
                    'images' : {},
                    'transforms' : {},
                };
                
                let p=[];
                
                let names = [ 'images','transforms' ];
                for (let i=0;i<names.length;i++) {
                    let keys=Object.keys(self.setup[names[i]]);
                    for (let j=0;j<keys.length;j++) {
                        let first=names[i];
                        let second=keys[j];
                        
                        let fname=obj[first][second] || null;
                        if (fname) {
                            out[first][second] = {
                                obj : null,
                                filename : fname,
                            };
                            
                            if (fname.length>2) {
                                console.log('Fname=',fname,first,second);
                                if (first==='images') {
                                    p.push(self.loadItem(fname,first,second,'image'));
                                } else {
                                    p.push(self.loadItem(fname,first,second,'transform'));
                                }
                            }
                        } else {
                            self.clearItem(first,second);
                        }
                        
                    }
                }
                
                Promise.all(p).then( () => {
                    webutil.createAlert('Read setup from '+f+' (including images) ');
                    resolve();
                }).catch( (e) => {
                    console.log(e.stack);
                    webutil.createAlert('Failed to load setup from '+f+' '+e,true);
                });
            }).catch( (e) => {
                console.log(e.stack);
                webutil.createAlert('Failed to load setup from '+f+' '+e,true);
                reject(e);
            });
        });
    }

    createAngio2FMRI() {

        let xform1=this.setup.transforms['Anat2Conv'].obj;
        let xform2=this.setup.transforms['Conv2fMRI'].obj;
        let xform3=this.setup.transforms['Anat2Angio'].obj;

        if (!xform1  || !xform2 || !xform3) {
            webutil.createAlert('The three transformations Anat2Conv, Conv2fMRI and Anat2Angio must exist',true);
            return;
        }

        let m1=xform1.getMatrix();
        let m2=xform2.getMatrix();
        let m3=numeric.inv(xform3.getMatrix());

        let m12=numeric.dot(m1,m2);
        let all=numeric.dot(m3,m12);

        let xform=new BisWebLinearTransformation(0);
        xform.setMatrix(all);
        xform.setFilename('combined_angio_fmri.matr');
        this.setItem(xform,'transforms','Angio2fMRI');
        
    }

    create3D2FMRI() {

        let xform1=this.setup.transforms['Anat2Conv'].obj;
        let xform2=this.setup.transforms['Conv2fMRI'].obj;

        if (!xform1  || !xform2 ) {
            webutil.createAlert('The three transformations Anat2Conv, Conv2fMRI and Anat2Angio must exist',true);
            return;
        }

        let m1=xform1.getMatrix();
        let m2=xform2.getMatrix();

        let all=numeric.dot(m1,m2);

        let xform=new BisWebLinearTransformation(0);
        xform.setMatrix(all);
        xform.setFilename('combined_3d_fmri.matr');
        this.setItem(xform,'transforms','3D2fMRI');
        
    }

    createAngio2Optical() {

        let xform1=this.setup.transforms['Angio2RotOptical'].obj;
        let xform2=this.setup.transforms['RotOptical2Optical'].obj;

        if (!xform1  || !xform2 ) {
            webutil.createAlert('The two transformations Angio2RotOptical and RotOptical2Optical must exist',true);
            return;
        }

        let m1=xform1.getMatrix();
        let m2=xform2.getMatrix();

        let all=numeric.dot(m2,m1);

        let xform=new BisWebLinearTransformation(0);
        xform.setMatrix(all);
        xform.setFilename('combined_angio_optical.matr');
        this.setItem(xform,'transforms','Angio2Optical');
    }

    
    createObjectGUI(basediv,key1,key2,objtype) {
        
        let sbar=webutil.creatediv({ parent: basediv});

        sbar.append($('<HR>'));
        sbar.append($('<H4>'+key2+'</H4>'));


        const console_html=`<div style="margin:5px; margin-top:10px; overflow: auto; position:relative; color:#fefefe; width:99%; height:99%; background-color:#101010; font-size:11px;">Empty</div>`;
        let currentInfo=$(console_html);
        sbar.append(currentInfo);

        let itembar=webutil.createbuttonbar({ parent :basediv,  css : {"margin-top":"10px"}});

        this.infoElement[key2]=currentInfo;
        const self=this;
        
        webfileutil.createFileButton({ type : "warning",
                                       name : "Load",
                                       position : "bottom",
                                       parent : itembar,
                                       callback : function(f) {
                                           self.loadItem(f,key1,key2,objtype).catch( (e)=> {
                                               webutil.createAlert(e,true);
                                           });
                                       },
                                     },{
                                         filename : '',
                                         title    : 'Select file to load item from',
                                         filters  : this.filters[objtype],
                                         save : false,
                                         suffix : this.extensions[objtype],
                                     });

        
        webfileutil.createFileButton({ type : "primary",
                           name : "Save",
                                       css : { 'margin-right' : '15px' },
                           tooltip : "Click this to save points to a .ljson file",
                           parent : itembar,
                                       callback : function(f) { self.saveItem(f,key1,key2,objtype);},
                                     },{
                                         title: 'Select file to save item to ',
                                         filters  : this.filters[objtype],
                                 save : true,
                                     });
        
        if (objtype==='image') {
            webutil.createbutton({ type : "info",
                                   name : "Disp1",
                                   position : "bottom",
                                   parent : itembar,
                                   callback : function() {
                                       self.showImage(key1,key2,'viewer1');
                                   },
                                 });

            webutil.createbutton({ type : "warning",
                                   name : "Disp1Ov",
                                   position : "bottom",
                                   parent : itembar,
                                   callback : function() {
                                       self.showImage(key1,key2,'viewer1',true);
                                   },
                                 });

            
            webutil.createbutton({ type : "danger",
                                   name : "Disp2",
                                   position : "bottom",
                                   parent : itembar,
                                   css : { 'margin-right' : '15px' },
                                   callback : function() {
                                       self.showImage(key1,key2,'viewer2');
                                   },
                                 });

            

            webutil.createbutton({ type : "info",
                                   name : "Grab1",
                                   position : "bottom",
                                   parent : itembar,
                                   callback : function() {
                                       self.grabImage(key1,key2,'viewer1');
                                   },
                                 });
            
            webutil.createbutton({ type : "danger",
                                   name : "Grab2",
                                   position : "bottom",
                                   parent : itembar,
                                   callback : function() {
                                       self.grabImage(key1,key2,'viewer2');
                                   },
                                 });
        } else {

            webutil.createbutton({ type : "danger",
                                   name : "Send to Manager",
                                   position : "bottom",
                                   parent : itembar,
                                   css : { 'margin-right' : '15px' },
                                   callback : function() {
                                       let obj=self.setup[key1][key2].obj;
                                       if (obj)
                                           self.currentTransformController.addItem(obj);
                                   },
                                 });
            webutil.createbutton({ type : "info",
                                   name : "Grab From Manager",
                                   position : "bottom",
                                   parent : itembar,
                                   callback : function() {
                                       let obj=self.currentTransformController.getCurrentObject();
                                       if (obj)
                                           self.setItem(obj,key1,key2);
                                   },
                                 });


            webutil.createbutton({ type : "default",
                                   name : "Check",
                                   position : "bottom",
                                   parent : itembar,
                                   callback : function() {
                                       self.testTransform(key2);
                                   },
                                 });
        }



    }
    
    

    
    connectedCallback() {

        webutil.runAfterAllLoaded( () => { 
            this.internalConnectedCallback();
        });
    }

    internalConnectedCallback() {
                                 
        const algorithmcontrollerid = this.getAttribute('bis-algorithmcontrollerid');
        this.algoController = document.querySelector(algorithmcontrollerid);
        this.viewers=this.algoController.getViewers();

        this.currentTransformController=this.algoController.getTransformController();

        
        this.panel=new BisWebPanel(this.viewers['viewer1'].getLayoutController(),
                                   {
                                       name : "MISAC TOOL",
                                       width : 440,
                                       mode : 'sidebar',
                                       dual : false,
                                       hasfooter : true,
                                   });
        
        let basediv=this.panel.getWidget();
        
        // --------------------------------------------
        let sbar=webutil.creatediv({ parent: basediv});
        this.internal.inlineForm=webutil.creatediv({ parent: sbar});
        
        let keys2=Object.keys(this.setup.images);
        for (let i=0;i<keys2.length;i++) {
            this.createObjectGUI(sbar,'images',keys2[i],'image');
        }


        keys2=Object.keys(this.setup.transforms);
        for (let i=0;i<keys2.length;i++) {
            this.createObjectGUI(sbar,'transforms',keys2[i],'transform');
        }

        const self=this;
        let footer=this.panel.getFooter();
        
        webutil.createbutton({ type : "link",
                   name : "Angio->fMRI",
                   parent : footer,
                   callback : function() {
                                   self.createAngio2FMRI();
                               },
                               css : { 'margin-right': '2px'},
                             });

        webutil.createbutton({ type : "link",
                   name : "Angio->Optical",
                   parent : footer,
                   callback : function() {
                                   self.createAngio2Optical();
                               },
                               css : { 'margin-right': '2px'},
                             });

        webutil.createbutton({ type : "link",
                   name : "Ref->fMRI",
                   parent : footer,
                   callback : function() {
                                   self.create3D2FMRI();
                               },
                               css : { 'margin-right': '2px'},
                             });
        
        webfileutil.createFileButton({ type : "default",
                               name : 'Load Setup',
                       parent : footer,
                       callback : function(f) {
                                           self.loadSetup(f);
                                       },
                     },{
                                         filters:  [ { name: 'Setup Files', extensions: ['misac' ]}],
                                 title    : 'Select the file to load from',
                                 save : false,
                                         suffix : "",
                                     });
        
        
        webfileutil.createFileButton({ type : "primary",
                           name : "Save Setup",
                           parent : footer,
                           callback : function(f) {
                                           self.saveSetup(f);
                           }
                                     },{
                                         filters:  [ { name: 'Setup Files', extensions: ['misac' ]}],
                                         title    : 'Select the file to save to',
                                         save : true,
                                         suffix : "",
                                     });
    }

    
    addtomenu(menu) {
        const self=this;
        webutil.createMenuItem(menu,'MISAC Tool',function() {  
            self.show();
        });
    }

    addtomenubar(menubar) {
        var hmenu=webutil.createTopMenuBarMenu("MISAC",menubar);
        this.addtomenu(hmenu);
    }
    
}

webutil.defineElement('bisweb-misactool', MisacTool);
