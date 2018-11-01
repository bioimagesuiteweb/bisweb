/* globals test, fixture */

import { Selector } from 'testcafe';

fixture `Viewer Tests`.page `https://git.yale.edu/pages/zls5/webapp/overlayviewer.html`;

test('Check Clusters', async t => {

    //Load sample data from help menu
    const helpDropdown = Selector('.dropdown-toggle').withText('Help');
    const sampleDataButton = Selector('a').withText('Load Sample Data');

    await t
        .click(helpDropdown)
        .click(sampleDataButton);
    
    //Set cluster size and open atlas and cluster tools
    const overlayColorMappingDropdown = Selector('li').withText('Overlay Color Mapping');
    const clusterSizeItem = Selector('.property-name').withText('Cluster Size').parent();
    const clusterSizeInput = clusterSizeItem.find('input');

    await t
        .click(overlayColorMappingDropdown)
        .click(clusterSizeInput).pressKey('delete')
        .typeText(clusterSizeInput, '75')
        .pressKey('enter');
    
   const editDropdown = Selector('.dropdown-toggle').withText('Edit');
   const atlasToolDropdown = Selector('a').withText('Atlas Tool');
   const clusterInfoDropdown = Selector('a').withText('Cluster Info Tool'); 

   await t
        .click(editDropdown)
        .click(atlasToolDropdown)
        .click(editDropdown)
        .click(clusterInfoDropdown);
    
    

});