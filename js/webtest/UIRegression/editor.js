/* globals test, fixture */

import { Selector, t } from 'testcafe';

fixture `Editor Tests`.page `localhost:8080/web/editor.html`;

//specify class to avoid repeating common tasks
//http://devexpress.github.io/testcafe/documentation/test-api/test-code-structure.html
export default class Page {
    constructor () {
        this.fileDropdown = Selector('.dropdown-toggle').withText('File');
        this.loadButton = Selector('a').withText('Load MNI T1 (2mm)');
        this.viewerControlsPanel = Selector('a').withText('Viewer Controls');
    }

    async loadImage() {
        //dismiss alert
        const alertCloseButton = Selector('.alert').find('span');

        await t
            .click(this.fileDropdown)
            .click(this.loadButton)
            .click(alertCloseButton);
    }

    async openViewerPane() {
        await t
            .click(this.viewerControlsPanel);
    }

    async setTextbox(textbox, location) {
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
        return this.viewerControlsPanel.parent().parent().parent();
    }

    getElementFromTitle(title) {
        return title.parent();
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

    const iSliderElement = page.getElementFromTitle(Selector('span').withText('I-Coord'));
    const jSliderElement = page.getElementFromTitle(Selector('span').withText('J-Coord'));
    const kSliderElement = page.getElementFromTitle(Selector('span').withText('K-Coord'));

    const iSliderDraggable = iSliderElement.find('.slider');
    const jSliderDraggable = jSliderElement.find('.slider');
    const kSliderDraggable = kSliderElement.find('.slider');

    const iSliderTextBox = iSliderElement.find('input');
    const jSliderTextBox = jSliderElement.find('input');

    await t
        .drag(iSliderDraggable, 100, 0)
        .takeScreenshot('moveSagittal.png');

    page.setTextbox(iSliderTextBox, '45');

    await t
        .drag(jSliderDraggable, 100, 0)
        .takeScreenshot('moveCoronal.png');

    page.setTextbox(jSliderTextBox, '54');

    await t
        .drag(kSliderDraggable, 100, 0)
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
    const iSlider = page.getElementFromTitle(Selector('span').withText('I-Coord')).find('input');
    const jSlider = page.getElementFromTitle(Selector('span').withText('J-Coord')).find('input');
    const kSlider = page.getElementFromTitle(Selector('span').withText('K-Coord')).find('input');

    await page.clickMultipleTimes(sagittalLeft, 10);
    await t.takeScreenshot('moveSagittalLeft.png');
    await page.setTextbox(iSlider, '45');

    await page.clickMultipleTimes(sagittalRight, 10);
    await t.takeScreenshot('moveSagittalRight.png');
    await page.setTextbox(iSlider, '45');

    await page.clickMultipleTimes(coronalLeft, 10);
    await t.takeScreenshot('moveCoronalLeft.png');
    await page.setTextbox(jSlider, '54');

    await page.clickMultipleTimes(coronalRight, 10);
    await t.takeScreenshot('moveCoronalRight.png');
    await page.setTextbox(jSlider, '54');

    await page.clickMultipleTimes(axialLeft, 10);
    await t.takeScreenshot('moveAxialLeft.png');
    await page.setTextbox(kSlider, '45');

    await page.clickMultipleTimes(axialRight, 10);
    await t.takeScreenshot('moveAxialRight.png');
    await page.setTextbox(kSlider, '45');
});

test('Set Slice View', async t => {
    const page = new Page();
    page.loadImage();
    page.openViewerPane();

    const viewerControls = page.getViewerControlPane();
    const modeSelectorItem = viewerControls.find('span').withText('Mode').parent();
    const modeSelectorDropdown = modeSelectorItem.find('select');

    await t
        .click(modeSelectorDropdown)
        .click(Selector('option').withText('Sagittal'))
        .wait(500)
        .takeScreenshot('sagittalView.png')
        .click(modeSelectorDropdown)
        .click(Selector('option').withText('Coronal'))
        .wait(500)
        .takeScreenshot('coronalView.png')
        .click(modeSelectorDropdown)
        .click(Selector('option').withText('Axial'))
        .wait(500)
        .takeScreenshot('axialView.png');
});

test('Check Image Settings', async t => {
    const page = new Page();
    page.loadImage();
    page.openViewerPane();

    //const viewerControls = page.getViewerControlPane();
    const labelsToggle = page.getElementFromTitle(Selector('span').withText('Labels')).find('input');

    await t
        .click(labelsToggle)
        .wait(500)
        .takeScreenshot('noLabels.png')
        .click(labelsToggle)
        .click(Selector('.title').withText('Image Color Mapping'));
    
    const interpolateToggle = page.getElementFromTitle(Selector('span').withText('Interpolate')).find('input');
    const autoContrastToggle = page.getElementFromTitle(Selector('span').withText('Auto-Contrast')).find('input');
    const minIntTextbox = page.getElementFromTitle(Selector('span').withText('Min Int')).find('input');

    await t
        .click(interpolateToggle)
        .wait(500)
        .takeScreenshot('noInterpolate.png')
        .click(interpolateToggle)
        .click(autoContrastToggle)
        .wait(500)
        .takeScreenshot('noAutoContrast')
        .click(autoContrastToggle);

    page.setTextbox(minIntTextbox, '50');
    
    await t
        .takeScreenshot('higherMinInt.png');
    
    const maxIntTextbox = page.getElementFromTitle(Selector('span').withText('Max Int')).find('input');
    page.setTextbox(minIntTextbox, '0');
    page.setTextbox(maxIntTextbox, '120');

    await t
        .takeScreenshot('lowerMaxInt.png');

});