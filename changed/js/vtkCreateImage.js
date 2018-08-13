let vtk = require('vtk.js');

const macro = vtk.macro;
const vtkImageData = vtk.Common.DataModel.vtkImageData;
const vtkDataArray = vtk.Common.Core.vtkDataArray;

// ----------------------------------------------------------------------------
// vtkImageGridSource methods
// ----------------------------------------------------------------------------

function vtkImageGridSource(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkImageGridSource');

  publicAPI.requestData = (inData, outData) => {
    if (model.deleted) {
      return;
    }

    const state = {};
    const dataset = {
      type: 'vtkImageData',
      mtime: model.mtime,
      metadata: {
        source: 'vtkImageGridSource',
        state,
      },
    };
    
    // Add parameter used to create dataset as metadata.state[*]
    ['gridSpacing', 'gridOrigin', 'dataSpacing', 'dataOrigin'].forEach(
      (field) => {
        state[field] = [].concat(model[field]);
      }
    );

    const id = vtkImageData.newInstance(dataset);
    id.setOrigin(model.dataOrigin[0], model.dataOrigin[1], model.dataOrigin[2]);
    id.setSpacing(
      model.dataSpacing[0],
      model.dataSpacing[1],
      model.dataSpacing[2]
    );
    id.setExtent.apply(this, model.dataExtent);
    id.setDirection(model.dataDirection);

    let dims = [0, 0, 0];
    dims = dims.map(
      (_, i) => model.dataExtent[i * 2 + 1] - model.dataExtent[i * 2] + 1
    );

    const newArray = new Uint8Array(dims[0] * dims[1] * dims[2]);


    let i = 0;
    
    let middle= [  0.5*(model.dataExtent[1]-model.dataExtent[0]),
        0.5*(model.dataExtent[3]-model.dataExtent[2]),
        0.5*(model.dataExtent[5]-model.dataExtent[4]) ];
    console.log('middle =',middle);

    for (let z = model.dataExtent[4]; z <= model.dataExtent[5]; z++) {
      for (let y = model.dataExtent[2]; y <= model.dataExtent[3]; y++) {
        for (let x = model.dataExtent[0]; x <= model.dataExtent[1]; x++) {
          let r2 = Math.pow(x-middle[0],2.0) + Math.pow(y-middle[1],2.0) + Math.pow(z-middle[0],2.0);
          if (z % 77 === 0 && y % 77===0 && x % 63===0)
            console.log(x,y,z,r2);
            
          if (Math.abs(r2) > 10000)
            newArray[i] = null;
          else
            newArray[i] = 255;
          i++;
        }
      }
    }

    const da = vtkDataArray.newInstance({
      numberOfComponents: 1,
      values: newArray,
    });
    da.setName('scalars');

    const cpd = id.getPointData();
    cpd.setScalars(da);

    // Update output
    outData[0] = id;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  lineValue: 0,
  fillValue: 255,
  gridSpacing: [10, 10, 0],
  gridOrigin: [0, 0, 0],
  dataSpacing: [1.0, 1.0, 1.0],
  dataOrigin: [0.0, 0.0, 0.0],
  dataExtent: [0, 255, 0, 255, 0, 0],
  dataDirection: [1, 0, 0, 0, 1, 0, 0, 0, 1],
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Build VTK API
  macro.obj(publicAPI, model);

  macro.setGet(publicAPI, model, ['lineValue', 'fillValue']);

  macro.setGetArray(
    publicAPI,
    model,
    ['gridOrigin', 'gridSpacing', 'dataOrigin', 'dataSpacing'],
    3
  );

  macro.setGetArray(publicAPI, model, ['dataExtent'], 6);

  macro.setGetArray(publicAPI, model, ['dataDirection'], 9);

  macro.algo(publicAPI, model, 0, 1);
  vtkImageGridSource(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkImageGridSource');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
