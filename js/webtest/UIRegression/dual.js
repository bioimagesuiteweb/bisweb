/* globals test, fixture*/

import { Selector } from 'testcafe';
import { ClientFunction, t } from 'testcafe';

fixture`Overlay Tests`.page`http://localhost:8080/web/dualviewer.html`;

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
        const viewerTwoControls = Selector('a').withText('Viewer 2 Controls');

        await t
            .click(fileDropdown)
            .click(imageOneTab)
            .click(viewerTwoControls);    
    }

    async typeText(input, text) {
        await t
            .click(input)
            .selectText(input)
            .pressKey('delete')
            .typeText(input, text)
            .pressKey('enter');
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

    const iCoordTextBox = page.getElementFromListItem(Selector('li').withText('I-Coord')).find('input');
    const jCoordTextBox = page.getElementFromListItem(Selector('li').withText('J-Coord')).find('input');
    const kCoordTextBox = page.getElementFromListItem(Selector('li').withText('K-Coord')).find('input');

    await page.typeText(iCoordTextBox, '15');
    await page.typeText(jCoordTextBox, '20');
    await page.typeText(kCoordTextBox, '15');

    await t.takeScrenshot('check_viewer_two/MoveSliders.png');
});