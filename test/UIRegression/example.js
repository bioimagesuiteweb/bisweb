/* globals test, fixture */

import { Selector } from 'testcafe';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/viewer.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);

fixture `Getting Started`.page `${webpage}`;

test('Sample test', async t => {
    const dropdown = Selector('.navbar-nav').find('.dropdown');
    
    await t 
        .click(dropdown);
});
