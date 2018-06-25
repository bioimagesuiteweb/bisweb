const webutil = require('bis_webutil.js');

class FileDialogElement {

    constructor() {

        this.modal = webutil.createmodal('File Tree', 'modal-lg');
        this.modal.dialog.find('.modal-footer').remove();

        this.contentDisplayTemplate = 
        `<div class='col-sm-9 file-display'>
            <div><p>Content goes here...</p></div>
        </div>`;

        this.fileList = null;

        //make the skeleton for the box
        this.container = $(
                        `<div class='container-fluid'>
                            <div class='row justify-content-start'>
                                <div class='col-12 file-navbar'>
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

    /**
     * 
     * NOTE: The file server that creates the file dialog will provide a few of its functions with the socket bound, e.g. fileListFn, to avoid sharing too many of its internal structures.
     * @param {*} list 
     */
    createFileList(list, startDirectory = null) {

        //file list is constructed as more files are fetched -- the first request will provide a certain number of files then supplemental requests will build it up.
        //createFileList will be called to make the list from scratch, but should not alter the list after that.
        this.fileList = this.fileList ? this.fileList : list;

        let contentDisplay = this.container.find('.file-display');
        let contentBox = this.container.find('.content-box');
        this.currentDirectory = list;

        //keep track of the current directory for the navbar
        this.currentPath = startDirectory ? startDirectory.path.split('/') : [];
        this.container.find('.file-navbar').empty();

        if (startDirectory) {
            this.expandDirectory(startDirectory.list);
        } else {
            this.expandDirectory(list);
        }

        //TODO: fetch the list of the users' favorite folders from localforage or wherever they end up being...

        let pills = this.container.find('.nav.nav-pills').find('li');
        for (let pill of pills) {
            $(pill).on('click', () => {
                for (let otherPill of pills) {
                    $(otherPill).removeClass('active');
                };
                $(pill).addClass('active');
            });
        }
    }
    
    expandDirectory(list) {
        let contentDisplay = this.container.find('.file-display');
        let contentBox = this.container.find('.content-box');

        contentDisplay.remove();
        contentDisplay = $(this.contentDisplayTemplate);

        contentDisplay.jstree({
            'core': {
                'data': list,
                'dblclick_toggle': false
            },
            'types': {
                'default': {
                    'icon': 'glyphicon glyphicon-file'
                },
                'file': {
                    'icon': 'glyphicon glyphicon-file'
                },
                'root': {
                    'icon': 'glyphicon glyphicon-home'
                },
                'directory': {
                    'icon': 'glyphicon glyphicon-folder-close'
                },
                'picture': {
                    'icon': 'glyphicon glyphicon-picture'
                },
                'js': {
                    'icon': 'glyphicon glyphicon-file'
                },
                'html': {
                    'icon': 'glyphicon glyphicon-tasks'
                },
                'video': {
                    'icon': 'glyphicon glyphicon-film'
                },
                'text': {
                    'icon': 'glyphicon glyphicon-list-alt'
                }
            },
            'plugins': ["types"]
        });

        //determine based on the type of the node what should happen when the user clicks on it
        $(contentDisplay).on('select_node.jstree', (event, data) => {

            //check whether node should expand directories beneath it.
            if (data.node.original.expand) {
                this.fileListFn(data.node.original.path);
                return;
            }

            switch (data.node.type) {
                case 'file':
                case 'picture': this.fileRequestFn({ 'command' : 'getfile', 'files' : [data.node.original.path] }); break;
                case 'directory':
                    let name = data.node.original.text;
                    let node = this.currentDirectory.find((element) => { return element.text === name; });
                    if (node) {
                        console.log('node', node);
                        this.currentPath.push(node.text);
                        this.currentDirectory = node.children;
                        this.expandDirectory(node.children);
                    } else {
                        console.log('Error, could not find element with name', data.node.original.text, 'in directory', this.currentDirectory);
                    }
                    break;
                default: console.log('clicked on node', data.node.type, 'that performs no action');
            }

        });

        this.updateFileNavbar();
        contentBox.append(contentDisplay);
    }

    updateFileNavbar() {
        let navbar = this.modal.body.find('.file-navbar');

        //leading character may be a '/', in this case just strip it out and start from the first folder name
        if (this.currentPath[0] === '') { this.currentPath.splice(0,1); }
        navbar.empty();
        
        //create 'home' button that will bring user back to ~/
        let homeButton = $(`<button type='button' class='btn btn-sm btn-link'><span class='glyphicon glyphicon-folder-close'></span>home</button>`);
        navbar.append(homeButton);

        for (let folder of this.currentPath) {
            let button = $(`<button type='button' class='btn btn-sm btn-link'><span class='glyphicon glyphicon-folder-close'></span> ${folder}</button>`);
            button.on('click', () => {

                //set the current path to the path up to the button that was clicked. 
                //e.g. if the path is javascript/bisweb/node_modules and bisweb is clicked, set currentPath to javascript/bisweb
                for (let i = 0; i < this.currentPath.length; i++) { 
                    if (this.currentPath[i] === folder) { 
                        this.currentPath = this.currentPath.slice(0, i + 1);
                        console.log('new path', this.currentPath);
                        break;
                    }
                }

                //find the contents of the new path
                let newPathContents = this.fileList, foundEntry = false;
                console.log('newPathContents', newPathContents);
                for (let entry of this.currentPath) {
                    for (let file of newPathContents) {
                        if (file.text === entry) { 
                            console.log('matched', file, 'with name', entry);
                            newPathContents = file.children; 
                            foundEntry = true;
                            break;
                        }
                    }

                    if (!foundEntry) { 
                        console.log('Error trying to traverse new file path', this.currentPath, ', could not find entry', entry, 'in folder', newPathContents);
                        return;
                    }

                    foundEntry = false;
                }

                console.log('new path contents', newPathContents);
                this.expandDirectory(newPathContents);
                this.currentDirectory = newPathContents;
            });

            navbar.append(button);
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