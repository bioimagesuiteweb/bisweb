"use strict";

// imported modules from open source and bisweb repo
const $ = require('jquery');
const BisWebImage = require('bisweb_image');
const webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const bootbox = require('bootbox');
const diffSpectModule=require('diffSpect');
const BisWebPanel = require('bisweb_panel.js');
const DualViewerApplicationElement = require('bisweb_dualviewerapplication');
const BisWebDataObjectCollection=require('bisweb_dataobjectcollection');
const genericio=require('bis_genericio');

require('jstree');

// initialization of jstree formatting
const tree_template_string = `

      <div class="container" style="width:300px">
      <div id="treeDiv">
      </div>
    </div>       `;


// ---------------------------------------------------------------
// Messages to user
// --------------------------------------------------------------
let errormessage = function (e) {
    e = e || "";
    webutil.createAlert('Error Message from diffSPECT' + e, true);
};



//------------------------------------------------------------------
//Global Variables
//------------------------------------------------------------------



/** 
 * A web element to create and manage a GUI for a Diff Spect Tool (for differential spect processing for epilepsy).
 *
 * @example
 *
 * <bisweb-diffspectelement
 *    bis-menubarid="#viewer_menubar"
 *    bis-layoutwidgetid="#viewer_layout"
 *    bis-viewerid="#viewer">
 * </bisweb-diffspectelement>
 *
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 *      bis-menubarid : the menubar to insert menu items in
 */



class DiffSpectElement2 extends DualViewerApplicationElement {


    constructor() {

        super();

        this.dataPanel=null;
        this.resultsPanel=null;
        this.spectModule=new diffSpectModule();
        this.spectModule.alertCallback=webutil.createAlert;
        this.patientInfoModal = null;
    }


    getApplicationStateFilenameExtension(saveimages=true) {
        if (saveimages)
            return 'diffspect';
        return "state";
    }

    
    getApplicationStateFilename(storeimages=true,ext=null) {

        ext = ext || this.getApplicationStateFilenameExtension(storeimages);
        
        let s=`${this.spectModule.app_state.patient_name}_${this.spectModule.app_state.patient_number}.${ext}`;
        s=s.trim().replace(/ /g,'_');
        console.log(s);
        return s;

    }

        /**
     * Creates a small modal dialog to allow the user to enter the session password used to authenticate access to the local fileserver. 
     * Also displays whether authentication succeeded or failed. 
     */
    showPatientInfoModal() {

        if (!this.patientInfoModal) {

            let nid=webutil.getuniqueid();
            let uid=webutil.getuniqueid();
            
            let dataEntryBox=$(`
                <div class='form-group'>
                    <label for='name'>Patient Name:</label>
                                 <input type='text' class = 'form-control' id='${nid}' value="">
                </div>
                <div class='form-group'>
                    <label for='number'>Patient ID:</label>
                    <input type='text' class = 'form-control' id='${uid}'>
                </div>
            `);

            this.patientInfoModal = webutil.createmodal('Enter Patient Information', 'modal-sm');
            this.patientInfoModal.dialog.find('.modal-footer').find('.btn').remove();
            this.patientInfoModal.body.append(dataEntryBox);
            
            let confirmButton = webutil.createbutton({ 'name': 'Save', 'type': 'btn-success' });
            let cancelButton = webutil.createbutton({ 'name': 'Cancel', 'type': 'btn-danger' });
            
            this.patientInfoModal.footer.append(confirmButton);
            this.patientInfoModal.footer.append(cancelButton);

            cancelButton.on('click', (e) => {
                e.preventDefault();
                this.patientInfoModal.dialog.modal('hide');
            });

            confirmButton.on('click', (e) => {
                e.preventDefault();
                this.patientInfoModal.dialog.modal('hide');
                console.log(this);
                this.spectModule.app_state.patient_name=$('#'+nid).val();
                this.spectModule.app_state.patient_number= $('#'+uid).val();
            });

            this.patientNameId=nid;
            this.patientNumberId=uid;
        }

        $('#'+this.patientNameId).val(this.spectModule.app_state.patient_name);
        $('#'+this.patientNumberId).val(this.spectModule.app_state.patient_number);
        this.patientInfoModal.dialog.modal('show');
    }

