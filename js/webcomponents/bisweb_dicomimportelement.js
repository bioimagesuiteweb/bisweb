const $ = require('jquery');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_genericio = require('bis_genericio.js');
const DicomModule = require('dicommodule.js');


class DicomImportElement extends HTMLElement {
    constructor() {
        super();
        this.rendered = false;
    }

    show() {
        this.filetreepanel.showTreePanel();
        if (!this.rendered) { 
            this.createFileImportCollapseElement(); 
            this.filetreepanel.createFileDisplayElements();
            this.rendered = true;
        }
    }
    
    connectedCallback() {
        let viewerid = this.getAttribute('bis-viewerid');
        let viewerid2 = this.getAttribute('bis-viewerid2');
        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let filetreepanelid = this.getAttribute('bis-filetreepanelid');

        bis_webutil.runAfterAllLoaded( () => {
            this.filetreepanel = document.querySelector(filetreepanelid);
            this.layoutcontroller=document.querySelector(layoutid);

            this.viewers = [
                document.querySelector(viewerid),
                document.querySelector(viewerid2)
            ];
        });    
    }
    
    createFileImportCollapseElement() {
        let treePanelBody = this.filetreepanel.panel.getWidget();
        let importButtonsContainer = bis_webutil.createCollapseElement(treePanelBody, 'Import DICOM Files', true);
        
        let inputGroup = $(`
            <div class='btn-group' style='width: 90%; margin: 3px;'>
                <button class='btn btn-sm bisweb-outline bisweb-outline-primary bisweb-bids-toggle active' data-toggle='button' style='width: 25%'>BIDS</button>
            </div>
        `);

        //let BIDSCheck = $(`<input class='form-check-input' type='checkbox'`)

        importButtonsContainer.append(inputGroup);

        let convertDicomButton = bis_webfileutil.createFileButton({ 
            type : 'info',
            name : 'Convert DICOM Images',
            css : { 'width' : '75%' },
            callback : (f) => {
                let saveFileCallback = (o) => { 
                    //get whether to convert to BIDS or not from toggle
                    let convertToBids = inputGroup.find('.bisweb-bids-toggle').hasClass('active');
                    console.log('convert to bids', convertToBids);
                    this.importDICOMImages(f, o, false);
                };
                
                bis_webfileutil.genericFileCallback( 
                    {
                        'title' : 'Choose output directory',
                        'filters' : 'DIRECTORY',
                        'save' : false
                    }, saveFileCallback);
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
            name : 'Import DICOM Images',
            parent : importButtonsContainer,
            css : { 'width' : '90%' , 'margin' : '3px' },
            callback : (f) => {
                let saveFileCallback = (o) => { 
                    this.importDICOMImages(f, o, true);
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

        inputGroup.prepend(convertDicomButton);

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
        
            promise=bis_genericio.runDICOMConversiong({
                'fixpaths' : true,
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
