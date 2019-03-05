/* globals test, fixture */
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

    async displayBarChart() {
        await this.loadImage();
        await this.loadOverlay();
        await this.loadVOIAnalysis();
    }
}

test('Open Bar VOI', async t => {
    const page = new Page();
    await page.dismissInitialAlert();
    await page.displayBarChart();
    await t.takeScreenshot('charts/open_voi_tool.png');
});

test('Click Legend', async t => {
    const page = new Page();
    await page.dismissInitialAlert();
    await page.displayBarChart();
    
    const regionLabel = Selector('span').withText('R1');

    await t
        .click(regionLabel)
        .wait(1000)
        .takeScreenshot('charts/click_legend.png');
});

