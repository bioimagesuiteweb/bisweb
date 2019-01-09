import { Selector } from 'testcafe';

fixture `MNI2Tal Viewer`.page `https://bioimagesuiteweb.github.io/unstableapp/mni2tal.html`;

test('Click viewer', async t => {
    const yviewer = Selector('#yviewer');
    const xviewer = Selector('#xviewer');
    const zviewer = Selector('#zviewer');

    await t 
        .click(yviewer, { 'offsetX' : 5})
        .click(xviewer, { 'offsetX' : 5})
        .click(zviewer, { 'offsetX' : 5});

    const talx = Selector('#talx');
    const taly = Selector('#taly');
    const talz = Selector('#talz');

    await t
    	.expect(talx.value).eql('84')
    	.expect(taly.value).eql('-19')
    	.expect(talz.value).eql('19');
});
