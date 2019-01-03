/* globals test, fixture */

import { Selector, t } from 'testcafe';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/editor.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture`Editor Tests`.page`${webpage}`;

//specify class to avoid repeating common tasks
//http://devexpress.github.io/testcafe/documentation/test-api/test-code-structure.html
export default class Page {
    constructor() {
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

    async typeInTextbox(textbox, location) {
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

    async initializePaintTool() {
        this.loadImage();

        const paintToolBox = Selector('div').withAttribute('aria-label', 'bisweb-paint-widget');
        const enableButton = this.getInputFromTitle(paintToolBox.find('label').withText('Enable'));

        await t
            .click(enableButton);
    }

    async createThresholdedImage() {
        this.loadImage();

        const toolsBar = Selector('.dropdown-toggle').withText('Tools');
        const createObjectmapItem = Selector('a').withText('Create Objectmap');

        await t
            .click(toolsBar)
            .click(createObjectmapItem);

        const lowObjectmapThreshold = this.getElementFromTitle(Selector('span').withText('Low Threshold')).find('input');
        const thresholdButton = Selector('button').withText('Create Mask');

        await t
            .selectText(lowObjectmapThreshold).pressKey('delete').typeText(lowObjectmapThreshold, '100').pressKey('enter')
            .click(thresholdButton)
            .wait(500);
    }

    async prepareForMorphologyOperations() {
        await this.createThresholdedImage();

        //open the morphology operations sidebar
        const toolsBar = Selector('.dropdown-toggle').withText('Tools');
        const morphologyOperationsItem = Selector('a').withText('Morphology Operations');
        await t
            .click(toolsBar)
            .click(morphologyOperationsItem);
    }

    //drag cursor across canvas to paint a line
    //this function is a little brittle! the canvas is totally opaque as an element so I had to find the location of the viewer by trial and error
    //-Zach
    async paintAxialRegion(screenshotName) {
        const canvas = Selector('canvas');
        await t
            .drag(canvas, 500, 400, { 'offsetX': -2400, 'offsetY': -1950, 'speed': 0.05 })
            .takeScreenshot(screenshotName);
    }

    /**
     * Set the file source of the application to one of the buttons on the modal.
     * 
     * @param {String} fileSource - The name on the label on the file source modal to change to.
     */
    async setFileSource(fileSource) {
        const helpDropdown = Selector('a').withText('Help');
        const fileSourceItem = Selector('a').withText('Set File Source');
        const fileServerHelperLabel = Selector('label').withText(fileSource);
        const closeButton = Selector('.btn.btn-info').withText('Close');
    
        await t
            .click(helpDropdown)
            .click(fileSourceItem)
            .click(fileServerHelperLabel)
            .click(closeButton);
    }

    /**
     * Logs into the Bisweb fileserver. 
     */
    async signInToFileserver() {
        const fileDropdown = Selector('a').withText('File');
        const loadImageItem = Selector('a').withText('Load Image');
        const connectButton = Selector('button').withText('Connect');
        const loginAlert = Selector('.alert').withText('Login to BisWeb FileServer Successful');

        await t
            .click(fileDropdown)
            .click(loadImageItem)
            .click(connectButton)
            .expect(loginAlert.visible).ok();
    }

    getViewerControlPane() {
        return this.viewerControlsPanel.parent().parent().parent();
    }

    getElementFromTitle(title) {
        return title.parent();
    }

    getInputFromTitle(title) {
        return title.parent().find('input');
    }

    getBodyFromTitle(title) {
        return title.parent().parent().parent();
    }
}

test('Load Image', async t => {

    const page = new Page();
    page.loadImage();
    page.openViewerPane();

    //check that paint tool appears
    const colorButton = Selector('.btn.color-btn');
    await t
        .takeScreenshot('load_image/LoadImage.png')
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
        .takeScreenshot('use_zoom_controls/BaseImage.png')
        .click(zoomInButton)
        .click(zoomInButton)
        .click(zoomInButton)
        .takeScreenshot('use_zoom_controls/ZoomedIn.png');

    await t
        .click(resetButton)
        .click(zoomOutButton)
        .click(zoomOutButton)
        .click(zoomOutButton)
        .takeScreenshot('use_zoom_controls/ZoomedOut.png');
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
        .takeScreenshot('use_sliders/MoveSagittal.png');

    page.typeInTextbox(iSliderTextBox, '45');

    await t
        .drag(jSliderDraggable, 100, 0)
        .takeScreenshot('use_sliders/MoveCoronal.png');

    page.typeInTextbox(jSliderTextBox, '54');

    await t
        .drag(kSliderDraggable, 100, 0)
        .takeScreenshot('use_sliders/MoveAxial.png');
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
    await t.takeScreenshot('use_chevrons/MoveSagittalLeft.png');
    await page.typeInTextbox(iSlider, '45');

    await page.clickMultipleTimes(sagittalRight, 10);
    await t.takeScreenshot('use_chevrons/MoveSagittalRight.png');
    await page.typeInTextbox(iSlider, '45');

    await page.clickMultipleTimes(coronalLeft, 10);
    await t.takeScreenshot('use_chevrons/MoveCoronalLeft.png');
    await page.typeInTextbox(jSlider, '54');

    await page.clickMultipleTimes(coronalRight, 10);
    await t.takeScreenshot('use_chevrons/MoveCoronalRight.png');
    await page.typeInTextbox(jSlider, '54');

    await page.clickMultipleTimes(axialLeft, 10);
    await t.takeScreenshot('use_chevrons/MoveAxialLeft.png');
    await page.typeInTextbox(kSlider, '45');

    await page.clickMultipleTimes(axialRight, 10);
    await t.takeScreenshot('use_chevrons/MoveAxialRight.png');
    await page.typeInTextbox(kSlider, '45');
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
        .takeScreenshot('set_slice_view/SagittalView.png')
        .click(modeSelectorDropdown)
        .click(Selector('option').withText('Coronal'))
        .wait(500)
        .takeScreenshot('set_slice_view/CoronalView.png')
        .click(modeSelectorDropdown)
        .click(Selector('option').withText('Axial'))
        .wait(500)
        .takeScreenshot('set_slice_view/AxialView.png');
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
        .takeScreenshot('check_image_settings/NoInterpolate.png')
        .click(interpolateToggle)
        .click(autoContrastToggle)
        .wait(500)
        .takeScreenshot('check_image_settings/NoAutoContrast')
        .click(autoContrastToggle);

    page.typeInTextbox(minIntTextbox, '50');

    await t
        .takeScreenshot('check_image_settings/HigherMinInt.png');

    const maxIntTextbox = page.getElementFromTitle(Selector('span').withText('Max Int')).find('input');
    page.typeInTextbox(minIntTextbox, '0');
    page.typeInTextbox(maxIntTextbox, '120');

    await t
        .takeScreenshot('check_image_settings/LowerMaxInt.png');

});

test('Use Paint Tool', async t => {
    const page = new Page();
    page.initializePaintTool();

    const paintToolBox = Selector('div').withAttribute('aria-label', 'bisweb-paint-widget');
    const paintToolContainer = paintToolBox.parent();

    await t
        .expect(paintToolContainer.getStyleProperty('background-color')).contains('rgb(68, 0, 0)');

    page.paintAxialRegion('PaintedRegion.png');

    const undoButton = Selector('button').withText('Undo');
    const redoButton = Selector('button').withText('Redo');

    await t
        .click(undoButton)
        .wait(500)
        .takeScreenshot('use_paint_tool/UndoPaint.png')
        .click(redoButton)
        .wait(500)
        .takeScreenshot('use_paint_tool/RedoPaint.png');
});

test('Change Paintbrush Size', async t => {
    const page = new Page();
    page.initializePaintTool();

    const sliderTextBox = page.getElementFromTitle(Selector('span').withText('Brush Size')).find('input');

    await t
        .click(sliderTextBox)
        .selectText(sliderTextBox).pressKey('delete').typeText(sliderTextBox, '25');

    await page.paintAxialRegion('change_brush_size/BigBrushPaintedRegion.png');

    const undoButton = Selector('button').withText('Undo');

    await t
        .click(undoButton)
        .click(sliderTextBox)
        .selectText(sliderTextBox).pressKey('delete').typeText(sliderTextBox, '1');

    await page.paintAxialRegion('change_brush_size/SmallBrushPaintedRegion.png');
});

test('Change Brush Color', async t => {
    const page = new Page();
    page.initializePaintTool();

    const colorButton = Selector('.color-btn').withAttribute('bis', '5');
    await t
        .click(colorButton);

    await page.paintAxialRegion('change_brush_color/DifferentColorPaintedRegion.png');
});

test('Use 3D Brush', async t => {
    const page = new Page();
    page.initializePaintTool();

    const brushToggle = page.getElementFromTitle(Selector('label').withText('3D Brush')).find('input');
    const sliderTextBox = page.getElementFromTitle(Selector('span').withText('Brush Size')).find('input');

    await t
        .click(brushToggle)
        .click(sliderTextBox)
        .selectText(sliderTextBox).pressKey('delete').typeText(sliderTextBox, '25');

    await page.paintAxialRegion('use_3d_brush/ThreeDimensionalBrush.png');
});

test('Overwrite Painted Area', async t => {
    const page = new Page();
    page.initializePaintTool();

    const sliderTextBox = page.getElementFromTitle(Selector('span').withText('Brush Size')).find('input');

    await t
        .click(sliderTextBox)
        .selectText(sliderTextBox).pressKey('delete').typeText(sliderTextBox, '25');

    await page.paintAxialRegion('overwrite_painted_area/NoOverwritePaint.png');

    const overwriteToggle = page.getElementFromTitle(Selector('label').withText('Overwrite')).find('input');
    const overwriteColor = Selector('.color-btn').withText('0');

    await t
        .click(overwriteToggle)
        .click(overwriteColor);

    await page.paintAxialRegion('overwrite_painted_area/OverwritePaint.png');
});

test('Disable Paint Tool', async t => {
    const page = new Page();
    page.initializePaintTool();

    const enableButton = page.getElementFromTitle(Selector('label').withText('Enable')).find('input');
    const paintToolContainer = Selector('div').withAttribute('aria-label', 'bisweb-paint-widget').parent();

    await t
        .click(enableButton)
        .expect(paintToolContainer.getStyleProperty('background-color')).notContains('rgb(68, 0, 0)');

    await page.paintAxialRegion('disable_paint_tool/DisabledPaint.png');
});

test('Do Paint Thresholding', async t => {
    const page = new Page();
    page.initializePaintTool();

    const thresholdButton = page.getElementFromTitle(Selector('label').withText('Threshold')).find('input');
    const minThresholdTextBox = page.getElementFromTitle(Selector('span').withText('Min Threshold')).find('input');
    const maxThresholdTextBox = page.getElementFromTitle(Selector('span').withText('Max Threshold')).find('input');
    const brushSizeTextBox = page.getElementFromTitle(Selector('span').withText('Brush Size')).find('input');
    const undoButton = Selector('button').withText('Undo');

    await t
        .click(minThresholdTextBox)
        .click(thresholdButton)
        .selectText(minThresholdTextBox).pressKey('delete').typeText(minThresholdTextBox, '100').pressKey('enter')
        .selectText(brushSizeTextBox).pressKey('delete').typeText(brushSizeTextBox, '25').pressKey('enter');

    await page.paintAxialRegion('paint_thresholding/RaisedLowThreshold.png');

    await t
        .takeScreenshot('paint_thresholding/LowThresholdedPaint.png')
        .click(undoButton)
        .selectText(minThresholdTextBox).pressKey('delete').typeText(minThresholdTextBox, '0').pressKey('enter')
        .selectText(maxThresholdTextBox).pressKey('delete').typeText(maxThresholdTextBox, '100').pressKey('enter');

    await page.paintAxialRegion('paint_thresholding/LoweredHighThreshold.png');
});

test('Create Threshold Objectmaps', async t => {
    const page = new Page();
    await page.createThresholdedImage();

    await t
        .takeScreenshot('create_threshold_objectmaps/LowThresholdOverlay.png');

    //clear objectmap opens a modal asking the user to confirm so make sure to click 'Ok' there too
    const objectmapBar = Selector('.dropdown-toggle').withText('Objectmap');
    const clearObjectmapItem = Selector('a').withText('Clear Objectmap');
    const confirmButton = Selector('button').withText('OK');
    const lowObjectmapThreshold = page.getElementFromTitle(Selector('span').withText('Low Threshold')).find('input');
    const highObjectmapThreshold = page.getElementFromTitle(Selector('span').withText('High Threshold')).find('input');
    const thresholdButton = Selector('button').withText('Create Mask');

    await t
        .click(objectmapBar)
        .click(clearObjectmapItem)
        .click(confirmButton)
        .selectText(lowObjectmapThreshold).pressKey('delete').typeText(lowObjectmapThreshold, '0').pressKey('enter')
        .selectText(highObjectmapThreshold).pressKey('delete').typeText(highObjectmapThreshold, '100').pressKey('enter')
        .click(thresholdButton)
        .wait(500)
        .takeScreenshot('create_threshold_objectmaps/HighThresholdOverlay.png');
});

test('Morphology Median Image', async t => {
    const page = new Page();
    await page.prepareForMorphologyOperations();

    const morphologyDropdown = page.getElementFromTitle(Selector('span').withText('Operation')).find('select');
    const runMorphologyOperation = Selector('button').withText('Execute');

    await t
        .takeScreenshot('morph_median_image/BaseMorphologyImage.png')
        .wait(1000)
        .click(morphologyDropdown)
        .click(Selector('option').withAttribute('value', 'median'))
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_median_image/LowRadiusMedianImage.png');

    await page.prepareForMorphologyOperations();
    const radiusTextBox = page.getElementFromTitle(Selector('span').withText('Radius')).find('input');

    await t
        .click(radiusTextBox)
        .selectText(radiusTextBox).pressKey('delete').typeText(radiusTextBox, '2').pressKey('enter')
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_median_image/HighRadiusMedianImage.png');
});

test('Morphology Dilate Image', async t => {
    const page = new Page();
    await page.prepareForMorphologyOperations();

    const morphologyDropdown = page.getElementFromTitle(Selector('span').withText('Operation')).find('select');
    const runMorphologyOperation = Selector('button').withText('Execute');

    await t
        .takeScreenshot('morph_dilate_image/BaseMorphologyImage.png')
        .click(morphologyDropdown)
        .click(Selector('option').withAttribute('value', 'dilate'))
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_dilate_image/LowRadiusDilatedImage.png');

    await page.prepareForMorphologyOperations();
    const radiusTextBox = page.getElementFromTitle(Selector('span').withText('Radius')).find('input');

    await t
        .click(radiusTextBox)
        .selectText(radiusTextBox).pressKey('delete').typeText(radiusTextBox, '2').pressKey('enter')
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_dilate_image/HighRadiusDilatedImage.png');
});

test('Morphology Erode Image', async t => {
    const page = new Page();
    await page.prepareForMorphologyOperations();

    const morphologyDropdown = page.getElementFromTitle(Selector('span').withText('Operation')).find('select');
    const runMorphologyOperation = Selector('button').withText('Execute');

    await t
        .takeScreenshot('morph_erode_image/BaseMorphologyImage.png')
        .click(morphologyDropdown)
        .click(Selector('option').withAttribute('value', 'erode'))
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_erode_image/LowRadiusErodedImage.png');

    await page.prepareForMorphologyOperations();
    const radiusTextBox = page.getElementFromTitle(Selector('span').withText('Radius')).find('input');

    await t
        .click(radiusTextBox)
        .selectText(radiusTextBox).pressKey('delete').typeText(radiusTextBox, '2').pressKey('enter')
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_erode_image/HighRadiusErodedImage.png');
});

test('Morphology Erode then Dilate Image', async t => {
    const page = new Page();
    await page.prepareForMorphologyOperations();

    const morphologyDropdown = page.getElementFromTitle(Selector('span').withText('Operation')).find('select');
    const runMorphologyOperation = Selector('button').withText('Execute');

    await t
        .takeScreenshot('morph_erode_dilate_image/BaseMorphologyImage.png')
        .click(morphologyDropdown)
        .click(Selector('option').withAttribute('value', 'erodedilate'))
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_erode_dilate_image/LowRadiusErodeDilatedImage.png');

    await page.prepareForMorphologyOperations();
    const radiusTextBox = page.getElementFromTitle(Selector('span').withText('Radius')).find('input');

    await t
        .click(radiusTextBox)
        .selectText(radiusTextBox).pressKey('delete').typeText(radiusTextBox, '2').pressKey('enter')
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_erode_dilate_image/HighRadiusErodeDilatedImage.png');
});

test('Morphology Dilate then Erode Image', async t => {
    const page = new Page();
    await page.prepareForMorphologyOperations();

    const morphologyDropdown = page.getElementFromTitle(Selector('span').withText('Operation')).find('select');
    const runMorphologyOperation = Selector('button').withText('Execute');

    await t
        .takeScreenshot('morph_dilate_erode_image/BaseMorphologyImage.png')
        .click(morphologyDropdown)
        .click(Selector('option').withAttribute('value', 'dilateerode'))
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_dilate_erode_image/LowRadiusDilateErodedImage.png');

    await page.prepareForMorphologyOperations();
    const radiusTextBox = page.getElementFromTitle(Selector('span').withText('Radius')).find('input');

    await t
        .click(radiusTextBox)
        .selectText(radiusTextBox).pressKey('delete').typeText(radiusTextBox, '2').pressKey('enter')
        .click(runMorphologyOperation)
        .wait(1000)
        .takeScreenshot('morph_dilate_erode_image/HighRadiusDilateErodedImage.png');
});

test('Regularize Objectmap', async t => {
    const page = new Page();
    await page.createThresholdedImage();

    const toolsBar = Selector('.dropdown-toggle').withText('Tools');
    const regularizeObjectmapItem = Selector('a').withText('Regularize Objectmap');
    const smoothnessTextBox = page.getElementFromTitle(Selector('span').withText('Smoothness')).find('input');
    const smoothButton = Selector('.btn-success').withText('Smooth');

    await t
        .takeScreenshot('regularize_objectmap/UnregularizedObjectmap.png')
        .click(toolsBar)
        .click(regularizeObjectmapItem)
        .selectText(smoothnessTextBox).pressKey('delete').typeText(smoothnessTextBox, '12.0').pressKey('enter')
        .click(smoothButton)
        .wait(1000)
        .takeScreenshot('regularize_objectmap/RegularizedObjectmap.png');
});

test('Mask Image', async t => {
    const page = new Page();
    await page.createThresholdedImage();

    const toolsBar = Selector('.dropdown-toggle').withText('Tools');
    const maskImageItem = Selector('a').withText('Mask Image');


    await t
        .click(toolsBar)
        .click(maskImageItem);


    const maskImageBarTitle = Selector('a').withText('Mask Image').withAttribute('data-toggle', 'collapse');
    const maskImagePanel = page.getBodyFromTitle(maskImageBarTitle);
    const thresholdTextBox = maskImagePanel.find('input').withAttribute('type', 'text');
    const maskImageButton = maskImagePanel.find('.btn.btn-success');

    await t
        .expect(maskImageBarTitle.visible).ok()
        .selectText(thresholdTextBox).pressKey('delete').typeText(thresholdTextBox, '0.5').pressKey('enter')
        .click(maskImageButton)
        .wait(1000)
        .takeScreenshot('mask_image/MaskedImage.png');
});

test('Load Brodmann Areas and Plot VOI', async t => {
    const page = new Page();
    await page.loadImage();

    const objectmapItem = Selector('a').withText('Objectmap');
    const loadBrodmannItem = Selector('a').withText('Load Yale Brodmann Atlas (2mm)');

    await t
        .click(objectmapItem)
        .click(loadBrodmannItem)
        .takeScreenshot('load_brodmann/BrodmannOverlay.png');

    //open VOI analysis tool and 
    const VOIAnalysisItem = Selector('a').withText('VOI Analysis');
    const VOIAnalysisChartTitle = Selector('.modal-title').withText('VOI Tool');
    const alertCloseButton = Selector('.alert').find('button');

    await t
        .click(objectmapItem)
        .click(VOIAnalysisItem)
        .wait(500)
        .expect(VOIAnalysisChartTitle.visible).ok()
        .click(alertCloseButton)
        .takeElementScreenshot(page.getBodyFromTitle(VOIAnalysisChartTitle), 'load_brodmann/BrodmannIntensityChart.png');


    //can't currently test the save functionality because the system save dialogs are opaque to the browser and by extension testcafe
    const plotVolumesButton = Selector('button').withText('Plot VOI Volumes');
    const saveSnapshotButton = Selector('button').withText('Save Snapshot');
    const saveSnapshotModalTitle = Selector('.modal-title').withText('This is the snapshot');

    await t
        .click(plotVolumesButton)
        .wait(500)
        .takeElementScreenshot(page.getBodyFromTitle(VOIAnalysisChartTitle), 'load_brodmann/BrodmannVolumeChart.png')
        .click(saveSnapshotButton)
        .wait(1000)
        .expect(saveSnapshotModalTitle.exists).ok();
});

test('Take Viewer Snapshot', async t => {
    const page = new Page();
    await page.loadImage();

    const viewerSnapshotDropdown = Selector('a').withText('Viewer Snapshot');
    const snapshotButton = Selector('button').withText('Take Snapshot');
    const snapshotModal = Selector('.modal-title').withText('This is the snapshot');

    await t 
        .click(viewerSnapshotDropdown)
        .click(snapshotButton)
        .wait(2000)
        .takeScreenshot('take_viewer_snapshot/ViewerSnapshotModal.png')
        .expect(snapshotModal.exists).ok();
});

test('Test Video Player', async t => {
    const page = new Page();
    page.loadImage();
    await page.setFileSource('File Server Helper');
    await page.signInToFileserver();

    //currently hardcoded, perhaps create a testing directory?
    const testPath = 'Downloads/test_motion_correction.nii.gz';

    const loadImageTitle = Selector('.modal-title').withText('Load image');
    const loadImageModal = page.getBodyFromTitle(loadImageTitle);
    const pathEntryBox = loadImageModal.find('input');
    const playButton = Selector('.glyphicon.glyphicon-play');
    const alertCloseButton = Selector('.alert.alert-info').find('button');
    const viewerControlsTitle = Selector('a').withText('Viewer Controls');

    await t
        .click(pathEntryBox)
        .typeText(pathEntryBox, testPath)
        .pressKey('enter')
        .click(alertCloseButton)
        .click(viewerControlsTitle)
        .expect(playButton.visible).ok()
        .takeScreenshot('test_video_player/BaseMotionCorrectedImage.png');

    const frameTextbox = page.getElementFromTitle(Selector('span').withText('Frame/Comp')).find('input');
    const pauseButton = Selector('.glyphicon.glyphicon-pause');
    const nextSlideButton = Selector('.glyphicon.glyphicon-chevron-right').withAttribute('index', '9');
    const previousSlideButton = Selector('.glyphicon.glyphicon-chevron-left').withAttribute('index', '6');

    page.typeInTextbox(frameTextbox, '4');

    await t
        .takeScreenshot('test_video_player/AdvancedMotionCorrectedImage.png')
        .expect(frameTextbox.value).eql('4')
        .click(nextSlideButton)
        .click(nextSlideButton)
        .expect(frameTextbox.value).eql('1')
        .click(previousSlideButton)
        .expect(frameTextbox.value).eql('0');

    //TODO: Record video of the motion correction data playing when the feature is added to testcafe 
    //https://github.com/DevExpress/testcafe/issues/2151
    await t
        .click(playButton)
        .wait(3000)
        .click(pauseButton);
    
    const fileDropdown = Selector('.dropdown-toggle').withText('File');
    const fileLoadItem = Selector('a').withText('Load MNI T1 (2mm)');

    //buttons should hide once a new image is loaded
    await t
        .click(fileDropdown)
        .click(fileLoadItem)
        .wait(1000)
        .expect(playButton.visible).notOk();
        
});

//TODO: Fix this test
test('Save Application State', async t => {
    const page = new Page();
    await page.loadImage();
    await page.setFileSource('File Server Helper');

    const iCoordTextbox = page.getElementFromTitle(Selector('span').withText('I-Coord')).find('input');
    const jCoordTextbox = page.getElementFromTitle(Selector('span').withText('J-Coord')).find('input');
    const kCoordTextbox = page.getElementFromTitle(Selector('span').withText('K-Coord')).find('input');
    const viewerControlsDropdown = Selector('a').withText('Viewer Controls');

    await t
        .click(viewerControlsDropdown);

    await page.typeInTextbox(iCoordTextbox, '79');
    await page.typeInTextbox(jCoordTextbox, '73');
    await page.typeInTextbox(kCoordTextbox, '22');

    const loadImageTitle = Selector('.modal-title').withText('Load image');
    const loadImageModal = page.getBodyFromTitle(loadImageTitle);
    const loadImageModalCloseButton = loadImageModal.find('.modal-header').find('button');

    //want to sign in to the fileserver but to close the load image modal
    await page.signInToFileserver();
    await t.click(loadImageModalCloseButton);

    const fileDropdown = Selector('.dropdown-toggle').withText('File');
    const saveApplicationDropdown = Selector('a').withText('Save Application State');

    const saveStateTitle = Selector('.modal-title').withText('Save Application State');
    const saveStateModal = page.getBodyFromTitle(saveStateTitle);
    const pathEntryBox = saveStateModal.find('input');

    const appstatePath = 'editor.biswebstate';

    await t
        .click(fileDropdown)
        .click(saveApplicationDropdown)
        .click(pathEntryBox)
        .pressKey('enter')
        .takeScreenshot('save_application_state/ApplicationBeforeReload.png');
    
    await page.loadImage();
    const loadApplicationDropdown = Selector('a').withText('Load Application State');
    await t
        .takeScreenshot('save_application_state/ApplicationAfterReload.png')
        .click(fileDropdown)
        .click(loadApplicationDropdown)
        .click(pathEntryBox)
        .typeText(pathEntryBox, appstatePath)
        .pressKey('enter')
        .wait(1000)
        .takeScreenshot('save_application_state/ApplicationAfterLoadAppState.png');

});

test('Restart Application', async t => {
    const page = new Page();
    await page.loadImage();

    const fileDropdown = Selector('.dropdown-toggle').withText('File');
    const restartApplication = Selector('a').withText('Restart Application');
    const okButton = Selector('button').withText('OK');
    const cancelButton = Selector('button').withText('Cancel');

    //check cancel button
    await t 
        .click(fileDropdown)
        .click(restartApplication)
        .expect(okButton.visible).ok()
        .click(cancelButton);

    //refresh page and open reset application modal again
    await t
        .click(fileDropdown)
        .click(restartApplication)
        .click(okButton)
        .click(fileDropdown)
        .click(restartApplication)
        .expect(okButton.visible).ok();
});




