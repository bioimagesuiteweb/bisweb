/* globals test, fixture */

import { Selector, t } from 'testcafe';
//import { ClientFunction } from 'testcafe';
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

    async loadSampleData() {
        const treePanelButton = Selector('button').withText('Open File Tree Panel');
        const studyLoadButton = Selector('button').withText('Import study from directory');
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

    }

    async makeDummyStructure() {
        const mkdirPromise = (dirname) => {
            return new Promise( (resolve, reject) => {
                fs.mkdir(dirname, (err) => {
                    if (err) { reject(err); }
                    resolve();
                });
            });
        };

        const writePromise = (filename) => {
            return new Promise( (resolve, reject) => {
                fs.writeFile(filename, '', (err) => {
                    console.log('write file', filename);
                    if (err) { reject(err); }
                    resolve();
                });
            });
        };

        mkdirPromise('/tmp/testdata')
        .then( () => { mkdirPromise('/tmp/testdata/anat'); })
        .then( () => { mkdirPromise('/tmp/testdata/func'); })
        .then( () => { mkdirPromise('/tmp/testdata/diff'); })
        .then( () => { writePromise('/tmp/testdata/diff/a.nii.gz'); })
        .then( () => { writePromise('/tmp/testdata/anat/b.nii.gz'); })
        .then( () => { writePromise('/tmp/testdata/anat/c.nii.gz'); })
        .then( () => { writePromise('/tmp/testdata/func/d.nii.gz'); })
        .catch( (err) => { console.log('Encountered an error making folder structure', err); process.exit(1); });
    }

    async openFolders() {
        const anatButton = Selector('.jstree-anchor').withText('anat');
        const diffButton = Selector('.jstree-anchor').withText('diff');
        const funcButton = Selector('.jstree-anchor').withText('func');

        await t
            .click(anatButton)
            .click(diffButton)
            .click(funcButton);
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
    
    await page.closePopup();
    await page.loadSampleData();

    await t
        .takeScreenshot('load_sample_data/PanelWithData.png');

});

test('Expand Tree Nodes', async t => {
    const page = new Page();

    await page.closePopup();
    await page.loadSampleData();

    const anatButton = Selector('.jstree-anchor').withText('anat');
    const diffButton = Selector('.jstree-anchor').withText('diff');
    const funcButton = Selector('.jstree-anchor').withText('func');

    await t
        .click(anatButton)
        .click(diffButton)
        .click(funcButton)
        .takeScreenshot('expand_tree_node/ExpandedTreeNodes.png');
});

test('Tag Images', async t => {
    const page = new Page();

    await page.closePopup();
    await page.loadSampleData();

    const aButton = Selector('.jstree-anchor').withText('a.nii.gz');
    const bButton = Selector('.jstree-anchor').withText('b.nii.gz');

    const setTagItem = Selector('a').withText('Set Tag');
    const tagPopoverControl = Selector('.popover-content').find('.form-control');
    const sagittalPopoverOption = Selector('option').withText('Sagittal');
    const coronalPopoverOption = Selector('option').withText('Coronal');
    const tagElementsMenu = Selector('.bisweb-elements-menu');

    const exportStudyButton = Selector('button').withText('Export study');
    const rootButton = Selector('button').withText('[Root]');
    const fileNavbar = Selector('.bisweb-file-navbar').find('input');
    const saveStudyButton = Selector('button').withText('Save');

    //open the folders and tag items a and b
    await page.openFolders();
    await t
        .rightClick(aButton)
        .click(setTagItem)
        .click(tagPopoverControl)
        .click(coronalPopoverOption)
        .takeScreenshot(tagElementsMenu, 'tag_images/MenuWithCoronalTag.png')
        .click(bButton)
        .click(tagPopoverControl)
        .click(sagittalPopoverOption);

    await t
        .click(exportStudyButton)
        .click(rootButton)
        .click(fileNavbar)
        .typeText(fileNavbar, 'tmp/testdata/exportedStudy.json')
        .click(saveStudyButton);

    const importStudyButton = Selector('button').withText('Import study from JSON');
    const loadStudyButton = Selector('button').withText('Load');
    await t
        .click(importStudyButton)
        .click(rootButton)
        .click(fileNavbar)
        .typeText(fileNavbar, 'tmp/testdata/exportedStudy.json')
        .click(loadStudyButton);

    //take a screenshot of the right click menu for the a button to see whether it still has the coronal tag
    await t
        .click(aButton)
        .takeScreenshot('tag_images/AButtonWithCoronalTag.png');
});
