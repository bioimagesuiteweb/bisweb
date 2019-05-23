require('../../config/bisweb_pathconfig.js');
const biswrap = require('libbiswasm_wrapper');
//const bis_genericio=require('bis_genericio');
const wrapperutil=require('bis_wrapperutils');
const BisWebImage=require('bisweb_image');

let images = [ new BisWebImage(),new BisWebImage() ];
let imgnames = [ 'thr.nii.gz',
                 'thr_sm.nii.gz',
               ];


let testDataRootDirectory='https://bioimagesuiteweb.github.io/test/';
console.log('++++ Test Data Directory=',testDataRootDirectory);
    
let fullnames = [ '','','','' ];
for (let i=0;i<=1;i++)
    fullnames[i]=testDataRootDirectory+'testdata/'+imgnames[i];

let p=[ biswrap.reinitialize() ];
for (let i=0;i<images.length;i++) {
    p.push(images[i].load(fullnames[i]));
}

console.log(p);

console.log('Running WASM Memory Torture Test\n');
console.log('\t This will run the web assembly memory test to try to get to just shy of 2GB. It purposely allocates lots of memory without releasing any.');
    
Promise.all(p).then( async function() { 

    console.log('<p>Images Loaded</p>');
        
    const c=5.0*0.4247;
    const paramobj={
        "sigmas" : [c,c,c],
        "inmm" : false,
        "radiusfactor" : 1.5
    };
    const debug=0;
    const jsonstring=JSON.stringify(paramobj);
    let Module=biswrap.get_module();
    let image1_ptr=0;
    
    let alloc=async function(delay=500) {
        
        return new Promise( (resolve) => {
            setTimeout( () => {
                for (let j=0;j<=99;j++) {
                    if (j===0)
                        image1_ptr=wrapperutil.serializeObject(Module,images[0],'bisImage');
                    else
                        wrapperutil.serializeObject(Module,images[0],'bisImage');
                }
                let m=Module['wasmMemory'].buffer.byteLength/(1024*1024);
                resolve(m);
            },delay);
        });
    };
    
    let max=44;
    console.log(`Running Test`);
    for (let k=1;k<=max;k++) {
        let delay=10;
        let m=await alloc(delay);
        console.log(`\t * ${k}. Memory size =  ${m} MB. Last pointer=${image1_ptr}.`);
    }
    
    
    let m=Module['wasmMemory'].buffer.byteLength/(1024*1024);
    console.log(`\nMemory size (end) =${m} MB`);   
    const wasm_output=Module.ccall('gaussianSmoothImageWASM','number',
                                   ['number', 'string', 'number'],
                                   [ image1_ptr, jsonstring, debug]);
    
    m=Module['wasmMemory'].buffer.byteLength/(1024*1024);
    console.log(`Memory size=${m} MB, wasm_output=${wasm_output}`);   
    const out=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'bisImage',images[0]);
    let error=out.maxabsdiff(images[1]);
    console.log(`Final error < 2.0 = ${error}`);
    
});


