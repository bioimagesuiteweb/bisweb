const $ = require('jquery');
const fs = require('fs');

let loadMenuBarItems = () => {
    let menubar = document.getElementById('viewer_menubar');
    let tabContainer = $(menubar).find('.nav.navbar-nav');
    let createMenuBarTab = function(name, parent) {
        let tab = $("<li class='dropdown'>" +
        "<a href='#' class='dropdown-toggle'  data-toggle='dropdown' role='button' aria-expanded='false'>" + name + "<span class='caret'></span></a>" +
        "<ul class='dropdown-menu' role='menu'>" +
        "</ul>" +
        "</li>");

        $(parent).append(tab);

        //usually want the tab so you can add items to the dropdown menu, so return that
        return tab.find('.dropdown-menu');
    };

    let createMenuBarItem = function(name, tab) {
        let item = $(`<li>  <a href="#">${name}</a> </li>`)
        tab.append(item);
        return item;
    };

    let fileTab = createMenuBarTab('Files', tabContainer);
    let fileItem = createMenuBarItem('Load Local Files', fileTab);
    
    fileItem.on('click', () => {
        loadLocalFiles('hello.txt');
    });


    let viewTab = createMenuBarTab('View', tabContainer);
};

let loadLocalFiles = (filename) => {
    fs.readFile(filename, 'utf-8', (err, data) => {
        console.log('file', data);
    });
};

module.exports = {
    loadMenuBarItems : loadMenuBarItems,
    loadLocalFiles : loadLocalFiles
}