// This gets tfjs

try {
    const tf=require("@tensorflow/tfjs");
    require('@tensorflow/tfjs-node');
    module.exports=tf;
    console.log('++++ Loaded TFJS, tfjs-node',tf.loadFrozenModel);
} catch(e) {
    console.log('Failed to load tensorflow',e);
    module.exports={};
}
