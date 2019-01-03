/* globals test, fixture, document */

import { Selector, t } from 'testcafe';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/connviewer.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture`Connectivity Viewer Tests`.page`${webpage}`;

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

    async typeText(input, text) {
        await t
            .click(input)
            .selectText(input)
            .pressKey('delete')
            .typeText(input, text)
            .pressKey('enter');
    }

    getBodyFromTitle(title) {
        return title.parent().parent().parent();
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

test('Rotate Viewer', async () => {
    const page = new Page();
    await page.rotateViewer();
});

test('Toggle Viewer Modes', async t => {
    const page = new Page();
    await page.openViewerControls();

    const legendToggleButton = Selector('button').withText('Toggle Legends');
    const modeToggle = Selector('button').withText('Toggle 3D Mode');

    await t
        .click(legendToggleButton)
        .takeScreenshot('conn_viewer_toggle/LegendOff.png')
        .click(legendToggleButton)
        .takeScreenshot('conn_viewer_toggle/LegendOn.png')
        .click(modeToggle)
        .takeScreenshot('conn_viewer_toggle/CircleOnly.png')
        .click(modeToggle)
        .takeScreenshot('conn_viewer_toggle/3DViewerOnly.png')
        .click(modeToggle)
        .takeScreenshot('conn_viewer_toggle/CircleAnd3D.png');
});

test('Check Lines Without Data', async t => {
    const page = new Page();

    const createLinesButton = Selector('button').withText('Create Lines');
    const clearLinesButton = Selector('button').withText('Clear Lines');
    const errorModal = page.getBodyFromTitle(Selector('.bootbox-body').withText('No connectivity data loaded'));
    const errorModalClose = errorModal.find('.bootbox-close-button');

    await t
        .click(createLinesButton)
        .wait(1000)
        .takeScreenshot('conn_viewer_error_modal/ErrorModal.png')
        .expect(errorModal.visible).ok()
        .click(errorModalClose)
        .click(clearLinesButton)
        .expect(errorModal.visible).ok();
});

test('Check Shen Atlas', async t => {
    const page = new Page();

    //typing different coordinates into the node input should change the label displayed on the Lobe selector
    const nodeInput = page.getElementFromListItem(Selector('span').withText('Node')).find('input');
    const lobeSelector = page.getElementFromListItem(Selector('span').withText('Lobe')).find('select');
    
    await page.typeText(nodeInput, '0');
    await t
        .takeScreenshot('conn_viewer_shen/RPrefrontal.png')
        .expect(lobeSelector.value).eql('R-Prefrontal');
    
    await page.typeText(nodeInput, '25');
    await t
        .takeScreenshot('conn_viewer_shen/RMotorStrip.png')
        .expect(lobeSelector.value).eql('R-MotorStrip');

    await page.typeText(nodeInput, '50');
    await t
        .takeScreenshot('conn_viewer_shen/RParietal.png')
        .expect(lobeSelector.value).eql('R-Parietal');
    
    await page.typeText(nodeInput, '75');
    await t
        .takeScreenshot('conn_viewer_shen/ROccipital.png')
        .expect(lobeSelector.value).eql('R-Occipital');    
        
    await page.typeText(nodeInput, '100');
    await t
        .takeScreenshot('conn_viewer_shen/RCerebellum.png')
        .expect(lobeSelector.value).eql('R-Cerebellum');

    await page.typeText(nodeInput, '125');
    await t
        .takeScreenshot('conn_viewer_shen/RSubcortical.png')
        .expect(lobeSelector.value).eql('R-Subcortical');

    await page.typeText(nodeInput, '150');
    await t
        .takeScreenshot('conn_viewer_shen/LPrefrontal.png')
        .expect(lobeSelector.value).eql('L-Prefrontal');

    await page.typeText(nodeInput, '175');
    await t
        .takeScreenshot('conn_viewer_shen/LParietal.png')
        .expect(lobeSelector.value).eql('L-Parietal');

    await page.typeText(nodeInput, '200');
    await t
        .takeScreenshot('conn_viewer_shen/LTemporal.png')
        .expect(lobeSelector.value).eql('L-Temporal');

    await page.typeText(nodeInput, '225');
    await t
        .takeScreenshot('conn_viewer_shen/LLimbic.png')
        .expect(lobeSelector.value).eql('L-Limbic');

    await page.typeText(nodeInput, '250');
    await t
        .takeScreenshot('conn_viewer_shen/LCerebellum.png')
        .expect(lobeSelector.value).eql('L-Cerebellum');

    await page.typeText(nodeInput, '268');
    await t
        .takeScreenshot('conn_viewer_shen/LBrainstem.png')
        .expect(lobeSelector.value).eql('L-Brainstem');
});

test('Check AAL Atlas', async t => {
    const page = new Page();

    const parcellationsMenu = Selector('.dropdown-toggle').withText('Parcellations');
    const AALItem = Selector('a').withText('Use the AAL Atlas');

    await t
        .click(parcellationsMenu)
        .click(AALItem)
        .wait(2000);

    //typing different coordinates into the node input should change the label displayed on the Lobe selector
    const nodeInput = page.getElementFromListItem(Selector('span').withText('Node')).find('input');
    const lobeSelector = page.getElementFromListItem(Selector('span').withText('Lobe')).find('select');
    
    await page.typeText(nodeInput, '0');
    await t
        .takeScreenshot('conn_viewer_aal/LMotorStrip.png')
        .expect(lobeSelector.value).eql('L-MotorStrip');
    
    await page.typeText(nodeInput, '10');
    await t
        .takeScreenshot('conn_viewer_aal/RPrefrontal.png')
        .expect(lobeSelector.value).eql('R-Prefrontal');

    await page.typeText(nodeInput, '20');
    await t
        .takeScreenshot('conn_viewer_aal/RMotorStrip.png')
        .expect(lobeSelector.value).eql('R-MotorStrip');
    
    await page.typeText(nodeInput, '30');
    await t
        .takeScreenshot('conn_viewer_aal/RInsula.png')
        .expect(lobeSelector.value).eql('R-Insula');    
        
    await page.typeText(nodeInput, '40');
    await t
        .takeScreenshot('conn_viewer_aal/RLimbic.png')
        .expect(lobeSelector.value).eql('R-Limbic');

    await page.typeText(nodeInput, '50');
    await t
        .takeScreenshot('conn_viewer_aal/ROccipital.png')
        .expect(lobeSelector.value).eql('R-Occipital');

    await page.typeText(nodeInput, '60');
    await t
        .takeScreenshot('conn_viewer_aal/RParietal.png')
        .expect(lobeSelector.value).eql('R-Parietal');

    await page.typeText(nodeInput, '70');
    await t
        .takeScreenshot('conn_viewer_aal/RMotorStrip2.png')
        .expect(lobeSelector.value).eql('R-MotorStrip');

    await page.typeText(nodeInput, '80');
    await t
        .takeScreenshot('conn_viewer_aal/RTemporal.png')
        .expect(lobeSelector.value).eql('R-Temporal');

    await page.typeText(nodeInput, '90');
    await t
        .takeScreenshot('conn_viewer_aal/RTemporal2.png')
        .expect(lobeSelector.value).eql('R-Temporal');

    await page.typeText(nodeInput, '100');
    await t
        .takeScreenshot('conn_viewer_aal/RCerebellum.png')
        .expect(lobeSelector.value).eql('R-Cerebellum');

    await page.typeText(nodeInput, '116');
    await t
        .takeScreenshot('conn_viewer_aal/RCerebellum2.png')
        .expect(lobeSelector.value).eql('R-Cerebellum');
});

test('Check Sample Matrices', async t => {
    const page = new Page();

    const helpMenu = Selector('.dropdown-toggle').withText('Help');
    const sampleMatricesItem = Selector('a').withText('Load Sample Matrices');
    const createLinesButton = Selector('button').withText('Create Lines');
    const clearLinesButton = Selector('button').withText('Clear Lines');
    const modeSelector = page.getElementFromListItem(Selector('span').withText('Mode')).find('select');

    await t
        .click(helpMenu)
        .click(sampleMatricesItem)
        .click(createLinesButton)
        .wait(1500)
        .takeScreenshot('conn_viewer_matrices/SingleNodeLines.png')
        .click(clearLinesButton)
        .click(modeSelector)
        .click(Selector('option').withText('Single Lobe'))
        .click(createLinesButton)
        .wait(1500)
        .takeScreenshot('conn_viewer_matrices/SingleLobeLines.png')
        .click(clearLinesButton)
        .click(modeSelector)
        .click(Selector('option').withText('Single Network'))
        .click(createLinesButton)
        .wait(1500)
        .takeScreenshot('conn_viewer_matrices/SingleNetworkLines.png');

});