    // ------------------------------------
    // Element State
    // ------------------------------------
    /** Get State as Object 
        @returns {object} -- the state of the element as a dictionary*/
    getElementState(storeImages=false) {

        let obj=super.getElementState(false);//storeImages);



        if (storeImages) {
            obj.spect = {
                name: this.spectModule.app_state.patient_name,
                number: this.spectModule.app_state.patient_number,
            };

            for (let i=0;i<this.spectModule.saveList.length;i++) {
                let elem=this.spectModule.saveList[i];
                if (!this.spectModule.app_state[elem]) {
                    obj.spect[elem]='';
                } else {
                    if (this.spectModule.typeList[i]==='dictionary') {
                        obj.spect[elem]=this.spectModule.app_state[elem];
                    } else {
                        obj.spect[elem]=this.spectModule.app_state[elem].serializeToJSON();
                    }
                }
            }
        } else {
            obj.spect={};
            for (let i=0;i<this.spectModule.saveList.length;i++) {
                obj.spect[this.spectModule.saveList[i]]='';
            }
        }
        return obj;
    }
    
    /** Set the element state from a dictionary object 
        @param {object} state -- the state of the element */
    setElementState(dt=null,name="") {

        if (dt===null)
            return;

        console.log('Here loading',Object.keys(dt));
        
        super.setElementState(dt,name);

        let input=dt.spect || {};

        this.spectModule.app_state.patient_name= input.name || '';
        this.spectModule.app_state.patient_number= input.number || 0;

        for (let i=0;i<this.spectModule.saveList.length;i++) {
            let elem=this.spectModule.saveList[i];
            input[elem]=input[elem] || '';
            if (input[elem].length<1) {
                this.spectModule.app_state[elem]=null;
            } else {
                if (this.spectModule.typeList[i]==='dictionary') {
                    this.spectModule.app_state[elem]=input[elem];
                    console.log(elem+' loaded elements='+this.spectModule.app_state[elem].length);
                } else {
                    this.spectModule.app_state[elem]=BisWebDataObjectCollection.parseObject(input[elem],
                                                                                this.spectModule.typeList[i]);
                    console.log(elem+' loaded=',this.spectModule.app_state[elem].getDescription());
                }
            }
        }
        

        if (null !== this.spectModule.app_state['tmap']) {
            console.log('Showing tmap');
            this.showTmapImage();            
        } else {
            this.VIEWERS[0].setimage(this.spectModule.app_state['ictal']);
            this.dataPanel.show();
        }
        
        if (null !== this.spectModule.app_state['hyper']) {
            console.log('Gen charts');
            this.generateCharts();
            this.resultsPanel.show();
        }
        
    }

    // --------------------------------------------------------------------------------
    // GUI Callbacks
    // -------------------------------------------------------------------------------



    // --------------------------------------------------------------------------------
    // Load Image Callback
    loadPatientImage(name='ictal') {

        let handleGenericFileSelect = (imgfile)=> {
            let newimage = new BisWebImage();
            newimage.load(imgfile, false).then( () =>  { 
                this.spectModule.app_state[name] = newimage;
                webutil.createAlert('Loaded '+name +': '+this.spectModule.app_state[name].getDescription());
                this.VIEWERS[0].setimage(this.spectModule.app_state[name]);
                
                for (let i=0;i<this.spectModule.clearList.length;i++) {
                    let elem=this.spectModule.clearList[i];
                    this.spectModule.app_state[elem]=null;
                }
            });
        };

        webfileutil.genericFileCallback(
            { 
                "title"  : `Load ${name} image`,
                "suffix" : "NII" 
            },
            ( (fname) => {
                handleGenericFileSelect(fname);
            }),
        );
        
    }


