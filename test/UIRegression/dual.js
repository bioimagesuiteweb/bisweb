/* globals test, fixture*/

import { Selector } from 'testcafe';


import { t } from 'testcafe'; // eslint-disable-no-unused-vars

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/dualviewer.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture`Dual Viewer Tests`.page`${webpage}`;

export default class Page {
    constructor() {}

    async loadImageOne() {
        const fileDropdown = Selector('.dropdown-toggle').withText('File');
        const imageOneTab = this.getDropdownFromTitle(fileDropdown).find('a').withText('Load MNI T1 (2mm)');
        const viewerOneControls = Selector('a').withText('Viewer 1 Controls');

        await t
            .click(fileDropdown)
            .click(imageOneTab)
            .click(viewerOneControls);    
    }

    async loadImageTwo() {
        const fileDropdown = Selector('.dropdown-toggle').withText('Image2');
        const imageOneTab = this.getDropdownFromTitle(fileDropdown).find('a').withText('Load MNI T1 (2mm)');
        const alertCloseButton = Selector('.alert.alert-dismissible').find('button');
        const viewerTwoControls = Selector('a').withText('Viewer 2 Controls');

        await t
            .click(fileDropdown)
            .click(imageOneTab)
            .click(viewerTwoControls)
            .click(alertCloseButton);    
    }

    async loadOverlayTwo() {
        const overlayDropdown = Selector('.dropdown-toggle').withText('Overlay2');
        const overlayTab = this.getDropdownFromTitle(overlayDropdown).find('a').withText('Load Yale Brodmann Atlas (2mm)');
        const alertCloseButton = Selector('.alert.alert-dismissible').find('button');

        await t
            .click(overlayDropdown)
            .click(overlayTab)
            .click(alertCloseButton);
    }

    async typeText(input, text) {
        await t
            .click(input)
            .selectText(input)
            .pressKey('delete')
            .typeText(input, text)
            .pressKey('enter');
    }

    //drag cursor across canvas to paint a line
    //this function is a little brittle! the canvas is totally opaque as an element so I had to find the location of the viewer by trial and error
    //-Zach
    async dragAcrossViewerTwo(screenshotName) {
        const canvas = Selector('.glyphicon.glyphicon-chevron-right').withAttribute('index', '5');
        await t
            .drag(canvas, -500, 400, { 'offsetX': 0, 'offsetY': 0, 'speed': 0.05 })
            .takeScreenshot(screenshotName);
    }

    getDropdownFromTitle(dropdown) {
        return dropdown.parent();
    }

    getElementFromListItem(title) {
        return title.parent();
    }

    getBodyFromTitle(title) {
        return title.parent().parent().parent();
    }
}

test('Load Two Images', async t => {
    const page = new Page();
    await page.loadImageOne();
    await page.loadImageTwo();
    await t.takeScreenshot('load_two_images/BothImages.png');
});

test('Check Viewer 2 Controls', async t => {
    const page = new Page();
    await page.loadImageTwo();

    const iCoordTextBox = page.getElementFromListItem(Selector('span').withText('I-Coord')).find('input');
    const jCoordTextBox = page.getElementFromListItem(Selector('span').withText('J-Coord')).find('input');
    const kCoordTextBox = page.getElementFromListItem(Selector('span').withText('K-Coord')).find('input');

    await page.typeText(iCoordTextBox, '15');
    await page.typeText(jCoordTextBox, '20');
    await page.typeText(kCoordTextBox, '15');

    await t.takeScreenshot('viewer_two_controls/MoveSliders.png');

    const labelsCheckbox = page.getElementFromListItem(Selector('span').withText('Labels')).find('input');

    await t
        .click(labelsCheckbox)
        .wait(1000)
        .takeScreenshot('viewer_two_controls/NoLabels.png');   
});

test('Check Viewer 2 Modes', async t => {
    const page = new Page();
    await page.loadImageTwo();

    const modeSelector = page.getElementFromListItem(Selector('li').withText('Mode')).find('select');

    await t
        .takeScreenshot('viewer_two_modes/SliceView.png')
        .click(modeSelector)
        .click(Selector('option').withText('Sagittal'))
        .wait(1000)
        .takeScreenshot('viewer_two_modes/SagittalView.png')
        .click(modeSelector)
        .click(Selector('option').withText('Coronal'))
        .wait(1000)
        .takeScreenshot('viewer_two_modes/CoronalView.png')
        .click(modeSelector)
        .click(Selector('option').withText('Axial'))
        .wait(1000)
        .takeScreenshot('viewer_two_modes/AxialView.png')
        .click(modeSelector)
        .click(Selector('option').withText('Slices+3D'))
        .wait(1000)
        .takeScreenshot('viewer_two_modes/SlicesAnd3D.png')
        .click(modeSelector)
        .click(Selector('option').withText('3D Only'))
        .wait(1000)
        .takeScreenshot('viewer_two_modes/3DOnly.png')
        .click(modeSelector)
        .click(Selector('option').withText('Simple Mode'))
        .wait(1000)
        .takeScreenshot('viewer_two_modes/SimpleMode.png');
});

