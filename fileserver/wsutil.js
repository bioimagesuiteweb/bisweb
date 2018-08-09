const pako = require('pako');

/**
 * Parses the first 112 bits of a WebSocket dataframe, i.e. the control portion of the frame.
 * https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Exchanging_Data_frames
 * @param {Uint8Array} frame 
 * @return An dictionary of separated control frame values
 */
let parseControlFrame = (frame) => {
    let fin = frame[0] >> 7;
    let opcode = frame[0] % 16;
    let maskbit = frame[1] >> 7;
    let payload = frame[1] % 128;
    let maskkey = maskbit ? frame.slice(2, 6) : null;
    let datastart = maskbit ? 6 : 2;

    if (payload === 126) {
        payload = frame[2] * 256 + frame[3];
        maskkey = maskbit ? frame.slice(4, 8) : null;
        datastart = maskbit ? 8 : 4;
    }

    if (payload === 127) {
        payload = frame[2] * Math.pow(256, 7) + frame[3] * Math.pow(256, 6) + frame[4] * Math.pow(256, 5) + frame[5] * Math.pow(256, 4)
            + frame[6] * Math.pow(256, 3) + frame[7] * Math.pow(256, 2) + frame[8] * Math.pow(256, 1) + frame[9] * Math.pow(256, 0);
        maskkey = maskbit ? frame.slice(10, 14) : null;
        datastart = maskbit ? 14 : 10;
    }

    return {
        'fin': fin,
        'opcode': opcode,
        'maskbit': maskbit,
        'payloadLength': payload,
        'mask': maskkey,
        'datastart': datastart
    };
};

/**
 * Takes an opcode and a payload length and makes a WebSocket control frame. 
 * @param {Number} opcode - Opcode for the data transmission (see documentation for more details)
 * @param {Number} payloadLength - Size of the payload, excluding the size of the control frame
 */
let formatControlFrame = (opcode, payloadLength) => {
    let controlFrame;
    if (payloadLength < 126) {
        controlFrame = new Uint8Array(2);
        controlFrame[1] = payloadLength;
    } else if (payloadLength < 65536) {
        controlFrame = new Uint8Array(4);
        controlFrame[1] = 126;
        controlFrame[2] = payloadLength / 256;
        controlFrame[3] = payloadLength % 256;
    } else {
        controlFrame = new Uint8Array(10);
        let remainingPayload = payloadLength;
        controlFrame[1] = 127;
        controlFrame[2] = Math.floor(remainingPayload / Math.pow(256, 7)); remainingPayload = remainingPayload - controlFrame[2] * Math.pow(256, 7);
        controlFrame[3] = Math.floor(remainingPayload / Math.pow(256, 6)); remainingPayload = remainingPayload - controlFrame[3] * Math.pow(256, 6);
        controlFrame[4] = Math.floor(remainingPayload / Math.pow(256, 5)); remainingPayload = remainingPayload - controlFrame[4] * Math.pow(256, 5);
        controlFrame[5] = Math.floor(remainingPayload / Math.pow(256, 4)); remainingPayload = remainingPayload - controlFrame[5] * Math.pow(256, 4);
        controlFrame[6] = Math.floor(remainingPayload / Math.pow(256, 3)); remainingPayload = remainingPayload - controlFrame[6] * Math.pow(256, 3);
        controlFrame[7] = Math.floor(remainingPayload / Math.pow(256, 2)); remainingPayload = remainingPayload - controlFrame[7] * Math.pow(256, 2);
        controlFrame[8] = Math.floor(remainingPayload / Math.pow(256, 1)); remainingPayload = remainingPayload - controlFrame[8] * Math.pow(256, 1);
        controlFrame[9] = remainingPayload;
    }

    //TODO: implement logic for setting fin bit
    controlFrame[0] = opcode;
    controlFrame[0] = controlFrame[0] | 0b10000000;

    return controlFrame;
};

/**
 * Decodes series of raw UTF-8 characters, i.e. numbers, into something human readable.
 * 
 * @param {Uint8Array} rawText - Series of raw UTF-8 characters
 * @param {Object|Number} control - Parsed control frame (see parseControlFrame), or length of payload.
 * @return Decoded string
 */
let decodeUTF8 = (rawText, control) => {
    let payloadLength = typeof (control) === 'object' ? control.payloadLength : control;
    let text = "";
    //decode from raw UTF-8 values to characters
    for (let i = 0; i < payloadLength; i++) {
        text = text + String.fromCharCode(rawText[i]);
    }

    return text;
};

/**
 * Unzips gzipped data using pako. Attempts to convert the data to a TypedArray before unzipping.
 * 
 * @param {TypedArray|ArrayBuffer} arr - Raw gzipped image data.
 * @returns Unzipped data or an error message. 
 */
let unzipFile = (arr) => {
    let parsedArr = new Uint8Array(arr);
    let unzippedArr;
    try {
        unzippedArr = pako.ungzip(parsedArr);
        return unzippedArr;
    } catch (e) {
        console.log('an error occured while unzipping the file', e);
        return;
    }
};

/**
 * Gzips raw image data using pako. Attempts to convert data to a TypedArray before zipping.
 * 
 * @param {TypedArray|ArrayBuffer} arr - Raw unzipped image data. 
 * @returns Zipped data or an error message.
 */
let zipFile = (arr) => {
    let parsedArr = new Uint8Array(arr);
    let zippedArr;
    try {
        zippedArr = pako.gzip(parsedArr);
        console.log('compressed array' , zippedArr);
        return zippedArr;
    } catch (e) {
        console.log('an error occured while zipping the file', e);
        return;
    }
};

/**
 * Attempts to read raw, stringified JSON and return a parsed JSON object.
 * 
 * @param {String} rawJSON - Stringified JSON object as might be provided by the fileserver, AWS, etc.
 * @returns Parsed JSON object, or null if JSON.parse fails.
 */
let parseJSON = (rawJSON) => {
    try {
        data = JSON.parse(rawJSON);
        return data;
    } catch (e) {
        console.log('an error occured while parsing event.data', e);
        return null;
    }
}

//TODO: incorporate this into bisweb_filedialog
/**
 * Traverses a nested file structure for the file specified in 'path'. 
 * For example, if the path is 'a/b/c', this will attempt to find an entry named 'a', look within its children for 'b', then look within its children for 'c'.
 * 
 * @param {String} path - A filepath separated by slashes. 
 * @param {Array} list - Nested file structure. Typically contains a set of entries with 'children' that contain more entries, which in turn may contain more entries, etc.
 * @returns The corresponding entry in the file structure, or null.
 */
let searchTree = (path, list) => {
    let foundDirectory = false, splitPaths = path.split('/'), currentDirectory = list;
    while (splitPaths.length > 0) {
        console.log('looking for a match with', splitPaths[0]);
        for (let entry of currentDirectory) {
            if (entry.text === splitPaths[0]) {

                //if there's only one entry in splitPaths then this is the index at which we want to add the supplemental files
                if (splitPaths.length === 1) {
                    return entry;
                } else {
                    console.log('entering directory', entry.children);
                    foundDirectory = true;
                    currentDirectory = entry.children;
                }

                splitPaths.splice(0, 1);
            }
        }

        if (!foundDirectory) {
            console.log('could not find directory.');
            return null;
        } else {
            foundDirectory = false;
        }
    }
}

module.exports = {
    parseControlFrame: parseControlFrame,
    formatControlFrame: formatControlFrame,
    decodeUTF8: decodeUTF8,
    unzipFile: unzipFile,
    zipFile : zipFile,
    parseJSON: parseJSON,
    searchTree: searchTree
};