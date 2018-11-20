/* globals test, fixture, document */

import { Selector, t } from 'testcafe';

fixture`Overlay Tests`.page`https://git.yale.edu/pages/zls5/webapp/connviewer.html`;

export default class Page {

    async openViewerControls() {
        const viewerControlsMenu = Selector('a').withText('Viewer Controls');
        const overlayColorMappingDropdown = Selector('li').withText('Overlay Color Mapping');
        await t
            .click(viewerControlsMenu)
            .click(overlayColorMappingDropdown);
    }

    async rotateViewer() {
        const canvas = Selector('canvas');
        await t
            .drag(canvas, 600, 500, { 'offsetX': -1400, 'offsetY': -1400, 'speed': 0.05 });
    }

    getElementFromListItem(title) {
        return title.parent();
    }
    
}
test('Open Menus', async t => {
    const viewerControlsMenu = Selector('a').withText('Viewer Controls');
    const viewerSnapshot = Selector('a').withText('Viewer Snapshot');
    const connectivityControl = Selector('a').withText('Connectivity Control');

    //Items to look for beneath each dropdown
    const imageColorMappingItem = Selector('li').withText('Image Color Mapping');
    const takeSnapshotButton = Selector('button').withText('Take Snapshot');
    const createLinesButton = Selector('button').withText('Create Lines');

    await t
        .click(viewerControlsMenu)
        .expect(imageColorMappingItem.visible).ok()
        .click(viewerSnapshot)
        .expect(takeSnapshotButton.visible).ok()
        .click(connectivityControl)
        .expect(createLinesButton.visible).ok()
        .takeScreenshot('check_conn/OpenMenus.png')
        .expect()
        .click(viewerControlsMenu)
        .click(viewerSnapshot)
        .click(connectivityControl)
        .takeScreenshot('check_conn/CloseMenus.png');
});

test('Check Opacity', async t => {
    const page = new Page();
    await page.openViewerControls();

    const opacityInput = page.getElementFromListItem(Selector('li').withText('Opacity')).find('input');
    await t
        .takeScreenshot('conn_viewer_opacity/OpaqueBrodmannAreas.png')
        .click(opacityInput)
        .selectText(opacityInput).pressKey('delete').typeText(opacityInput, '0.2').pressKey('enter')
        .takeScreenshot('conn_viewer_opacity/TranslucentBrodmannAreas.png');
});

test('Check Zoom Controls', async t => {
    const page = new Page();
    await page.openViewerControls();

    const resetButton = Selector('button').withText('Reset');
    const zoomOut = Selector('button').withText('Z-');
    const zoomIn = Selector('button').withText('Z+');

    await t
        .click(zoomIn)
        .click(zoomIn)
        .click(zoomIn)
        .takeScreenshot('conn_viewer_zoom/ZoomedIn.png')
        .click(resetButton)
        .takeScreenshot('conn_viewer_zoom/ResetViewer.png')
        .click(zoomOut)
        .click(zoomOut)
        .click(zoomOut)
        .takeScreenshot('conn_viewer_zoom/ZoomedOut.png');
});

test('Rotate Viewer', async t => {
    const page = new Page();
    await page.rotateViewer();
});