    savePatientImage(name='ictal') {
        let img=this.spectModule.app_state[name];
        img.save();
    }

    // --------------------------------------------------------------------------------
    // Create the SPECT Tool GUI
    // --------------------------------------------------------------------------------

    initializeTree() {

        let treeOptionsCallback=this.treeCallback.bind(this);

        let p=new Promise( (resolve,reject) => {
            this.spectModule.loadAtlasData().then( () => {
                this.VIEWERS[0].setimage(this.spectModule.app_state.ATLAS_mri);
                resolve();
            }).catch( (e) => { reject(e); });
        });
        this.applicationInitializedPromiseList.push(p);
        
        let tree=this.tree_div.find('#treeDiv');

        let json_data = {
            'core': {
                'data': [
                    {
                        'text': 'Images',
                        'state': {
                            'opened': true,
                            'selected': false
                        },
                        'children': [
                            {'text': 'Interictal' },
                            {'text': 'Ictal' },
                            {'text': 'MRI' }
                        ]
                    },
                    {
                        'text': 'Registrations',
                        'state': {
                            'opened': false,
                            'selected': false
                        },
                        'children': [
                            { 'text': 'Interictal to Ictal' },
                            { 'text': 'ATLAS to Interictal' },
                            { 'text': 'ATLAS to Ictal' },
                            { 'text': 'MRI to Interictal' },
                            { 'text': 'MRI to Ictal' },
                            { 'text': 'ATLAS to MRI' },

                        ]                        
                    },
                    {
                        'text': 'Diff SPECT',
                        'state': {
                            'opened': false,
                            'selected': false
                        },
                        'children': [
                            {
                                'text': 'Tmap Image'
                            },
                            {
                                'text': 'Tmap Image (Native Space)'
                            },
                            
                        ]
                    }
                ]


            },
            'plugins': ['contextmenu'],
            'contextmenu' : {
                'items': treeOptionsCallback
            }
            
        };
        tree.jstree(json_data);
    }

