/* globals test, fixture */

import { Selector } from 'testcafe';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/biswebdisplaytest.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture `Getting Started`.page `${webpage}`;

test('Sample test', async t => {
    const runbutton = Selector('#compute');

    await t;
    await t.wait(10);
    await t.maximizeWindow();
    await t.click(runbutton);
    await t.wait(50000);
    
       
});
