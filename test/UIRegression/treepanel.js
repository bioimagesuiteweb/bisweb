/* globals test, fixture, $*/

import { Selector, t } from 'testcafe';
import { ClientFunction } from 'testcafe';
import process from 'process';
import fs from 'fs';
import child_process from 'child_process';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/dualviewer.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

export default class Page {
    constructor() {}

    async closePopup() {
        const closeButton = Selector('button').withText('Close');
        await t.click(closeButton);
    }

    async makeDummyStructure () {
        const mkdirPromise = (dirname) => {
            return new Promise( (resolve, reject) => {
                fs.mkdir(dirname, (err) => {
                    if (err) { reject(err); }
                    resolve();
                });
            });
        }

        const writePromise = (filename) => {
            return new Promise( (resolve, reject) => {
                fs.writeFile(filename, '', (err) => {
                    console.log('write file', filename);
                    if (err) { reject(err); }
                    resolve();
                });
            });
        }

        mkdirPromise('/tmp/testdata')
        .then( () => { mkdirPromise('/tmp/testdata/anat'); })
        .then( () => { mkdirPromise('/tmp/testdata/func'); })
        .then( () => { mkdirPromise('/tmp/testdata/diff'); })
        .then( () => { writePromise('/tmp/testdata/diff/a.nii.gz'); })
        .then( () => { writePromise('/tmp/testdata/anat/b.nii.gz'); })
        .then( () => { writePromise('/tmp/testdata/anat/c.nii.gz'); })
        .then( () => { writePromise('/tmp/testdata/func/d.nii.gz'); })
        .catch( (err) => { console.log('Encountered an error making folder structure', err); process.exit(1); })
    }
}


fixture `Tree Panel Tests`.page `${webpage}`
.before( async () => {
    const page = new Page();
    await page.makeDummyStructure();
}).after( async () => {
    let p = child_process.exec('rm -rf /tmp/testdata');
    console.log('deleted directories', p.exitCode);
}); 

test('Open Panel', async t => {
    const page = new Page();
    await page.closePopup();

    const treePanelButton = Selector('button').withText('Open File Tree Panel');
    const studyLoadButton = Selector('button').withText('Import study from directory');
    
    await t
        .click(treePanelButton)
        .expect(studyLoadButton.visible).ok();
});

//TODO: no longer showing file source selector?
test('Load Sample Data', async t => {
    const page = new Page();
    const treePanelButton = Selector('button').withText('Open File Tree Panel');
    const studyLoadButton = Selector('button').withText('Import study from directory');

    await page.closePopup();
    await t
        .click(treePanelButton)
        .click(studyLoadButton);

    //log into server, then click [Root] and type the path of the sample data
    const connectButton = Selector('button').withText('Connect');
    const rootButton = Selector('button').withText('[Root]');
    const fileNavbar = Selector('.bisweb-file-navbar').find('input');
    const selectDirectoryButton = Selector('button').withText('Select Directory');

    await t
        .click(connectButton)
        .click(rootButton)
        .typeText(fileNavbar, 'tmp/testdata')
        .click(selectDirectoryButton)
        .takeScreenshot('load_sample_data/PanelWithData.png');

});