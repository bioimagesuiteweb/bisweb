
// Node.js require
// import
// require --> 


require('../../config/bisweb_pathconfig.js');
const baseutils=require("baseutils");
const BisWebTransformCollection = require('bisweb_transformationcollection');
const BisWebElectrodeMultiGrid = require('bisweb_electrodemultigrid');
const BisWebImage = require('bisweb_image.js');
const TransformUtil=require('bis_transformationutil.js');

const imagename='MUE_Final.nii.gz';
const atlasname='MNI_Reference__shsc.nii.gz';
const transformname1='INV_L_MUE_Final.matr';
const transformname2='INV_NL_MUE_Final_map_nonlinear.bisxform';
const gridname='MUE_trans_ELECTRODE_PREOP_MRI.mgrid';


// Function is as having asynchronous
var mapElectrodes=async function() {

    const electrodegrid=new BisWebElectrodeMultiGrid();
    try {
        await electrodegrid.load(gridname);
    } catch(e) {
        console.log('Failed to load electrode from ',gridname);
        return Promise.reject(e);
    }

    let transform1=0,transform2=0;

    try {
        transform1= await TransformUtil.loadTransformation(transformname1);
        transform2= await TransformUtil.loadTransformation(transformname2);
        transform1=transform1.data;
        transform2=transform2.data;
    } catch(e) {
        return Promise.reject(e);
    }

    const image1=new BisWebImage();
    const image2=new BisWebImage();
    try {

        await image1.load(atlasname);
        await image2.load(imagename);
    } catch(e) {
        return Promise.reject(e);
    }

    console.log(' Image1=',image1.getDescription());
    

    // 1 Combine transformations into a single one
    // 2 Apply it to the grid
    // 3 Save the grid
    console.log(' transform1=',transform1.getDescription());
    console.log(' transform2=',transform2.getDescription());

    let coll=new BisWebTransformCollection();
    coll.addTransformation(transform1);
    coll.addTransformation(transform2);

    // 2. Apply to grid
    electrodegrid.transformElectrodes(coll);

    // 3. Save it out
    await electrodegrid.save('mapped.mgrid');
    
}

mapElectrodes().then( () => {
    console.log('Done');
}).catch( (e) => {
    console.log('Some Error',e);
});