    treeCallback(node) {

        const self=this;

        let items = {
            showimage: {
                'label': 'Show Image',
                'action': () => {

                    if (node.text === "Interictal") {
                        if (self.spectModule.app_state.interictal !== null) {
                            webutil.createAlert('Displaying original interictal image');
                            self.VIEWERS[0].setimage(self.spectModule.app_state.interictal);
                        } else  {
                            bootbox.alert('No interictal image loaded');
                        }
                    }

                    if (node.text === "Ictal") {
                        if (self.spectModule.app_state.ictal !== null) {
                            webutil.createAlert('Displaying original ictal image');
                            self.VIEWERS[0].setimage(self.spectModule.app_state.ictal);
                        } else  {
                            bootbox.alert('No ictal image loaded');
                        }
                    }

                    if (node.text === "MRI") {
                        if (self.spectModule.app_state.mri !== null) {
                            webutil.createAlert('Displaying original mri image');
                            self.VIEWERS[0].setimage(self.spectModule.app_state.mri);
                        } else  {
                            bootbox.alert('No MRI image loaded');
                        }
                    }

                    if (node.text === 'Tmap Image') {
                        if (self.spectModule.app_state.tmap !== null) {
                            self.showTmapImage();
                        } else  {
                            bootbox.alert('No diff-SPECT tmap image. You need to compute this first.');
                        }
                    }

                    if (node.text === 'Tmap Image (Native Space)') {
                        if (self.spectModule.app_state.nativetmap !== null) {
                            self.showNativeTmapImage();
                        } else  {
                            bootbox.alert('No diff-SPECT tmap image in native space in memory. You need to compute this first.');
                        }
                    }
                    
                },
            },

            loadinter: {
                'label': 'Load Interictal',
                'action': () => {
                    self.loadPatientImage('interictal');
                },
                
            },
            
            loadictal: {
                'label': 'Load Ictal',
                'action': () => {
                    self.loadPatientImage('ictal');
                }
            },
            
            loadmri: {
                'label': 'Load MRI',
                'action': () =>  {
                    self.loadPatientImage('mri');
                }
            },
            
            saveinter: {
                'label': 'Save Interictal',
                'action': () => {
                    self.savePatientImage('interictal');
                },
                
            },
            
            saveictal: {
                'label': 'Save Ictal',
                'action': () => {
                    self.savePatientImage('ictal');
                }
            },
            
            savemri: {
                'label': 'Save MRI',
                'action': () =>  {
                    self.savePatientImage('mri');
                }
            },

            showregistration: {
                'label': 'Show Registration',
                'action': () =>  {
                    console.log('Action=',node.text);
                    this.spectModule.setAutoUseMRI();
                    if (node.text === "ATLAS to Interictal") {
                        self.showAtlasToInterictalRegistration();
                    } else if (node.text === "ATLAS to Ictal") {
                        self.showAtlasToIctalRegistration();
                    } else if (node.text === "Interictal to Ictal") {
                        self.showInterictalToIctalRegistration();
                    } else if (node.text ==="ATLAS to MRI") {
                        self.showAtlasToMRIRegistration();
                    } else if (node.text ==="MRI to Interictal") {
                        self.showMRIToInterictalRegistration();
                    } else if (node.text ==="MRI to Ictal") {
                        self.showMRIToIctalRegistration();
                    }
                }
            },

            saveregistration: {
                'label': 'Save Registration',
                'action': () =>  {
                    console.log('Action=',node.text);
                    this.spectModule.setAutoUseMRI();
                    if (node.text === "ATLAS to Interictal") {
                        self.showAtlasToInterictalRegistration(true);
                    } else if (node.text === "ATLAS to Ictal") {
                        self.showAtlasToIctalRegistration(true);
                    } else if (node.text === "Interictal to Ictal") {
                        self.showInterictalToIctalRegistration(true);
                    } else if (node.text ==="ATLAS to MRI") {
                        self.showAtlasToMRIRegistration(true);
                    } else if (node.text ==="MRI to Interictal") {
                        self.showMRIToInterictalRegistration(true);
                    } else if (node.text ==="MRI to Ictal") {
                        self.showMRIToIctalRegistration(true);
                    }
                }
            },
            
        };

        if (node.text === "Images")  {
            items = null;
        }

        if (node.text !== 'Interictal') {
            delete items.loadinter;
            delete items.saveinter;
        }
        if (node.text !== 'Ictal') {
            delete items.loadictal;
            delete items.saveictal;
        }
        
        if (node.text !== 'MRI')      {
            delete items.loadmri;
            delete items.savemri;
        }
            

        if (node.text !== 'Interictal'  &&
            node.text !== 'Ictal'       &&
            node.text !== 'Tmap Image'  &&
            node.text !== 'Tmap Image (Native Space)' &&
            node.text !== 'MRI')  {
            delete items.showimage;
        }
        
        if (node.text !== 'ATLAS to Interictal' &&
            node.text !== 'ATLAS to Ictal'      &&
            node.text !== 'Interictal to Ictal' &&
            node.text !== 'MRI to Interictal' &&
            node.text !== 'MRI to Ictal' &&
            node.text !== 'ATLAS to MRI') {
            delete items.showregistration;
            delete items.saveregistration;
        }
        

        return items;

    }
    // ---------------------------------------------------------------------------------------
    // Charts
    /** generate a single output table
     */
    
