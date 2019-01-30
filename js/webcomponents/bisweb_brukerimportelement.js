class BrukerImportElement extends HTMLElement {

    constructor() {
        let viewerid = this.getAttribute('bis-viewerid');
        let viewerid2 = this.getAttribute('bis-viewerid2');
        let layoutid = this.getAttribute('bis-layoutwidgetid');
        let filetreepanelid = this.getAttribute('bis-filetreepanelid');

        this.viewers = [
            document.querySelector(viewerid),
            document.querySelector(viewerid2)
        ];

        bis_webutil.createbutton({
            type: 'info',
            name: 'Open File Tree Panel',
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
}