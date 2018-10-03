
const $ = require('jquery');
const webutil = require('bis_webutil');
const wsutil = require('bis_wsutil');
const bisweb_simplefiledialog = require('bisweb_simplefiledialog');
const BisFileServerClient=require('bis_fileserverclient');


class BisWebFileServerClient extends BisFileServerClient { 

    constructor() {

        super();
        this.hasGUI=true;
        this.fileDialog = null;
        this.passwordid=null;
        this.authenticateModal = null;
    }

    alertEvent(name,error=false) {
        webutil.createAlert(name,error);
    }
    
    /** Pure Virtual to be replaced for GUI */
    retryAuthenticationDialog() {
        $('#'+this.passwordid).val('');
        this.authenticateModal.header.find('.modal-title').text('Please try again');
    }
    
    // ------------------------------------------------------
    // Authentication Functionality
    //
    
    /**
     * Creates a small modal dialog to allow the user to enter the session password used to authenticate access to the local fileserver. 
     * Also displays whether authentication succeeded or failed. 
     */
    showAuthenticationDialog(title='Connect To BisWeb Server') {

        if (!this.authenticateModal) {

            let hid=webutil.getuniqueid();
            let pid=webutil.getuniqueid();
            
            let passwordEntryBox=$(`
                <div class='form-group'>
                    <label for='server'>Host:</label>
                                 <input type='text' class = 'form-control' id='${hid}' value="localhost:${wsutil.initialPort}">
                </div>
                <div class='form-group'>
                    <label for='filename'>Password:</label>
                    <input type='text' class = 'form-control' id='${pid}'>
                </div>
            `);

            this.authenticateModal = webutil.createmodal('Connect To BisWeb Server', 'modal-sm');
            this.authenticateModal.dialog.find('.modal-footer').find('.btn').remove();
            this.authenticateModal.body.append(passwordEntryBox);
            
            let confirmButton = webutil.createbutton({ 'name': 'Connect', 'type': 'btn-success' });
            let cancelButton = webutil.createbutton({ 'name': 'Cancel', 'type': 'btn-danger' });
            
            this.authenticateModal.footer.append(confirmButton);
            this.authenticateModal.footer.append(cancelButton);

            $(cancelButton).on('click', () => {
                this.authenticateModal.dialog.modal('hide');
            });

            $(confirmButton).on('click', () => {

                let hst=$('#'+hid).val();
                this.password = $('#'+pid).val();
                if (this.hostname!==hst) {
                    this.hostname = hst;
                    this.connectToServer('ws://'+this.hostname);
                } else {
                    setTimeout( () => {
                        this.sendPassword(this.password);
                    },10);
                }
            });

            this.passwordid=pid;
        }

        $('#'+this.passwordid).val('');
        
        if (title!==null)
            this.authenticateModal.header.find('.modal-title').text(title);

        this.authenticateModal.dialog.modal('show');
    }

    hideAuthenticationDialog() {
        if (this.authenticateModal) 
            this.authenticateModal.dialog.modal('hide');
    }
    // ------------------------- File Dialog Functions ---------------------------------
    
    /**
     * Renders a file list fetched by requestFileList in the file tree modal using jstree. 
     * Called in response to a file list returned by the server (itself in response to requestFileList) or by the fileTreeDisplayModal trying to fetch more nodes.
     * 
     * @param {Object} payload - Object specifying the list of files on the server machine and which modal it corresponds to.
     * @param {Object} opts - Object specific options for the Dialog
     */
    showFileDialog(payload,opts=null) {

        if (!this.fileDialog) {
            this.fileDialog=new bisweb_simplefiledialog();
            this.fileDialog.fileListFn = this.requestFileList.bind(this);
        }
        
        this.lastdirectory=payload.path;
        this.fileDialog.fileRequestFn = opts.callback;
        opts.startDirectory = payload.path;
        opts.rootDirectory = payload.root;

        opts.server = 'server';
        this.fileDialog.openDialog(payload.data,opts);
    }
}
module.exports = BisWebFileServerClient;
