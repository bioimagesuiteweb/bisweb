const $ = require('jquery');

class ProgressBar extends HTMLElement{

    constructor() {
        super();

        this.progressBarContainer = $(`
            <div class='alert alert-info progress-bar-container' role='alert' style='position: absolute; top: 0px; left: 10px'>
                <div class='progress'>
                    <div class='progress-bar bg-success' role='progressbar' style='width: 0%'>
                    </div>
                </div> 
            </div>
        `);
    }

    /**
     * Updates progress bar by a certain amount. Should be called by whichever function checks on the value of the loading resource, i.e. what the progress bar is tracking. 
     * 
     * @param {Number} percent - The number of percent to advance the bar by. 
     * @return the current value of the progress bar.
     */
    updateProgressBar(percent) {
        let currentProgress = this.progressBarContainer.find('.progress-bar').css('width');
        
        //strip out percent sign and add to value
        currentProgress.replace('%', '');
        let currentProgressValue = parseInt(currentProgress, 10) + percent; 
        if (currentProgressValue > 100) currentProgressValue = 100;

        currentProgress = currentProgressValue.toString() + '%';
        this.progressBarContainer.find('.progress-bar').css('width', currentProgress);
        return currentProgressValue;
    }

    /**
     * Configures the progress bar to call a function that will return how much more has been loaded from the tracked resource at a given interval.
     * Once progress is 100% the loading bar will be dismissed.
     * 
     * @param {Function} getterFn - Function that will return the difference between how much has been loaded from the last interval and how much is currently loaded.
     * @param {Number} interval - How often getterFn should be called in ms. 
     */
    attach(getterFn, interval = 250) {
        let getterInterval = setInterval( () => {
            let percentIncrease = getterFn();
            let totalPercent = this.updateProgressBar(percentIncrease);

            if (totalPercent === 100) {
                clearInterval(getterInterval);
                this.progressBarContainer.alert('close');
            }

        }, interval);

    }

    show() {
        this.progressBarContainer.alert();
    }

}

module.exports = ProgressBar;