    generateChart(parent,data,name) {
        
        let templates=webutil.getTemplates();
        let newid=webutil.createWithTemplate(templates.bisscrolltable,$('body'));
        let stable=$('#'+newid);
        const self=this;
        
        let buttoncoords = {};
        let callback = (e) => {
            let id=e.target.id;
            if (!id) {
                id=e.target.parentElement.id;
                if (!id)
                    id=e.target.parentElement.parentElement.id;
            }
            let coordinate=buttoncoords[id];
            self.VIEWERS[0].setcoordinates([coordinate[0], coordinate[1], coordinate[2]]);
        };
        
        let thead = stable.find(".bisthead");
        let tbody = stable.find(".bistbody",stable);
        
        thead.empty();
        tbody.empty();
        tbody.css({'font-size':'11px',
                   'user-select': 'none'});
        thead.css({'font-size':'12px',
                   'user-select': 'none'});
        
        
        let hd=$(`<tr>
                 <td width="5%">#</td>
                 <td width="25%">${name}-Coords</td>
                 <td width="15%">Size</td>
                 <td width="20%">ClusterP</td>
                 <td width="20%">CorrectP</td>
                 <td width="15%">MaxT</td>
                 </tr>`);
        thead.append(hd);

        for (let i=0;i<data.length;i++) {

            let index=data[i].index;
            let size=data[i].size;
            let coords=data[i].coords.join(',');
            
            let clusterP=Number.parseFloat(data[i].clusterPvalue).toFixed(4);
            let correctP=Number.parseFloat(data[i].correctPvalue).toFixed(4);
            let maxt=Number.parseFloat(data[i].maxt).toFixed(3);
            let nid=webutil.getuniqueid();
            let w=$(`<tr>
                    <td width="5%">${index}</td>
                    <td width="25%"><span id="${nid}" class="btn-link">${coords}</span></td>
                    <td width="15%">${size}</td>
                    <td width="20%">${clusterP}</td>
                    <td width="20%">${correctP}</td>
                    <td width="15%">${maxt}</td>
                    </tr>`);
            tbody.append(w);
            $('#'+nid).click(callback);
            buttoncoords[nid]=data[i].coords;
        }
        
        parent.append(stable);
    }

    generateCharts() {
        if (this.spectModule.app_state.hyper === null)
            return;

        let pdiv=this.resultsToolsDiv;
        pdiv.empty();

        pdiv.append($(`<H4> Results for ${this.spectModule.app_state.patient_name} : ${this.spectModule.app_state.patient_number}</H4>`));

        let lst = [ 'Hyper', 'Hypo' ];
        let data = [ this.spectModule.app_state.hyper, this.spectModule.app_state.hypo ];

        let maxpass=1;
        for (let pass=0;pass<=maxpass;pass++) {
            this.generateChart(pdiv,data[pass],lst[pass]);
        }
    }


    saveResults(fobj) {


        let lst = [ 'Hyper', 'Hypo' ];
        let datalist = [ this.spectModule.app_state.hyper, this.spectModule.app_state.hypo ];
        
        let str=`Name, ${this.spectModule.app_state.patient_name}, Number, ${this.spectModule.app_state.patient_number}\n`;
        str+='Mode,Index,I,J,K,Size,clusterP,correctedP,maxT-score\n';

        for (let pass=0;pass<datalist.length;pass++) {
            let data=datalist[pass];
            let name=lst[pass];
            
            for (let i=0;i<data.length;i++) {

                let index=data[i].index;
                let size=data[i].size;
                let coords=data[i].coords;
                
                let clusterP=Number.parseFloat(data[i].clusterPvalue).toFixed(8);
                let correctP=Number.parseFloat(data[i].correctPvalue).toFixed(8);
                let maxt=Number.parseFloat(data[i].maxt).toFixed(3);

                str+=`${name},${index},${coords[0]},${coords[1]},${coords[2]}`;
                str+=`${size},${clusterP},${correctP},${maxt}\n`;
            }

        }

        let fn=this.getApplicationStateFilename(false,'csv');
        fobj=genericio.getFixedSaveFileName(fobj,fn);
        
        return new Promise(function (resolve, reject) {
            genericio.write(fobj, str).then((f) => {
                webutil.createAlert('Results saved in '+f);
            }).catch((e) => {
                webutil.createAlert('Failed to save results '+e,true);
                reject(e);
            });
        });
    }

