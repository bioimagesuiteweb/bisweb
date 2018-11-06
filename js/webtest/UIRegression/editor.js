/* globals test, fixture */

import { Selector, t } from 'testcafe';

fixture `Editor Tests`.page `https://git.yale.edu/pages/zls5/webapp/editor.html`;

//specify class to avoid repeating common tasks
//http://devexpress.github.io/testcafe/documentation/test-api/test-code-structure.html
export default class Page {
    constructor () {
        this.fileDropdown = Selector('.dropdown-toggle').withText('File');
        this.loadButton = Selector('a').withText('Load MNI T1 (2mm)');
        this.viewerControlsPanel = Selector('a').withText('Viewer Controls');
    }

    async loadImage() {
        await t
            .click(this.fileDropdown)
            .click(this.loadButton);
        
        //dismiss alert
        const alertCloseButton = Selector('.alert.alert-dismissible').find('button').withAttribute('aria-label', 'Close');
        await t
            .click(alertCloseButton);
    }

    async openViewerPane() {
        await t
            .click(this.viewerControlsPanel);
    }


    async setViewer(textbox, location) {
        await t
            .selectText(textbox)
            .pressKey('delete')
            .click(textbox)
            .typeText(textbox, location)
            .pressKey('enter');
    }

    async clickMultipleTimes(element, clicks) {
        for (let i = 0; i < clicks; i++) {
            await t
                .click(element);
        }
    }

    getViewerControlPane() {
        
    }
}

test('Load Image', async t => {

    const page = new Page();
    page.loadImage();
    page.openViewerPane();

    //check that paint tool appears
    const colorButton = Selector('.btn.color-btn');
    await t
        .takeScreenshot('loadImage.png')
        .expect(colorButton.exists).ok();
    
    

    const resetSlicesButton = Selector('.btn-info').withText('Reset Slices');
    await t
        .expect(resetSlicesButton.exists).ok();
});

test('Use Zoom Controls', async t => {
    const page = new Page();
    page.loadImage();
    page.openViewerPane();

    const resetButton = Selector('.btn-info').withText('Reset Slices');
    const zoomInButton = Selector('.btn-info').withText('Z+');
    const zoomOutButton = Selector('.btn-info').withText('Z-');

    await t
        .takeScreenshot('baseImage.png')
        .click(zoomInButton)
        .click(zoomInButton)
        .click(zoomInButton)
        .takeScreenshot('zoomedIn.png');
    
    await t
        .click(resetButton)
        .click(zoomOutButton)
        .click(zoomOutButton)
        .click(zoomOutButton)
        .takeScreenshot('zoomedOut.png');    
});

test('Use Sliders', async t => {
    const page = new Page();
    page.loadImage();
    page.openViewerPane();

    const iSlider = Selector('span').withText('I-Coord').parent().parent();
    const jSlider = Selector('span').withText('J-Coord').parent().parent();
    const kSlider = Selector('span').withText('K-Coord').parent().parent();

    const iSliderTextBox = iSlider.find('input');
    const jSliderTextBox = jSlider.find('input');

    await t
        .drag(iSlider, 100, 0)
        .takeScreenshot('moveSagittal.png');

    page.setViewer(iSliderTextBox, '45');

    await t
        .drag(jSlider, 100, 0)
        .takeScreenshot('moveCoronal.png');

    page.setViewer(jSliderTextBox, '54');

    await t
        .drag(kSlider, 100, 0)
        .takeScreenshot('moveAxial.png');
});

test('Use Chevrons', async t => {
    const page = new Page();
    page.loadImage();
    page.openViewerPane();

    const rightChevron = Selector('.glyphicon.glyphicon-chevron-right');
    const leftChevron = Selector('.glyphicon.glyphicon-chevron-left');

    const sagittalLeft = leftChevron.withAttribute('index', '0');
    const sagittalRight = rightChevron.withAttribute('index', '1');
    const coronalLeft = leftChevron.withAttribute('index', '2');
    const coronalRight = rightChevron.withAttribute('index', '3');
    const axialLeft = leftChevron.withAttribute('index', '4');
    const axialRight = rightChevron.withAttribute('index', '5');
    const iSlider = Selector('span').withText('I-Coord').parent().parent().find('input');
    const jSlider = Selector('span').withText('J-Coord').parent().parent().find('input');
    const kSlider = Selector('span').withText('K-Coord').parent().parent().find('input');

    await page.clickMultipleTimes(sagittalLeft, 10);
    await t.takeScreenshot('moveSagittalLeft.png');
    await page.setViewer(iSlider, '45');

    await page.clickMultipleTimes(sagittalRight, 10);
    await t.takeScreenshot('moveSagittalRight.png');
    await page.setViewer(iSlider, '45');

    await page.clickMultipleTimes(coronalLeft, 10);
    await t.takeScreenshot('moveCoronalLeft.png');
    await page.setViewer(jSlider, '54');

    await page.clickMultipleTimes(coronalRight, 10);
    await t.takeScreenshot('moveCoronalRight.png');
    await page.setViewer(jSlider, '54');

    await page.clickMultipleTimes(axialLeft, 10);
    await t.takeScreenshot('moveAxialLeft.png');
    await page.setViewer(kSlider, '45');

    await page.clickMultipleTimes(axialRight, 10);
    await t.takeScreenshot('moveAxialRight.png');
    await page.setViewer(kSlider, '45');
});

test('Set Slice View', async t => {
    const page = new Page();
    page.loadImage();
    page.openViewerPane();

    const modeSelector = 
});