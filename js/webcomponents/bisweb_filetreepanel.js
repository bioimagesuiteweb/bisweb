const bisweb_panel = require('bisweb_panel.js');
const bis_webutil = require('bis_webutil.js');

/**
 * <bisweb-treepanel
 *  bis-layoutwidgetid = '#viewer_layout'
 *  bis-viewerid = '#orthoviewer'>
 * </bisweb-treepanel>
 *  
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 */
class FileTreePanel extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        bis_webutil.runAfterAllLoaded( () => {
            this.viewerid=this.getAttribute('bis-viewerid');
            this.layoutid=this.getAttribute('bis-layoutwidgetid');
            this.viewer = document.querySelector(this.viewerid);
            this.layout = document.querySelector(this.layoutid);

            this.panel=new bisweb_panel(this.layout,
                {  name  : 'Files',
                   permanent : false,
                   width : '290',
                   dual : false,
                   mode : 'sidebar',
                });
            
            this.panel.show();
        });
    }
}

bis_webutil.defineElement('bisweb-treepanel', FileTreePanel);