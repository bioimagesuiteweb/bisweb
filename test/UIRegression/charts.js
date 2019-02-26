import { Selector, t } from 'testcafe';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/editor.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture`Chart Tests`.page`${webpage}`;


export default class Page {

    constructor() {
        this.fileDropdown = Selector('.dropdown-toggle').withText('File');
        this.loadButton = Selector('a').withText('Load MNI T1 (2mm)');
        this.objectmapDropdown = Selector('.dropdown-toggle').withText('Objectmap');
        this.overlayButton = Selector('a').withText('Load Yale Brodmann Atlas (2mm)');
        this.voiAnalysis = Selector('a').withText('VOI Analysis');
        this.viewerControlsPanel = Selector('a').withText('Viewer Controls');
        this.initialButton = Selector('button').withText('Close');
    }
    
    async dismissInitialAlert() {
        await t.click(this.initialButton);
    }

    async loadImage() {
        //dismiss alert
        const alertCloseButton = Selector('.alert').find('span');
    
        await t
            .click(this.fileDropdown)
            .click(this.loadButton)
            .click(alertCloseButton);
    }

    async loadOverlay() {
        //dismiss alert
        const alertCloseButton = Selector('.alert').find('span');
    
        await t
            .click(this.objectmapDropdown)
            .click(this.overlayButton)
            .click(alertCloseButton);
    }

    async loadVOIAnalysis() {
        await t
            .click(this.objectmapDropdown)
            .click(this.voiAnalysis);
    }
}

test('Open VOI', async t => {
    const page = new Page();
    await page.dismissInitialAlert();
    await page.loadImage();
    await page.loadOverlay();
    await page.loadVOIAnalysis();
});
