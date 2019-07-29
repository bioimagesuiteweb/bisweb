let $ = require('jquery');

let popoverHandlerAdded = false;

let addPopoverDismissHandler = () => {
    if (!popoverHandlerAdded) {
        //https://stackoverflow.com/questions/11703093/how-to-dismiss-a-twitter-bootstrap-popover-by-clicking-outside
        let popoverDismissFn = (e) => {
            if (typeof $(e.target).data('original-title') == 'undefined' && !$(e.target).parents().is('.popover.in')) {
                $('[data-original-title]').popover('hide');
            }
        };

        $('html').on('click', popoverDismissFn);
        $('html').on('contextmenu', popoverDismissFn);

        popoverHandlerAdded = true;
    }

};

module.exports = {
    addPopoverDismissHandler : addPopoverDismissHandler
};