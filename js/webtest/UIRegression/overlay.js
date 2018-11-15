/* globals test, fixture, $, document */

import { Selector, t } from 'testcafe';
import { ClientFunction } from 'testcafe';
import fs from 'fs';

fixture`Overlay Tests`.page`localhost:8080/web/overlayviewer.html`;

export default class Page {
    constructor() {
        this.fileDropdown = Selector('.dropdown-toggle').withText('File');
        this.overlayDropdown = Selector('.dropdown-toggle').withText('Overlay');
    }

    async load1mmImage() {
        //dismiss alert
        const alertCloseButton = Selector('.alert').find('span');

        await t
            .click(this.fileDropdown)
            .click(Selector('a').withText('Load MNI T1 (1mm)'))
            .click(alertCloseButton);
    }

    async load2mmImage() {
        //dismiss alert
        const alertCloseButton = Selector('.alert').find('span');

        await t
            .click(this.fileDropdown)
            .click(Selector('a').withText('Load MNI T1 (2mm)'))
            .click(alertCloseButton);
    }

    async load1mmAtlas() {
        const alertCloseButton = Selector('.alert').find('span');

        await t
            .click(this.overlayDropdown)
            .click(Selector('a').withText('Load Yale Brodmann Atlas (1mm)'))
            .click(alertCloseButton);
    }

    async load2mmAtlas() {
        const alertCloseButton = Selector('.alert').find('span');

        await t
            .click(this.overlayDropdown)
            .click(Selector('a').withText('Load Yale Brodmann Atlas (2mm)'))
            .click(alertCloseButton);
    }

    async clearOverlay() {
        await t
            .click(this.overlayDropdown)
            .click(Selector('a').withText('Clear Overlay'));
    }

    async takeViewerInfoScreenshot(name) {
        const infoButton = Selector('button').withText('?');
        const infoPopup = this.getBodyFromTitle(Selector('h4').withText('Viewer Information'));
        const infoPopupCloseButton = infoPopup.find('.bootbox-close-button');

        await t
            .click(infoButton)
            .takeElementScreenshot(infoPopup, name)
            .click(infoPopupCloseButton);
    }

    getBodyFromTitle(title) {
        return title.parent().parent().parent();
    }
}

test('Minimize Sidebar', async t => {
    const minimizeButton = Selector('.bistoggle');
    await t
        .eval(new Function(fs.readFileSync('./jquery.min.js').toString()));

    const getDockbarWidth = ClientFunction( () => {
        let sidebar = $("div[aria-label='viewer_dockbar']");
        console.log('sidebar', sidebar);
        return parseInt(sidebar.css('width'), 10);
    });

    const expandedDockbarWidth = await getDockbarWidth();

    await t
        .takeScreenshot('minimize_sidebar/BeforeMinimizing.png')
        .click(minimizeButton)
        .wait(1000);

    const minimizedDockbarWidth = await getDockbarWidth();
    await t
        .expect(minimizedDockbarWidth).lt(expandedDockbarWidth)
        .takeScreenshot('minimize_sidebar/AfterMinimizing.png')
        .wait(1000)
        .click(minimizeButton);
    
    const reexpandedDockbarWidth = await getDockbarWidth();
    await t
        .expect(reexpandedDockbarWidth).eql(expandedDockbarWidth)
        .wait(1000)
        .takeScreenshot('minimize_sidebar/AfterReexpanding.png');
});


test('Load Overlays', async t => {
    const page = new Page();

    await page.load1mmImage();
    await page.load1mmAtlas();

    //1mm image and atlas
    await t.takeScreenshot('load_overlay/T1_1mm_1mm.png');
    await page.takeViewerInfoScreenshot('load_overlay/T1_1mm_1mm_info.png');

    await page.clearOverlay();
    await t.takeScreenshot('load_overlay/ClearAtlas.png');

    //1mm img 2mm atlas
    await page.load2mmAtlas();
    await t.takeScreenshot('load_overlay/T1_1mm_2mm.png');
    await page.takeViewerInfoScreenshot('load_overlay/T1_1mm_2mm_info.png');

    //2mm img 1mm atlas
    await page.load2mmImage();
    await page.load1mmAtlas();

    await t.takeScreenshot('load_overlay/T1_2mm_1mm.png');
    await page.takeViewerInfoScreenshot('load_overlay/T1_2mm_1mm_info.png');

    //2mm img 2mm atlas
    await page.clearOverlay();
    await page.load2mmAtlas();
    await t.takeScreenshot('load_overlay/T1_2mm_2mm.png');
    await page.takeViewerInfoScreenshot('load_overlay/T1_2mm_2mm_info.png');
});

test('Expand Viewer Info', async t => {
    const page = new Page();

    await page.load2mmImage();
    await page.load2mmAtlas();

    const viewerInfoButton = Selector('button').withText('?');
    const viewerInfoModal = page.getBodyFromTitle(Selector('h4').withText('Viewer Information'));
    const imageDetail = viewerInfoModal.find('details').nth(0);
    const overlayDetail = viewerInfoModal.find('details').nth(1);

    await t
        .click(viewerInfoButton)
        .click(imageDetail)
        .click(overlayDetail);

    await t.debug().takeScreenshot('expand_viewer_info/ExpandedViewerInfo.png');
});

test('Check Clusters', async t => {

    //Load sample data from help menu
    const helpDropdown = Selector('.dropdown-toggle').withText('Help');
    const sampleDataButton = Selector('a').withText('Load Sample Data');

    await t
        .click(helpDropdown)
        .click(sampleDataButton);

    //Set cluster size, open atlas and cluster tools, and select one of the coordinate groups
    const overlayColorMappingDropdown = Selector('li').withText('Overlay Color Mapping');
    const clusterSizeItem = Selector('.property-name').withText('Cluster Size').parent();
    const clusterSizeInput = clusterSizeItem.find('input');

    await t
        .click(overlayColorMappingDropdown)
        .click(clusterSizeInput).pressKey('delete')
        .typeText(clusterSizeInput, '75')
        .pressKey('enter');

    const editDropdown = Selector('.dropdown-toggle').withText('Edit');
    const atlasToolDropdown = Selector('a').withText('Atlas Tool');
    const clusterInfoDropdown = Selector('a').withText('Cluster Info Tool');

    await t
        .click(editDropdown)
        .click(atlasToolDropdown)
        .click(editDropdown)
        .click(clusterInfoDropdown);

    const MNICoord = Selector('.btn-link').withText('MNI: 42, -66, -3');

    await t
        .click(MNICoord);

    const clusterAnalyzerFrame = Selector('h4').withText('Cluster Analyzer').parent().parent().parent().parent();
    const atlasToolFrame = Selector('a').withText('Atlas Tool').withAttribute(/^aria-expanded$/, /true/).parent().parent().parent();

    //take screenshots
    await t
        .takeScreenshot('screenshot1.png')
        .takeElementScreenshot(clusterAnalyzerFrame, 'screenshot2.png')
        .takeElementScreenshot(atlasToolFrame, 'screenshot3.png');
});

