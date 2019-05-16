const bis_webutil = require('bis_webutil.js');
const bisweb_panel = require('bisweb_panel.js');

class FileTreePipeline extends HTMLElement {
    
    constructor() {
        super();
        this.panel = null;
    }

    connectedCallback() {

        bis_webutil.runAfterAllLoaded( () => {

            let layoutid = this.getAttribute('bis-layoutwidgetid');
            let filetreepanelid = this.getAttribute('bis-filetreepanelid');
            this.layout = document.querySelector(layoutid);
            this.filetreepanel = document.querySelector(filetreepanelid);

            console.log('layout', this.layout);
            this.panel =  new bisweb_panel(this.layout, {
                name: 'Study Tasks',
                permanent: false,
                width: '400',
                dual: false,
                mode: 'sidebar',
                helpButton: true
            });

            this.openPanel();
        });
    }

    openPanel() {
        this.panel.show();
    }
}

bis_webutil.defineElement('bisweb-filetreepipeline', FileTreePipeline);
module.exports = FileTreePipeline;
