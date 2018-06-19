const webutil = require('bis_webutil.js');

class FileDialogElement {

    constructor() {
        this.modal = webutil.createmodal('File Tree', 'modal-lg');
        this.modal.dialog.find('.modal-footer').remove();

        //make the skeleton for the box
        let container = $(
                        `<div class='container-fluid'>
                            <div class='row justify-content-start'>
                                <div class='col-12'>
                                    <p>File bar goes here...</p>
                                </div>
                            </div>
                            <div class='row justify-content-start'>
                                <div class='col-sm-3'>
                                    <ul class='nav nav-pills nav-stacked'>
                                        <li class='active'><a href='#'>A file</a></li>
                                        <li><a href='#'>Another file</a></li>
                                        <li><a href='#'>One more file</a></li>
                                    </ul>
                                </div>

                                <div class='col-sm-9'>
                                    <div><p>Content goes here...</p></div>
                                </div>
                        </div>`
                        );

        this.modal.body.append(container);
    }

    showDialog() {
        this.modal.dialog.modal('show');
    }
}

module.exports = FileDialogElement;