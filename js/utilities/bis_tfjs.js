let tf=null;
let tfn=null;
let mode='cpu';

module.exports = function() {

    if (tf) {
        console.log('++++ TF already loaded');
        return tf;
    }

    console.log('++++ Loading TF');
    try {
        tf=require("@tensorflow/tfjs");
        try {
            console.log('++++ Trying to Load tfjs-node-gpu');
            tfn=require('@tensorflow/tfjs-node-gpu');
            mode='gpu';
        } catch(e) {
            console.log('Failed to load gpu version '+e);
            tfn=require('@tensorflow/tfjs-node');
        }
    } catch(e) {
        console.log('Failed to load tensorflow',e);
    }

    let ret={
        tf : tf,
        tfn : tfn,
        mode : 'node-'+mode
    };
    return ret;
};