    // ---------------------------------------------------------------------------------------
    // Show Transformations and Images

    setViewerOpacity(opa=0.5) {
        let cmapcontrol=this.VIEWERS[0].getColormapController();
        let elem=cmapcontrol.getElementState();
        elem.opacity=opa;
        cmapcontrol.setElementState(elem);
        cmapcontrol.updateTransferFunctions(true);
    }

    saveTransformation(operation) {
        let xform=this.spectModule.getComboTransformation(operation);
        xform.save(`${operation}.bisxform`);
    }
    
    showAtlasToInterictalRegistration(save=false) {
        this.spectModule.resliceImages('inter2Atlas',false).then( () => {
            webutil.createAlert('Displaying resliced interictal image over atlas SPECT image');
            this.VIEWERS[0].setimage(this.spectModule.app_state.ATLAS_spect);
            this.VIEWERS[0].setobjectmap(this.spectModule.app_state.inter_in_atlas_reslice,false,'Overlay2');
            this.setViewerOpacity(0.5);
            if (save) this.saveTransformation('inter2Atlas');
                
        }).catch( (e) => { errormessage(e); });
                           
    }

    showMRIToInterictalRegistration(save=false) {
        
        this.spectModule.resliceImages('inter2mri',false).then( () => {
            webutil.createAlert('Displaying resliced interictal image over MRI image');
            this.VIEWERS[0].setimage(this.spectModule.app_state.mri);
            this.VIEWERS[0].setobjectmap(this.spectModule.app_state.inter_in_mri_reslice,false,'Overlay2');
            this.setViewerOpacity(0.5);
            if (save) this.saveTransformation('inter2mri');
        }).catch( (e) => { errormessage(e); });
    }

    showAtlasToIctalRegistration(save=false) {
        this.spectModule.resliceImages('ictal2Atlas',false).then( () => {
            webutil.createAlert('Displaying resliced ictal image over atlas SPECT image');
            this.VIEWERS[0].setimage(this.spectModule.app_state.ATLAS_spect);
            this.VIEWERS[0].setobjectmap(this.spectModule.app_state.ictal_in_atlas_reslice,false,'Overlay2');
            this.setViewerOpacity(0.5);
            if (save) this.saveTransformation('ictal2Atlas');
        }).catch( (e) => { errormessage(e); });
    }

    showMRIToIctalRegistration(save=false) {
        this.spectModule.resliceImages('ictal2mri',false).then( () => {
            webutil.createAlert('Displaying resliced ictal image over MRI image');
            this.VIEWERS[0].setimage(this.spectModule.app_state.mri);
            this.VIEWERS[0].setobjectmap(this.spectModule.app_state.ictal_in_mri_reslice,false,'Overlay2');
            this.setViewerOpacity(0.5);
            if (save) this.saveTransformation('ictal2mri');
        }).catch( (e) => { errormessage(e); });
    }
    
    showInterictalToIctalRegistration(save=false) {
        this.spectModule.resliceImages('inter2ictal',false).then( () => {
            webutil.createAlert('Displaying resliced ictal image over interictal image');
            this.VIEWERS[0].setimage(this.spectModule.app_state.interictal);
            this.VIEWERS[0].setobjectmap(this.spectModule.app_state.ictal_in_inter_reslice,false,'Overlay2');
            this.setViewerOpacity(0.5);
            if (save) this.saveTransformation('inter2ictal');
        }).catch( (e) => { errormessage(e); });
    }