test('Check Viewer 2 Zoom', async t => {
    const page = new Page();
    await page.loadImageTwo();

    const zoomIn = Selector('.btn').withText('Z+');
    const zoomOut = Selector('.btn').withText('Z-');
    const resetSlices = Selector('.btn').withText('Reset Slices');

    await t
        .click(zoomIn)
        .click(zoomIn)
        .click(zoomIn)
        .takeScreenshot('viewer_two_zoom/ZoomedIn.png')
        .click(resetSlices)
        .wait(1000)
        .takeScreenshot('viewer_two_zoom/ResetSlices.png')
        .click(zoomOut)
        .click(zoomOut)
        .click(zoomOut)
        .takeScreenshot('viewer_two_zoom/ZoomedOut.png');
});

test('Check Viewer 2 Chevrons', async t => {
    const page = new Page();
    await page.loadImageTwo();

    await t.maximizeWindow();

    const iCoordTextBox = page.getElementFromListItem(Selector('span').withText('I-Coord')).find('input');
    const jCoordTextBox = page.getElementFromListItem(Selector('span').withText('J-Coord')).find('input');
    const kCoordTextBox = page.getElementFromListItem(Selector('span').withText('K-Coord')).find('input');

    const sagittalLeft = Selector('.glyphicon.glyphicon-chevron-left').withAttribute('index', '0');
    const sagittalRight = Selector('.glyphicon.glyphicon-chevron-right').withAttribute('index', '1');
    const coronalLeft = Selector('.glyphicon.glyphicon-chevron-left').withAttribute('index', '2');
    const coronalRight = Selector('.glyphicon.glyphicon-chevron-right').withAttribute('index', '3');
    const axialLeft = Selector('.glyphicon.glyphicon-chevron-left').withAttribute('index', '4');
    const axialRight = Selector('.glyphicon.glyphicon-chevron-right').withAttribute('index', '5');


    await page.typeText(iCoordTextBox, '45');
    await page.typeText(jCoordTextBox, '54');
    await page.typeText(kCoordTextBox, '45');

    await t
        .click(sagittalLeft)
        .click(sagittalLeft)
        .expect(iCoordTextBox.value).eql('43')
        .click(sagittalRight)
        .click(sagittalRight)
        .click(sagittalRight)
        .expect(iCoordTextBox.value).eql('46')
        .click(coronalLeft)
        .click(coronalLeft)
        .expect(jCoordTextBox.value).eql('52')
        .click(coronalRight)
        .click(coronalRight)
        .click(coronalRight)
        .expect(jCoordTextBox.value).eql('55')
        .click(axialLeft)
        .click(axialLeft)
        .expect(kCoordTextBox.value).eql('43')
        .click(axialRight)
        .click(axialRight)
        .click(axialRight)
        .expect(kCoordTextBox.value).eql('46');
});

test('Check Disable Mouse', async t => {
    const page = new Page();
    await page.loadImageTwo();

    await t.maximizeWindow();
    const disableMouseButton = page.getElementFromListItem(Selector('span').withText('Disable Mouse')).find('input');

    await t.click(disableMouseButton);
    await page.dragAcrossViewerTwo('viewer_two_mouse/DisabledMouse.png');
    await t.click(disableMouseButton);
    await page.dragAcrossViewerTwo('viewer_two_mouse/EnabledMouse.png');
});

test('Check Viewer 2 Color Mapping Sliders', async t => {
    const page = new Page();
    await page.loadImageTwo();

    const imgColorMappingDropdown = Selector('li').withText('Image Color Mapping');
    const minIntTextbox = page.getElementFromListItem(Selector('span').withText('Min Int')).find('input');
    const maxIntTextbox = page.getElementFromListItem(Selector('span').withText('Max Int')).find('input');

    await t
        .click(imgColorMappingDropdown)
        .takeScreenshot('viewer_two_color/BaseColorMapping.png');
    
    await page.typeText(minIntTextbox, '50');
    await t.takeScreenshot('viewer_two_color/HigherMinInt.png');

    await page.typeText(minIntTextbox, '0');
    await page.typeText(maxIntTextbox, '100');
    await t.takeScreenshot('viewer_two_color/LowerMaxInt.png');
});

test('Check Viewer 2 Color Mapping Options', async t => {
    const page = new Page();
    await page.loadImageTwo();

    const imgColorMappingDropdown = Selector('li').withText('Image Color Mapping');
    const interpolateButton = page.getElementFromListItem(Selector('span').withText('Interpolate')).find('input');
    const autoContrastButton = page.getElementFromListItem(Selector('span').withText('Auto-Contrast')).find('input');

    await t
        .click(imgColorMappingDropdown)
        .click(interpolateButton)
        .takeScreenshot('viewer_two_options/NoInterpolate.png')
        .click(interpolateButton)
        .click(autoContrastButton)
        .takeScreenshot('viewer_two_options/NoAutoContrast.png');
});

test('Check Viewer 2 Overlay', async t => {
    await t; // TODO: XENIOS added this to silence eslint
    const page = new Page();
    await page.loadImageTwo();

});
