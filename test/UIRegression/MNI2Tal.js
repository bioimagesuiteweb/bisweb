/* globals test, fixture */

import { Selector } from 'testcafe';
import { ClientFunction } from 'testcafe';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/mni2tal.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture `MNI2Tal`.page`${webpage}`;

test('Click Viewers', async t => {
    const xviewer = Selector('#xviewer', {'timeout' : 3});
    const yviewer = Selector('#yviewer', {'timeout' : 3});
    const zviewer = Selector('#zviewer', {'timeout' : 3});
    
    await t 
        .click(xviewer, {'offsetX' : 5})
        .click(yviewer, {'offsetX' : 5})
        .click(zviewer, {'offsetX' : 5});

    const talx = Selector('#talx');
    const taly = Selector('#taly');
    const talz = Selector('#talz');

    //taly will be negative in this case
    //negative values are strings as opposed to integers, so they have to be checked as strings
    
    await t
        .expect(talx.value).within(80, 94)
        .expect(taly.value).match(/-+/)
        .expect(talz.value).within(15, 25);
});

test('Move Sliders', async t => {
    const xslider = Selector('#xcontrols');
    const yslider = Selector('#ycontrols');
    const zslider = Selector('#zcontrols');

    await t
        .typeText(xslider, '180')
        .typeText(yslider, '216')
        .typeText(zslider, '180');
    
    const mnix = Selector('#mnix', {'timeout' : 3});
    const mniy = Selector('#mniy', {'timeout' : 3});
    const mniz = Selector('#mniz', {'timeout' : 3});

    await t
        .expect(mnix.value).match(/90/)
        .expect(mniy.value).match(/90/)
        .expect(mniz.value).match(/108/);
});

test('Enter MNI Values', async t => {
    const mnix = Selector('#mnix', {'timeout' : 3});
    const mniy = Selector('#mniy', {'timeout' : 3});
    const mniz = Selector('#mniz', {'timeout' : 3});
    const mniConvertButton = Selector('#mnigo', {'timeout' : 3});

    await t
        .selectText(mnix).pressKey('delete').typeText(mnix, '0')
        .selectText(mniy).pressKey('delete').typeText(mniy, '0')
        .selectText(mniz).pressKey('delete').typeText(mniz, '0')
        .click(mniConvertButton);

    const talx = Selector('#talx', {'timeout' : 3});
    const taly = Selector('#taly', {'timeout' : 3});
    const talz = Selector('#talz', {'timeout' : 3});
    
    await t
        .expect(talx.value).match(/0/)
        .expect(taly.value).match(/-2/)
        .expect(talz.value).match(/3/);
    
});

test('Enter Tal Values', async t => {
    const talx = Selector('#talx', {'timeout' : 3});
    const taly = Selector('#taly', {'timeout' : 3});
    const talz = Selector('#talz', {'timeout' : 3});
    const talConvertButton = Selector('#talgo', {'timeout' : 3});

    await t
        .selectText(talx).pressKey('delete').typeText(talx, '0')
        .selectText(taly).pressKey('delete').typeText(taly, '0')
        .selectText(talz).pressKey('delete').typeText(talz, '0')
        .click(talConvertButton);

    const mnix = Selector('#mnix', {'timeout' : 3});
    const mniy = Selector('#mniy', {'timeout' : 3});
    const mniz = Selector('#mniz', {'timeout' : 3});  

    await t
        .expect(mnix.value).match(/0/)
        .expect(mniy.value).match(/2/)
        .expect(mniz.value).match(/-4/);
});

test('Check Brodmann Areas', async t => {
    const areaSelector = Selector('#baselectbox');
    const areaOption = areaSelector.find('option');

    await t
        .click(areaSelector)
        .click(areaOption.withText('Right-BA6'));
    
    const talx = Selector('#talx', {'timeout' : 3});
    const taly = Selector('#taly', {'timeout' : 3});
    const talz = Selector('#talz', {'timeout' : 3});

    await t
        .expect(talx.value).match(/28/)
        .expect(taly.value).match(/1/)
        .expect(talz.value).match(/47/);

    await t
        .click(areaSelector)
        .click(areaOption.withText('Right-PrimMotor (4)'));
        
    await t
        .expect(talx.value).match(/38/)
        .expect(taly.value).match(/-15/)
        .expect(talz.value).match(/42/);

});

test('Reset Areas', async t => {
    const areaSelector = Selector('#baselectbox');
    const areaOption = areaSelector.find('option');

    await t
        .click(areaSelector)
        .click(areaOption.withText('Right-SensoryAssoc (5)'));
    
    const mnix = Selector('#mnix', { 'timeout': 3 });
    const mniy = Selector('#mniy', { 'timeout': 3 });
    const mniz = Selector('#mniz', { 'timeout': 3 });

    await t
        .expect(mnix.value).match(/15/)
        .expect(mniy.value).match(/-33/)
        .expect(mniz.value).match(/48/);

    const resetButton = Selector('#resetbutton');

    await t
        .click(resetButton)
        .expect(mnix.value).match(/0/)
        .expect(mniy.value).match(/0/)
        .expect(mniz.value).match(/0/);

    
});

test('Open Manual', async t => {
    const manual = Selector('#manual').find('a');
    const getPageUrl = ClientFunction( () => { return window.location.href.toString(); });
    await t
        .click(manual)
        .expect(getPageUrl()).match(/.*bioimagesuiteweb.github.io\/bisweb-manual.*/);
});

/*
test('Open Main Application', async t => {
    const logo = Selector('#bislogo');
    const getPageUrl = ClientFunction( () => { return window.location.href.toString(); });

    await t
        .click(logo)
        .expect(getPageUrl()).match(/.*index.html.* /);
});
*/

test('Expand Application Info', async t => {
    const aboutApp = Selector('#aboutframe');
    const checkFrameOpen = ClientFunction( () => {
        let detailsFrame = document.getElementById('detailsframe');
        let frameOpen = detailsFrame.getAttribute('open');

        return frameOpen;
    });

    await t
        .click(aboutApp)
        .expect(checkFrameOpen()).eql('');

});

//TODO: Test file buttons in a separate tester
/*
test('Open Batch Convert', async t => {
    const tal2mniButton = Selector('#batchframe').find('#batch2');
    const openedPageUrlOk = ClientFunction( () => { 
        let existingWindow = window.open('', )
        return location.match(/.*bisweb-test.auth.* /)
            || location.match(/.*dropbox.com* /)
            || location.match(/.*accounts.google.com.* /);
    });
});
*/
