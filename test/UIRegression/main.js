/* globals test, fixture, $*/

import { Selector } from 'testcafe';
import { ClientFunction } from 'testcafe';
import fs from 'fs';

import * as BisSetup from './bissetup';
const webpage = `${BisSetup.getServer()}/index.html`;
console.log('BisSetup=',BisSetup.getServer(),'-->',webpage);


fixture`Main Page Tests`.page`${webpage}`;

export default class Page {
    constructor() {
        this.slidesInCarousel = 6; //index of the highest numbered slide in the carousel
    }

    /**
     * Checks to see if the indices returned by the carousel viewer indicate a given shift (produced by clicking one of the arrows, or simply waiting).
     * These indices are the order in which the images appear in the carousel, e.g. the first image displayed is 0, the next 1, and so on, wrapping around from the maximum index.
     * Essentially this function compensates for wraparound in the slide viewer, since going left from 0 goes to the max slide index and going right from the max goes to 0.
     * 
     * @param {Number} firstIndex - The index of the first image 
     * @param {Number} secondIndex - The index of the second image
     * @param {Number} shift - The number of slides either moved forward or backward ('+' for forward '-' for backward)
     */
    checkShiftOk(firstIndex, secondIndex, shift) {
        return firstIndex + shift === secondIndex 
            || (firstIndex + shift) % this.slidesInCarousel === secondIndex
            || (firstIndex + shift) % this.slidesInCarousel === secondIndex - this.slidesInCarousel;
    }
}

test('Check Carousel Switches Automatically', async t => {
    //load jquery into client space
    await t
        .eval(new Function(fs.readFileSync('./jquery.min.js').toString()));

    //check which slide is displayed by looking at the active element in the indicators
    const getActiveElement =  ClientFunction( () => {
        const indicators = $('.carousel-indicators');
        return indicators.find('.active').attr('data-slide-to');
    });
    
    //get the first element displayed, wait an amount of time more than it would take for the carousel to switch, and check if 
    const firstActiveElement = await getActiveElement();
    await t
        .wait(8000)
        .expect(getActiveElement()).notEql(firstActiveElement);
});

test('Check Carousel Switches with Chevrons', async t => {
    const page = new Page();

    await t
        .eval(new Function(fs.readFileSync('./jquery.min.js').toString()));

    //check which slide is displayed by looking at the active element in the indicators
    const getActiveElement = ClientFunction(() => {
        const indicators = $('.carousel-indicators');
        return parseInt(indicators.find('.active').attr('data-slide-to'), 10);
    });

    const firstActiveIndex = await getActiveElement();
    const leftChevron = Selector('.glyphicon.glyphicon-chevron-left');
    const rightChevron = Selector('.glyphicon.glyphicon-chevron-right');

    await t
        .click(rightChevron);
    
    const secondActiveIndex = await getActiveElement();
    await t
        .expect(page.checkShiftOk(firstActiveIndex, secondActiveIndex, 1)).ok()
        .wait(500)
        .click(leftChevron);

    const thirdActiveIndex = await getActiveElement();
    await t
        .expect(page.checkShiftOk(secondActiveIndex, thirdActiveIndex, -1)).ok();
});
