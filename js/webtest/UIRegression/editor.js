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

    async loadImage () {
        await t
            .click(this.fileDropdown)
            .click(this.loadButton);
    }

    async openViewerPane () {
        await t
            .click(this.viewerControlsPanel);
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
        .takeScreenshot('moveSagittal.png')
        .selectText(iSliderTextBox).pressKey('delete').click(iSliderTextBox).typeText(iSliderTextBox, '45').pressKey('enter')
        .drag(jSlider, 100, 0)
        .takeScreenshot('moveCoronal.png')
        .selectText(jSliderTextBox).pressKey('delete').click(jSliderTextBox).typeText(jSliderTextBox, '54').pressKey('enter')
        .drag(kSlider, 100, 0)
        .takeScreenshot('moveAxial.png');
});