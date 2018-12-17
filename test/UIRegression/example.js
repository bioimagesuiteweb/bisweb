/* globals test, fixture */

import { Selector } from 'testcafe';

fixture `Getting Started`.page `https://bioimagesuiteweb.github.io/unstableapp/viewer.html`;

test('Sample test', async t => {
    const dropdown = Selector('.navbar-nav').find('.dropdown');
    
    await t 
        .click(dropdown);
});
