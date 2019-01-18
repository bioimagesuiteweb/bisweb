const $ = require('jquery');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
const bis_bidsutils = require('bis_bidsutils.js');
const BisWebPanel = require('bisweb_panel.js');

class DicomImportElement extends HTMLElement {
    constructor() {
        super();
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
        let panel=new BisWebPanel(this.layoutcontroller,
                                  { name : "DICOM Import",
                                    permanent : true,
                                  });
        panel.show();

        this.parentDomElement=panel.getWidget();
        let basediv=$('<div></div>');
        this.parentDomElement.append(basediv);

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
            type : 'danger',
            name : 'Import Images from DICOM Study',
            parent : basediv,
            css : { 'width' : '90%' , 'margin' : '3px' },
            callback : (f) => {
                let saveFileCallback = (o) => { 
                    console.log('input', f, 'output', o);
                    this.importDicomStudy(f, o);
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
        });
    }

    importDicomStudy(inputDirectory, outputDirectory) {
        bis_webutil.createAlert('Converting raw DICOM files to BIDS...', false, 0, 100000, { 'makeLoadSpinner' : true });
        let outdir = inputDirectory; //create derived folder in the same place as the input in accordance with BIDS
        if (!bis_webfileutil.candoComplexIO()) {
            console.log('Error: cannot import DICOM study without access to file server.');
            return;
        }

        if (!bis_genericio.isDirectory(inputDirectory)) {
            inputDirectory = bis_genericio.getDirectoryName(bis_genericio.getNormalizedFilename(inputDirectory));
        }

        bis_genericio.runFileConversion({
            'fileType': 'dicom',
            'inputDirectory': inputDirectory
        }).then((fileConversionOutput) => {
            console.log('Conversion done, now converting files to BIDS format.');
            bis_webutil.createAlert('Converting images to BIDS structure...', false, 0, 100000, { 'makeLoadSpinner' : true });

            //dicom files are in inputDirectory/derived
            bis_bidsutils.dicom2BIDS({ 'indir': fileConversionOutput.output, 'outdir': outputDirectory }).then((bidsDirectory) => {

                console.log('output directory', bidsDirectory);
                //parse folder name for containing folder (should be the folder before the .json file)
                this.filetreepanel.importFilesFromDirectory(bidsDirectory);
                this.filetreepanel.showTreePanel();
            }).catch((e) => {
                console.log('An error occured during BIDS file conversion', e);
            });
        });
    }
}

bis_webutil.defineElement('bisweb-dicomimportelement', DicomImportElement);