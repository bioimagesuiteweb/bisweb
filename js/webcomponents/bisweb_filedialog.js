const webutil = require('bis_webutil.js');

class FileDialogElement {

    constructor() {
        this.modal = webutil.createmodal('File Tree', 'modal-lg');
        this.modal.dialog.find('.modal-footer').remove();

        this.contentDisplayTemplate = 
        `<div class='col-sm-9 file-display'>
            <div><p>Content goes here...</p></div>
        </div>`;

        //make the skeleton for the box
        this.container = $(
                        `<div class='container-fluid'>
                            <div class='row justify-content-start'>
                                <div class='col-12'>
                                    <p>File bar goes here...</p>
                                </div>
                            </div>
                            <div class='row justify-content-start content-box'>
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

        this.modal.body.append(this.container);
    }

    createFileList(list) {
        let contentDisplay = this.container.find('.file-display');
        let currentDirectory = list;
        let contentBox = this.container.find('.content-box');
        console.log('contentBox', contentBox);

        //locally scoped function that will fill the content box with the JSON specified in 'list'
        let expandDirectory = (list) => {
            contentDisplay.remove();
            contentDisplay = $(this.contentDisplayTemplate);

            contentDisplay.jstree({
                'core' : {
                    'data' : list,
                    'dblclick_toggle' : false
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

             //determine based on the type of the node what should happen when the user clicks on it
            $(contentDisplay).on('select_node.jstree', (event, data) => {
                console.log('data', data);

                //check whether node should expand directories beneath it.
                /*if (data.node.original.expand) {
                    //this.requestFileList(socket, data.node.original.path);
                    return;
                }*/

                switch (data.node.type) {
                    case 'file' : this.sendFileRequest(socket, { 'command' : 'getfile', 'files' : [data.node.original.path] }); break;
                    case 'directory' : 
                        let name = data.node.original.text;
                        let node = currentDirectory.find( (element) => { return element.text === name; });
                        if (node) { 

                            //need to remake div to make this work properly? 
                            console.log('node', node);
                            expandDirectory(node.children); 
                            currentDirectory = node.children;
                        } else {
                            console.log('Error, could not find element with name', data.node.original.text, 'in directory', currentDirectory);
                        }
                        break;
                    default : console.log('clicked on node', data.node.type, 'that performs no action');
                }

            });

            contentBox.append(contentDisplay);
        };

        expandDirectory(list);

        //TODO: fetch the list of the users' favorite folders from localforage or wherever they end up being...

        let pills = this.container.find('.nav.nav-pills').find('li');
        for (let pill of pills) {
            console.log('pill', pill);
            $(pill).on('click', () => {
                for (let otherPill of pills) {
                    $(otherPill).removeClass('active');
                };
                $(pill).addClass('active');
            });
        }


    }

    /**
     * Displays the file dialog to the user. 
     */
    showDialog() {
        this.modal.dialog.modal('show');
    }
}

module.exports = FileDialogElement;