    // New
    showAtlasToMRIRegistration(save=false) {
        
        this.spectModule.resliceImages('mri2Atlas',false).then( () => {
            webutil.createAlert('Displaying resliced mri image over atlas MRI image');
            this.VIEWERS[0].setimage(this.spectModule.app_state.ATLAS_mri);
            this.VIEWERS[0].setobjectmap(this.spectModule.app_state.mri_in_atlas_reslice,false,'Orange');
            this.setViewerOpacity(0.5);
            if (save) this.saveTransformation('mri2Atlas');
        }).catch( (e) => { errormessage(e); });
    }
    
    showTmapImage() {
        if (this.spectModule.app_state.tmap) {
            webutil.createAlert('Displaying diff-spect TMAP over atlas MRI image');
            this.VIEWERS[0].setimage(this.spectModule.app_state.ATLAS_mri);
            this.VIEWERS[0].setobjectmap(this.spectModule.app_state.tmap, false, "Overlay");
            let cmapcontrol=this.VIEWERS[0].getColormapController();
            let elem=cmapcontrol.getElementState();
            elem.minth=1.0;
            cmapcontrol.setElementState(elem);
            cmapcontrol.updateTransferFunctions(true);
        } else {
            errormessage('No tmap in memory');
        }
    }

    showNativeTmapImage() {
        if (this.spectModule.app_state.nativetmap) {

            if (this.spectModule.app_state.does_have_mri) {
                webutil.createAlert('Displaying diff-spect TMAP over Native MRI image');
                this.VIEWERS[0].setimage(this.spectModule.app_state.mri);
            } else {
                webutil.createAlert('Displaying diff-spect TMAP over Interictal image');
                this.VIEWERS[0].setimage(this.spectModule.app_state.interictal);
            }
            this.VIEWERS[0].setobjectmap(this.spectModule.app_state.nativetmap, false, "Overlay");
            let cmapcontrol=this.VIEWERS[0].getColormapController();
            let elem=cmapcontrol.getElementState();
            elem.minth=1.0;
            cmapcontrol.setElementState(elem);
            cmapcontrol.updateTransferFunctions(true);
        } else {
            errormessage('No native space tmap in memory');
        }
    }

    computeAllRegistrations(nonlinear=false) {

        this.spectModule.app_state.nonlinear = nonlinear;
        this.spectModule.setAutoUseMRI();
        
        this.spectModule.computeAllRegistrations().then( (m) => {
            this.spectModule.resliceImages('ictal2Atlas').then( () => {
                this.showAtlasToIctalRegistration();
                this.dataPanel.show();
                webutil.createAlert(m);
            }).catch( (e) => {
                console.log(e,e.stack);
                webutil.createAlert(e,true);
            });
        }).catch( (e) => {
            console.log(e,e.stack);
            webutil.createAlert(e,true);
        });
    }

    // ---------------------------------------------------------------------------------------
    // Extra Menu with 

