const webutil = require('bis_webutil.js');

class FileDialogElement {

    constructor() {
        this.modal = webutil.createmodal('File Tree', 'modal-lg');
        this.modal.dialog.find('.modal-footer').remove();

        //make the skeleton for the box
        this.container = $(
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

                                <div class='col-sm-9 file-display'>
                                    <div><p>Content goes here...</p></div>
                                </div>
                        </div>`
                        );

        this.contentDisplay = this.container.find('.file-display');
        this.modal.body.append(this.container);
    }

    createFileList(list) {
        this.contentDisplay.jstree({
            'core' : {
                'data' : function(node, cb) { cb(list) },
                'dblclick_toggle' : false,
                'expand_selected_onload' : true
            },
            'types' : {
                'default' : {
                    'icon' : 'glyphicon glyphicon-file'
                },
                'file' : {
                    'icon' : 'glyphicon glyphicon-file'
                },
                'root' : {
                    'icon' : 'glyphicon glyphicon-home'
                },
                'directory' : {
                    'icon' : 'glyphicon glyphicon-folder-close'
                },
                'picture' : {
                    'icon' : 'glyphicon glyphicon-picture'
                },
                'js' : {
                    'icon' : 'glyphicon glyphicon-file'
                },
                'html' : {
                    'icon' : 'glyphicon glyphicon-tasks'
                },
                'video' : {
                    'icon' : 'glyphicon glyphicon-film'
                }, 
                'text' : {
                    'icon' : 'glyphicon glyphicon-list-alt'
                }
            },
            'plugins' : ["types"]
        });
    }

    showDialog() {
        this.modal.dialog.modal('show');
    }
}

module.exports = FileDialogElement;