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
        controlFrame[2] = floor(payload / pow(256, 7)); remainingPayload = payload - controlFrame[2] * pow(256, 7);
        controlFrame[3] = floor(remainingPayload / pow(256, 6)); remainingPayload = payload - controlFrame[3] * pow(256, 6);
        controlFrame[4] = floor(remainingPayload / pow(256, 5)); remainingPayload = payload - controlFrame[4] * pow(256, 5);
        controlFrame[5] = floor(remainingPayload / pow(256, 4)); remainingPayload = payload - controlFrame[5] * pow(256, 4);
        controlFrame[6] = floor(remainingPayload / pow(256, 3)); remainingPayload = payload - controlFrame[6] * pow(256, 3);
        controlFrame[7] = floor(remainingPayload / pow(256, 2)); remainingPayload = payload - controlFrame[7] * pow(256, 2);
        controlFrame[8] = floor(remainingPayload / pow(256, 1)); remainingPayload = payload - controlFrame[8] * pow(256, 1);
        controlFrame[9] = remainingPayload;
    }

    //TODO: implement logic for setting fin bit
    controlFrame[0] = opcode;
    controlFrame[0] = controlFrame[0] | 0b10000000;

    return controlFrame;
}

/**
 * Decodes series of raw UTF-8 characters, i.e. numbers, into something human readable.
 * @param {Uint8Array} rawText - Series of raw UTF-8 characters
 * @param {Object|Number} control - Parsed control frame (see parseControlFrame), or length of payload.
 * @return Decoded string
 */
let decodeUTF8 = (rawText, control) => {
    let payloadLength = typeof(control) === 'Object' ? control.payloadLength : control;
    let text = "";
    //decode from raw UTF-8 values to characters
    for (let i = 0; i < payloadLength; i++) {
        text = text + String.fromCharCode(rawText[i]);
    }

    return text;
};

module.exports = {
    parseControlFrame : parseControlFrame,
    formatControlFrame : formatControlFrame,
    decodeUTF8 : decodeUTF8
}