    createExtraMenu(menubar) {
        const self=this;
        
        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let layoutcontroller = document.querySelector(layoutid);

        this.dataPanel=new BisWebPanel(layoutcontroller,
                                   {  name  : 'Diff-Spect DataTree',
                                      permanent : false,
                                      width : '300',
                                      dual : false,
                                   });
        this.spectToolsDiv = this.dataPanel.getWidget();


        this.resultsPanel=new BisWebPanel(layoutcontroller,
                                          {  name  : 'Diff-Spect Results',
                                             permanent : false,
                                             width : '300',
                                             dual : true,
                                             mode : 'sidebar'
                                          });
        this.resultsToolsDiv = this.resultsPanel.getWidget();
        this.resultsToolsDiv.append($('<div> No results yet.</div>'));
        
        // stamp template
        this.tree_div=$(tree_template_string);
        
        this.spectToolsDiv.append(this.tree_div);

        //        this.dataPanel.show();
        //      this.resultsPanel.hide();
        
        
        this.initializeTree();     
        
        
        let sMenu = webutil.createTopMenuBarMenu("diff-SPECT", menubar);
        
        webutil.createMenuItem(sMenu, 'Enter Patient Info',
                      () =>  {
                          self.showPatientInfoModal();
                      });

        webutil.createMenuItem(sMenu, 'Load Patient Ictal Image', () =>  {
            self.loadPatientImage('ictal'); 
        }); 
        webutil.createMenuItem(sMenu, 'Load Patient Inter-Ictal Image', () =>  {
            self.loadPatientImage('interictal'); 
        });
        webutil.createMenuItem(sMenu, 'Load Patient MRI Image', () =>  {
            self.loadPatientImage('mri'); 
        });
        webutil.createMenuItem(sMenu, 'Debug', () =>  {
            let s=self.spectModule.getDataDescription();
            s=s.trim().replace(/\n/g,'<BR>');
            bootbox.alert(s);
        });
       
        webutil.createMenuItem(sMenu,'');
        
        webutil.createMenuItem(sMenu, 'Register Images using Linear Registration (fast,incaccurate)', () =>  {
            webutil.createAlert('Computing all registrations (linear)','progress',30,0, { 'makeLoadSpinner' : true });
            setTimeout( () => {
                self.computeAllRegistrations(false);
            },100);
        });

        webutil.createMenuItem(sMenu, 'Register Images With Nonlinear Registration (slow,accurate)', () =>  {
            webutil.createAlert('Computing all registrations (nonlinear)','progress',30,0, { 'makeLoadSpinner' : true });
            setTimeout( () => {
                self.computeAllRegistrations(true);
            },100);
        });

        
        webutil.createMenuItem(sMenu,'');
        webutil.createMenuItem(sMenu, 'Compute Diff Spect MAPS', () =>  {
            webutil.createAlert('Computing diff SPECT Maps','progress',30,0, { 'makeLoadSpinner' : true });
            setTimeout( () => {
                self.spectModule.computeSpect().then( (m) => {
                    webutil.createAlert(m);
                    self.showTmapImage();
                    self.generateCharts();
                    self.resultsPanel.show();
                }).catch( (e) => {
                    webutil.createAlert(e,true);
                });
            },100);
        });
        webutil.createMenuItem(sMenu, 'Map TMAP to Native Space', () =>  {
            webutil.createAlert('Mapping TMAP to Native Space','progress',30,0, { 'makeLoadSpinner' : true });
            setTimeout( () => {
                self.spectModule.mapTmapToNativeSpace().then( (m) => {
                    webutil.createAlert(m);
                    self.showNativeTmapImage();
                    self.resultsPanel.hide();
                }).catch( (e) => {
                    webutil.createAlert(e,true);
                });
            },100);
        });
                    


        webutil.createMenuItem(sMenu,'');
        webutil.createMenuItem(sMenu,'Show diff SPECT Data Tree(Images)',() => {
            self.dataPanel.show();
        });
        webutil.createMenuItem(sMenu,'Show diff SPECT Text Results (Regions)',() => {
            self.resultsPanel.show();
        });

        webutil.createMenuItem(sMenu,'');

        webfileutil.createFileMenuItem(sMenu, 'Save diff SPECT Text Results',
                                       function (f) {
                                           self.saveResults(f);
                                       },
                                       {
                                           title: 'Save diff SPECT Text Results',
                                           save: true,
                                           filters : [ { name: 'CSV File', extensions: ['csv']}],
                                           suffix : "csv",
                                           initialCallback : () => {
                                               return self.getApplicationStateFilename(false,"csv");
                                           }
                                       });
        
    }

    // ---------------------------------------------------------------------------------------
    // Main Function
    //
    connectedCallback() {
        this.simpleFileMenus=true;
        super.connectedCallback();
        this.VIEWERS[0].collapseCore();

    }
}

module.exports=DiffSpectElement2;
webutil.defineElement('bisweb-diffspectelementtwo', DiffSpectElement2);

