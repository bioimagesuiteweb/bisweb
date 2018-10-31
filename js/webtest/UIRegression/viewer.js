/* globals test, fixture, $ */

import { Selector } from 'testcafe';
import { ClientFunction } from 'testcafe';
import fs from 'fs';


fixture `Viewer Tests`.page `https://bioimagesuiteweb.github.io/unstableapp/viewer.html`;

test('Load Image', async t => {
    const imgLoadDropdown = Selector('.dropdown-toggle').withText('File');
    const loadImgButton = Selector('a').withText('Load MNI T1 (2mm)');

    //Load jquery into client space
    //http://devexpress.github.io/testcafe/faq/
    await t
        .eval(new Function(fs.readFileSync('./jquery.min.js').toString()));
    
    await t
        .click(imgLoadDropdown)
        .click(loadImgButton);

    //loading an image successfully will add options to the 'viewer controls' panel in the sidebar
    //so we check to see if this panel has children in order to determine whether the load was a success
    const getPanelBodyOK = ClientFunction( () => {
        const panelBody = $('#viewerwidget').find('.dg.main');
        return panelBody[0].childNodes.length > 0;
    });    

    await t
        .expect(getPanelBodyOK()).ok();
});

test('Take Snapshot', async t => {
    const imgLoadDropdown = Selector('.dropdown-toggle').withText('File');
    const loadImgButton = Selector('a').withText('Load MNI T1 (2mm)');

    await t
        .eval(new Function(fs.readFileSync('./jquery.min.js').toString()));
    
    await t
        .click(imgLoadDropdown)
        .click(loadImgButton);
    
    const snapshotButton = Selector('button').withText('Take Snapshot');
    const snapshotModalOpen = ClientFunction( () => {
        let snapshotModal = $('.bootbox.modal.fade');
        let snapshotModalTitle = $(snapshotModal).find('.modal-title');
        return snapshotModalTitle[0].innerHTML.match(/This is the snapshot/);
    });

    await t
        .click(snapshotButton)
        .expect(snapshotModalOpen()).ok();
    
        
});

