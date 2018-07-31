let vtk = require('vtk.js')
const webutil = require('bis_webutil');
let createImage = require('vtkCreateImage.js')

  let vtkObjects = {
      vtkColorTransferFunction: null,
      vtkHttpDataSetReader: null,
      vtkFullScreenRenderWindow: null,
      vtkPiecewiseFunction: null,
      vtkVolume: null,
      vtkVolumeMapper: null,
      vtkXMLImageDataReader: null,
      vtiReader: null,
      renderWindow: null,
      render: null,
      fullScreenRenderer: null,
      actor: null,
  }






    let load = function(){
    // Pipeline handling
    vtkObjects.actor.setMapper(vtkObjects.mapper);
    vtkObjects.mapper.setInputConnection(vtkObjects.grid.getOutputPort());
        
        //vtiReader.getOutputPort());
    vtkObjects.renderer.addActor(vtkObjects.actor);

    vtkObjects.renderer.resetCamera();
    vtkObjects.renderWindow.render();
  }


    function fetchBinary(url, options = {}) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
    
        xhr.onreadystatechange = (e) => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) {
              resolve(xhr.response);
            } else {
              reject({ xhr, e });
            }
          }
        };
    
        if (options && options.progressCallback) {
          xhr.addEventListener('progress', options.progressCallback);
        }
    
        // Make request
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.send();
      });
    }


    function createObjects(){

        vtkObjects.vtkColorTransferFunction = vtk.Rendering.Core.vtkColorTransferFunction;
        vtkObjects.vtkHttpDataSetReader = vtk.IO.Core.vtkHttpDataSetReader;
        vtkObjects.vtkFullScreenRenderWindow  = vtk.Rendering.Misc.vtkFullScreenRenderWindow;
        vtkObjects.vtkPiecewiseFunction = vtk.Common.DataModel.vtkPiecewiseFunction;
        vtkObjects.vtkVolume = vtk.Rendering.Core.vtkVolume;
        vtkObjects.vtkVolumeMapper = vtk.Rendering.Core.vtkVolumeMapper;
        vtkObjects.vtkXMLImageDataReader = vtk.IO.XML.vtkXMLImageDataReader;

        vtkObjects.grid = createImage.newInstance({
            gridSpacing : [ 10,10,10],
            dataExtent : [ 0,255,0,255,0,255]
        });
       
    //readTextFile(`./images/test.vti`);
    vtkObjects.vtiReader = vtkObjects.vtkXMLImageDataReader.newInstance();
    console.log(vtkObjects.vtiReader);
        
        
        vtkObjects.fullScreenRenderer = vtkObjects.vtkFullScreenRenderWindow.newInstance({
            background: [0, 0, 0],
          });
        vtkObjects.renderer = vtkObjects.fullScreenRenderer.getRenderer();
        vtkObjects.renderWindow = vtkObjects.fullScreenRenderer.getRenderWindow();
          
        vtkObjects.actor = vtkObjects.vtkVolume.newInstance();
        vtkObjects.mapper = vtkObjects.vtkVolumeMapper.newInstance();
        vtkObjects.mapper.setSampleDistance(0.7);
        vtkObjects.actor.setMapper(vtkObjects.mapper);
        
        // create color and opacity transfer functions
        const ctfun = vtkObjects.vtkColorTransferFunction.newInstance();
        ctfun.addRGBPoint(200.0, 0.4, 0.2, 0.0);
        ctfun.addRGBPoint(2000.0, 1.0, 1.0, 1.0);
        const ofun = vtkObjects.vtkPiecewiseFunction.newInstance();
        ofun.addPoint(200.0, 0.0);
        ofun.addPoint(1200.0, 0.5);
        ofun.addPoint(3000.0, 0.8);
        vtkObjects.actor.getProperty().setRGBTransferFunction(0, ctfun);
        // vtkObjects.actor.getProperty().setScalarOpacity(0, ofun);
        // vtkObjects.actor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
        // vtkObjects.actor.getProperty().setInterpolationTypeToLinear();
        // vtkObjects.actor.getProperty().setUseGradientOpacity(0, true);
        // vtkObjects.actor.getProperty().setGradientOpacityMinimumValue(0, 15);
        // vtkObjects.actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
        // vtkObjects.actor.getProperty().setGradientOpacityMaximumValue(0, 100);
        // vtkObjects.actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
        vtkObjects.actor.getProperty().setShade(true);
        vtkObjects.actor.getProperty().setAmbient(1);
        vtkObjects.actor.getProperty().setDiffuse(0.7);
        vtkObjects.actor.getProperty().setSpecular(0.3);
        vtkObjects.actor.getProperty().setSpecularPower(8.0);
    }




    module.exports = {
        load: load
    }

    webutil.runAfterAllLoaded( () => { 
        createObjects();
    });   