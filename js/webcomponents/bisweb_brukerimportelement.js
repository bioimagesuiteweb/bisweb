const $ = require('jquery');
const bis_webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_bruker = require('bis_asyncreadbruker.js');
const BisWebPanel = require('bisweb_panel.js');

class BrukerImportElement extends HTMLElement {

    constructor() {
        super();
        this.panel = null;
    }

    show() {
        this.panel.show();
    }

    connectedCallback() {
        let viewerid = this.getAttribute('bis-viewerid');
        let viewerid2 = this.getAttribute('bis-viewerid2');
        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let filetreepanelid = this.getAttribute('bis-filetreepanelid');

        this.filetreepanel = document.querySelector(filetreepanelid);

        this.viewers = [
            document.querySelector(viewerid),
            document.querySelector(viewerid2)
        ];


        this.layoutcontroller=document.querySelector(layoutid);
        this.panel=new BisWebPanel(this.layoutcontroller,
                                   { name : "Bruker Import",
                                     permanent : false,
                                     dual : false
                                   });

        this.parentDomElement=this.panel.getWidget();
        let basediv=$('<div></div>');
        this.parentDomElement.append(basediv);

        bis_webutil.createbutton({
            type: 'info',
            name: 'Open Study File Panel',
            tooltip: 'Opens a panel which can display Bruker studies.',
            parent: basediv,
            css: { 'width': '90%', 'margin': '3px' },
            callback: () => {
                this.filetreepanel.showTreePanel();
            },
        });

        bis_webfileutil.createFileButton({ 
            type : 'danger',
            name : 'Import Images from Bruker Study',
            parent : basediv,
            css : { 'width' : '90%' , 'margin' : '3px' },
            callback : (f) => {
                let saveFileCallback = (o) => { 
                    this.importBrukerStudy(f, o);
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

        this.show();
    }

    async importBrukerStudy(inputFilepath, outputFilepath) {
        let matchingFiles = await bis_bruker.getMatchingFilenames(inputFilepath);
        console.log('matching files', matchingFiles);

        await bis_bruker.readMultiple(inputFilepath, outputFilepath, false, () => {}, console.log, true);

    }
        
}

bis_webutil.defineElement('bisweb-brukerimportelement', BrukerImportElement);