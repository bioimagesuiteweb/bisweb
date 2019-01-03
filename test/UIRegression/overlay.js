/* globals test, fixture, $, document */

import { Selector, t } from 'testcafe';
import { ClientFunction } from 'testcafe';
import fs from 'fs';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/overlayviewer.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture`Overlay Tests`.page`${webpage}`;

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

    async loadSampleData() {
        const helpBar = Selector('.dropdown-toggle').withText('Help');
        const sampleDataLoad = Selector('a').withText('Load Sample Data');
        const alertCloseButton = Selector('.alert').find('span');

        const overlayColorMappingDropdown = Selector('li').withText('Overlay Color Mapping');

        await t
            .click(helpBar)
            .click(sampleDataLoad)
            .click(overlayColorMappingDropdown)
            .click(alertCloseButton);
    }

    async openScreenshotModalAndTakeSnapshot(screenshotName) {
        const snapshotButton = Selector('button').withText('Take Snapshot');
        const snapshotModal = this.getBodyFromTitle(Selector('.modal-title').withText('This is the snapshot'));
        const snapshotClose = snapshotModal.find('.bootbox-close-button');

        await t
            .click(snapshotButton)
            .wait(1000)
            .takeElementScreenshot(snapshotModal, screenshotName)
            .click(snapshotClose);
    }

    getElementFromListItem(title) {
        return title.parent();
    }

    getBodyFromTitle(title) {
        return title.parent().parent().parent();
    }
}

