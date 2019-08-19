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

    
    return {
        tf : tf,
        tfn : tfn,
        mode : 'node-'+mode
    };

};


/*

  Breaking changes from tfjs-0.xx to tfjs-1.x

Graphs converted from TensorFlow now generate JSON graphs (model.json). Any protocol buffer graphs with the extension .pb are now deprecated. You can convert .pb graphs to .json graphs with the pb2json NPM script in the tensorflow/tfjs-converter repository.
tf.loadModel is deleted. Please use tf.loadLayersModel instead.
tf.loadFrozenModel is deleted. Please use tf.loadGraphModel instead.
tf.Model has been renamed tf.LayersModel.
tf.FrozenModel has been renamed tf.GraphModel.
When converting models with the tensorflowjs pip package, use --output_format strings tfjs_layers_model and tfjs_graph_model instead and tensorflowjs.
Tensor.get is deleted. Please use Tensor.array and native array indexing instead.
Tensor.buffer is now async (returns a Promise). If you need the sync version, please use Tensor.bufferSync.
tf.fromPixels is deleted. Please use tf.browser.fromPixels instead.
tf.toPixels is deleted. Please use tf.browser.toPixels instead.
tf.batchNormalization is deprecated. Please use tf.batchNorm. Note the positional change of the arguments.
Dataset.forEach is deleted. Please use DataSet.forEachAsync instead.
LayersModel.fitDataset now only accepts {xs, ys} as a dictionary mapping 'xs' and 'ys' to their respective Tensor values. The [xs, ys] tuple format is now removed.
tf.io.browserHTTPRequest now takes two arguments, a url and an options object. See the new API here.
tf.data.generator() now takes a generator function*, instead of an iterator. See API doc.
*/

