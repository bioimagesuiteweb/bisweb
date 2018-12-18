/* globals test, fixture */

import { Selector } from 'testcafe';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/biswebdisplaytest.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture `Getting Started`.page `${webpage}`;

test('Sample test', async t => {
    const run = Selector('#toph4').find('#compute');
    
    await t
        .maximizeWindow()
        .click(run);
});
