const $ = require('jquery');

class ProgressBar {

    constructor() {

        let top = 70; //alerts should be displayed 70px from top since menubar has height 70
        this.progressBarContainer = $(`
            <div class='alert alert-warning progress-bar-container' role='alert' style='position: absolute; top: ${top}px; left: 10px; width: 900px; z-index: 100000'>
                <div class='progress'>
                    <div class='progress-bar bg-success' role='progressbar' style='width: 0%'>
                    </div>
                </div> 
            </div>
        `);
    }

    /**
     * Sets progress value to a new value. Should be called by whichever function checks on the value of the loading resource, i.e. what the progress bar is tracking. 
     * 
     * @param {Number} percent - The percent to set the bar to.
     */
    updateProgressBar(percent) {
        let newProgress = percent.toString() + '%';
        this.progressBarContainer.find('.progress-bar').css('width', newProgress);
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
            let newPercent = getterFn();
            this.updateProgressBar(newPercent);

            if (newPercent === 100) {
                clearInterval(getterInterval);
                this.progressBarContainer.alert('close');
            }

        }, interval);

    }

    show() {
        $('body').append(this.progressBarContainer);
        this.progressBarContainer.alert();
    }

}

module.exports = ProgressBar;