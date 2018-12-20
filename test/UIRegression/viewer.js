/* globals test, fixture, $*/

import { Selector } from 'testcafe';
import { ClientFunction } from 'testcafe';
import fs from 'fs';
import os from 'os';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/viewer.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture `Viewer Tests`.page `${webpage}`;

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
        .click(imgLoadDropdown)
        .click(loadImgButton);
    
    const snapshotButton = Selector('button').withText('Take Snapshot');
    const saveButton = Selector('button').withText('Save To File');

    const checkFileDownloaded = () => {
        return new Promise((resolve) => {
            //check user's download folder for a snapshot taken recently
            let baseFilePath = os.homedir();
            fs.readdir(baseFilePath + '/Downloads', (err, files) => {
                if (err) { resolve(false); }
                let filteredFiles = files.filter((word) => { return word.match(/^snapshot.*\.png$/); });
                for (let file of filteredFiles) {
                    let stats = fs.statSync(baseFilePath + '/Downloads/' + file);
                    console.log(file, 'created', Date.now() - stats.birthtimeMs, 'ms ago');
                    //look for a snapshot created fewer than ten seconds ago
                    if (Date.now() - stats.birthtimeMs <= 10000) {
                        resolve(true);
                    }
                }
                resolve(false);
            });
        });
    };

    await t
        .click(snapshotButton)
        .click(saveButton)
        .wait(3000);
    
    await t
        .expect(await checkFileDownloaded()).ok();  
});