test('Minimize Sidebar', async t => {
    const minimizeButton = Selector('.bistoggle');
    await t
        .eval(new Function(fs.readFileSync('./jquery.min.js').toString()));

    const getDockbarWidth = ClientFunction(() => {
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

    await t.takeScreenshot('expand_viewer_info/ExpandedViewerInfo.png');

    await t
        .click(imageDetail)
        .click(overlayDetail)
        .takeScreenshot('expand_viewer_info/MinimizedViewerInfo.png');
});

test('Check Basic Overlay Settings', async t => {
    const page = new Page();
    await page.loadSampleData();

    await t
        .takeScreenshot('check_sample_data/BaseSampleData.png');

    await page.clearOverlay();
    await page.loadSampleData();

    const opacityTextbox = page.getElementFromListItem(Selector('.property-name').withText('Opacity')).find('input');
    const overlayColorMappingDropdown = Selector('li').withText('Overlay Color Mapping');
    await t
        .click(overlayColorMappingDropdown)
        .click(opacityTextbox)
        .selectText(opacityTextbox).pressKey('delete').typeText(opacityTextbox, '0.5').pressKey('enter')
        .wait(1000)
        .takeScreenshot('check_sample_data/LowOpacity.png');


    //NOTE: You can't really check that the colormaps work with the automated tests because a human would have to adjust the sliders by eye
    //so this is basically just to make sure it turns it green.
    const colorMappingInput = page.getElementFromListItem(Selector('.property-name').withText('Overlay Type')).find('select');
    const greenMappingOption = Selector('option').withText('Green');

    await t
        .click(colorMappingInput)
        .click(greenMappingOption)
        .wait(1000)
        .takeScreenshot('check_sample_data/GreenColormap.png');
});

test('Check Overlay Show', async t => {
    const page = new Page();
    await page.loadSampleData();

    const overlayShowInput = page.getElementFromListItem(Selector('.property-name').withText('Overlay Show')).find('select');
    const positiveOption = Selector('option').withText('Positive');
    const negativeOption = Selector('option').withText('Negative');
    const bothOption = Selector('option').withText('Both');

    await t
        .click(overlayShowInput)
        .click(positiveOption)
        .wait(1000)
        .takeScreenshot('check_sample_data/PositiveOverlay.png')
        .click(overlayShowInput)
        .click(negativeOption)
        .wait(1000)
        .takeScreenshot('check_sample_data/NegativeOverlay.png')
        .click(overlayShowInput)
        .click(bothOption)
        .wait(1000)
        .takeScreenshot('check_sample_data/BothOverlay.png');

});

test('Change Min/Max Overlay', async t => {
    const page = new Page();
    await page.loadSampleData();

    const minOverlayInput = page.getElementFromListItem(Selector('.property-name').withText('Min Overlay')).find('input');
    const maxOverlayInput = page.getElementFromListItem(Selector('.property-name').withText('Max Overlay')).find('input');

    await t
        .click(minOverlayInput)
        .selectText(minOverlayInput).pressKey('delete').typeText(minOverlayInput, '1000').pressKey('enter')
        .wait(1000)
        .takeScreenshot('check_sample_data/LowerMinOverlay.png')
        .selectText(minOverlayInput).pressKey('delete').typeText(minOverlayInput, '2882.1').pressKey('enter')
        .selectText(maxOverlayInput).pressKey('delete').typeText(maxOverlayInput, '3500').pressKey('enter')
        .wait(1000)
        .takeScreenshot('check_sample_data/LowerMaxOverlay.png');

});

test('Change Cluster Size', async t => {
    const page = new Page();
    await page.loadSampleData();

    const clusterSizeInput = page.getElementFromListItem(Selector('.property-name').withText('Cluster Size')).find('input');

    await t
        .click(clusterSizeInput)
        .selectText(clusterSizeInput).pressKey('delete').typeText(clusterSizeInput, '50').pressKey('enter')
        .wait(1000)
        .takeScreenshot('check_sample_data/HigherClusterSize.png');
});

test('Check Snapshot Tool', async t => {
    const page = new Page();
    await page.load2mmImage();

    const whiteBackgroundLabel = Selector('label').withText('White Bkgd');
    const cropLabel = Selector('label').withText('Crop');
    const scaleInput = Selector('option').withText('x1').parent();
    const labelInput = Selector('.property-name').withText('Labels').parent().find('input');

    await page.openScreenshotModalAndTakeSnapshot('check_snapshot/BlackBackgroundBaseScale.png');
    await t.click(whiteBackgroundLabel);

    await page.openScreenshotModalAndTakeSnapshot('check_snapshot/WhiteBackgroundBaseScale.png');
    await t
        .click(whiteBackgroundLabel)
        .click(cropLabel);

    await page.openScreenshotModalAndTakeSnapshot('check_snapshot/NoCropBaseScale.png');

    await t
        .click(labelInput);

    await page.openScreenshotModalAndTakeSnapshot('check_snapshot/NoLabel.png');

    await t
        .click(labelInput)
        .click(cropLabel)
        .click(scaleInput)
        .click(Selector('option').withText('x1'));

    await page.openScreenshotModalAndTakeSnapshot('check_snapshot/LowScale.png');

    await t
        .click(scaleInput)
        .click(Selector('option').withText('x6'));

    await page.openScreenshotModalAndTakeSnapshot('check_snapshot/HighScale.png');

});


test('Check Mosaic Viewer', async t => {
    const page = new Page();
    await page.loadSampleData();

    const mosaicTab = Selector('a').withText('Mosaic');
    const rowInput = page.getElementFromListItem(Selector('.property-name').withText('Rows')).find('input');
    const colInput = page.getElementFromListItem(Selector('.property-name').withText('Columns')).find('input');
    const firstInput = page.getElementFromListItem(Selector('.property-name').withText('First')).find('input');

    await t
        .click(mosaicTab)
        .takeScreenshot('mosaic_viewer/MosaicViewer.png')
        .click(rowInput)
        .selectText(rowInput).pressKey('delete').typeText(rowInput, '5').pressKey('enter')
        .click(colInput)
        .selectText(colInput).pressKey('delete').typeText(colInput, '5').pressKey('enter')
        .wait(1000)
        .takeScreenshot('mosaic_viewer/FiveByFive.png')
        .selectText(firstInput).pressKey('delete').typeText(firstInput, '1').pressKey('enter')
        .wait(1000)
        .takeScreenshot('mosaic_viewer/ChangeFirst.png');
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

