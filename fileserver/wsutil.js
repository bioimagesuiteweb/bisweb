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
    let payload = frame[1] % 128
    let maskkey = frame.slice(2,6)
    let datastart = 6;

    if (payload === 126) {
        payload = frame[2] * 256 + frame[3]; 
        maskkey = frame.slice(4,8);
        datastart = 8;
    }

    if (payload === 127) {
        payload = frame[2] * pow(256, 7) + frame[3] * pow(256, 6) + frame[4] * pow(256, 5) + frame[5] * pow(256, 4) 
                + frame[6] * pow(256, 3) + frame[7] * pow(256, 2) + frame[8] * pow(256, 1) + frame[9] * pow(256, 0);
        maskkey = frame.slice(10,14);
        datastart = 14;
    }

    return { 
        'fin' : fin,
        'opcode' : opcode,
        'maskbit' : maskbit,
        'payloadLength' : payload,
        'mask' : maskkey,
        'datastart' : datastart
    };
}

/**
 * Takes an opcode and a payload length and makes a WebSocket control frame. 
 * @param {Number} opcode - Opcode for the data transmission (see documentation for more details)
 * @param {Number} payloadLength - Size of the payload, excluding the size of the control frame
 */
let formatControlFrame = (opcode, payload) => {
    
}
/**
 * Decodes series of raw UTF-8 characters, i.e. numbers, into something human readable.
 * @param {Uint8Array} rawText - Series of raw UTF-8 characters
 * @param {Object} control - Parsed control frame (see parseControlFrame)
 * @return Decoded string
 */
let decodeUTF8 = (rawText, control) => {
    let text = "";
    //decode from raw UTF-8 values to characters
    for (let i = 0; i < control.payloadLength; i++) {
        text = text + String.fromCharCode(rawText[i]);
    }

    return text;
};

module.exports = {
    parseControlFrame : parseControlFrame,
    formatControlFrame : formatControlFrame,
    decodeUTF8 : decodeUTF8
}