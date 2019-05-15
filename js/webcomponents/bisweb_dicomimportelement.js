const $ = require('jquery');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
const DicomModule = require('dicommodule.js');
const BisWebPanel = require('bisweb_panel.js');


class DicomImportElement extends HTMLElement {
    constructor() {
        super();
        this.panel=null;
    }

    show() {
        if (this.panel)
            this.panel.show();
    }
    
    connectedCallback() {
        
        let viewerid = this.getAttribute('bis-viewerid');
        let viewerid2 = this.getAttribute('bis-viewerid2');
        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let filetreepanelid = this.getAttribute('bis-filetreepanelid');

        this.viewers = [
            document.querySelector(viewerid),
            document.querySelector(viewerid2)
        ];

        
        this.layoutcontroller=document.querySelector(layoutid);
        this.panel=new BisWebPanel(this.layoutcontroller,
                                   { name : "DICOM Import",
                                     permanent : false,
                                     dual : false
                                   });
        this.parentDomElement=this.panel.getWidget();
        let basediv=$('<div></div>');
        this.parentDomElement.append(basediv);

        

        let a=`<P> This invokes <a target="_blank" href="https://github.com/rordenlab/dcm2niix">dcm2niix</a> as an external process.`;
        
        if (bis_genericio.getmode()==='browser')
            a+=`<EM> You need to use <a target="_blank" href="https://bioimagesuiteweb.github.io/bisweb-manual/tools/fileserver.html"> the BISWEB File Server</a> for this to work as we need direct filesystem access for this task.</EM>`;

        basediv.append($(a+'</p><HR>'));
        this.filetreepanel = document.querySelector(filetreepanelid);

        bis_webutil.createbutton({
            type: 'info',
            name: 'Open File Tree Panel',
            tooltip: 'Opens a panel which can display DICOM studies.',
            parent: basediv,
            css: { 'width': '90%', 'margin': '3px' },
            callback: () => {
                this.filetreepanel.showTreePanel();
            },
        });
      
        bis_webfileutil.createFileButton({ 
            type : 'info',
            name : 'Import DICOM Images',
            parent : basediv,
            css : { 'width' : '90%' , 'margin' : '3px' },
            callback : (f) => {
                let saveFileCallback = (o) => { 
                    this.importDICOMImages(f, o,false);
                };
                
                setTimeout( () => {
                    bis_webfileutil.genericFileCallback( 
                        {
                            'title' : 'Choose output directory',
                            'filters' : 'DIRECTORY',
                            'save' : false
                        }, saveFileCallback);
                }, 1);
            },
        },{
            title: 'Directory to import study from',
            filters:  'DIRECTORY',
            suffix:  'DIRECTORY',
            save : false,
            serveronly : true,
        });
        

        bis_webfileutil.createFileButton({ 
            type : 'danger',
            name : 'Import DICOM Images as BIDS',
            parent : basediv,
            css : { 'width' : '90%' , 'margin' : '3px' },
            callback : (f) => {
                let saveFileCallback = (o) => { 
                    this.importDICOMImages(f, o,true);
                };
                
                setTimeout( () => {
                    bis_webfileutil.genericFileCallback( 
                        {
                            'title' : 'Choose output directory',
                            'filters' : 'DIRECTORY',
                            'save' : false
                        }, saveFileCallback);
                }, 1);
            },
        },{
            title: 'Directory to import study from',
            filters:  'DIRECTORY',
            suffix:  'DIRECTORY',
            save : false,
            serveronly : true,
        });
        
        console.log('show');
        this.show();
    }
    


    /**
     * Invokes the program DCM2NII to parse raw DICOM images to NIFTI format.
     * Relies on the server for file system operations, e.g. running DCM2NII, creating temporary directories(see bin/bisfileserver.js for more details). 
     * When finished, this function will automatically invoke bis_bidsutils.dicom2BIDS to organize the flat file structure in the temp directory into BIDS format.
     * 
     * @param {String} inputDirectory 
     * @param {String} outputDirectory 
     */
    importDICOMImages(inputDirectory, outputDirectory,doBIDS=true) {
        if (!bis_webfileutil.candoComplexIO(true)) {
            console.log('Error: cannot import DICOM study without access to file server.');
            return;
        }

        let a='';
        if (doBIDS)
            a='/BIDS';
        
        bis_webutil.createAlert('Converting raw DICOM files to NII'+a+' format...', false, 0, 1000000000, { 'makeLoadSpinner' : true });

        if (!bis_genericio.isDirectory(inputDirectory)) {
            inputDirectory = bis_genericio.getDirectoryName(bis_genericio.getNormalizedFilename(inputDirectory));
        }
        if (!bis_genericio.isDirectory(outputDirectory)) {
            outputDirectory = bis_genericio.getDirectoryName(bis_genericio.getNormalizedFilename(outputDirectory));
        }


        let promise=null;
        console.log('input directory', inputDirectory, 'output directory', outputDirectory);
        if (bis_genericio.getenvironment() === 'browser') {
        
            promise=bis_genericio.runFileConversion({
                'fileType': 'dicom',
                'inputDirectory': inputDirectory,
                'outputDirectory' : outputDirectory,
                'convertbids' : doBIDS
            });
        } else {
            //if on electron just run the module directly
            let dicomModule = new DicomModule();
            promise = dicomModule.execute( {}, { 'inputDirectory' : inputDirectory, 'outputDirectory' : outputDirectory, 'convertbids' : doBIDS });
        }

        promise.then((fileConversionOutput) => {
            console.log('output', fileConversionOutput);
            let output = fileConversionOutput.output ? fileConversionOutput.output : fileConversionOutput;

            bis_webutil.dismissAlerts();
            this.filetreepanel.importFilesFromDirectory(output);
            this.filetreepanel.showTreePanel();
        }).catch( (e) => {
            console.log('An error occured during file conversion', e);
        });
    }
}

bis_webutil.defineElement('bisweb-dicomimportelement', DicomImportElement);
