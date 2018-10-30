import { Selector } from 'testcafe';

fixture `MNI2Tal`.page `https://bioimagesuiteweb.github.io/unstableapp/mni2tal.html`;

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