const $ = require('jquery');

let shiftPressed = false;
let ctrlPressed = false;
let keyListenersOn = false;

//add listener for whether the control key or shift key are held 
//https://api.jquery.com/event.which/
let keydownEvent = (e) => {
    if (e.which === 16) { shiftPressed = true; }
    if (e.which === 17) { ctrlPressed = true; }
};

let keyupEvent = (e) => {
    if (e.which === 16) { shiftPressed = false; }
    if (e.which === 17) { ctrlPressed = false; }
};

let addKeyListeners = () => {
    if (!keyListenersOn) {
        $(document).on('keydown', keydownEvent);
        $(document).on('keyup', keyupEvent);
    }
    keyListenersOn = true;
};

let getShiftPressed = () => {
    return shiftPressed;
};

let getCtrlPressed = () => {
    return ctrlPressed;
};

module.exports = {
    addKeyListeners : addKeyListeners,
    shiftPressed : getShiftPressed,
    ctrlPressed : getCtrlPressed
};