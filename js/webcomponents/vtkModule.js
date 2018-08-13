let vtk = require('vtk.js');
let webutil = require('bis_webutil');
let createImage = require('vtkCreateImage.js');

let actor;
let mapper;

var vtkObjects = {
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
	vtkFPSMonitor: null,
};






let load = function(){
  // Pipeline handling
  actor.setMapper(mapper);
  mapper.setInputConnection(vtkObjects.grid.getOutputPort());
      
  //vtiReader.getOutputPort());
  vtkObjects.renderer.addActor(actor);
	vtkObjects.renderer.resetCamera();
  vtkObjects.renderWindow.render();
};


function createObjects(){

  vtkObjects.vtkColorTransferFunction = vtk.Rendering.Core.vtkColorTransferFunction;
  vtkObjects.vtkHttpDataSetReader = vtk.IO.Core.vtkHttpDataSetReader;
  vtkObjects.vtkFullScreenRenderWindow  = vtk.Rendering.Misc.vtkFullScreenRenderWindow;
  vtkObjects.vtkPiecewiseFunction = vtk.Common.DataModel.vtkPiecewiseFunction;
  vtkObjects.vtkVolume = vtk.Rendering.Core.vtkVolume;
  vtkObjects.vtkVolumeMapper = vtk.Rendering.Core.vtkVolumeMapper;
  vtkObjects.vtkXMLImageDataReader = vtk.IO.XML.vtkXMLImageDataReader;
  vtkObjects.vtkTexture = vtk.Rendering.Core.vtkTexture;
	vtkObjects.vtkImageGridSource = vtk.Filters.Sources.vtkImageGridSource;
	vtkObjects.vtkFPSMonitor = vtk.Interaction.UI.vtkFPSMonitor.newInstance();
  vtkObjects.grid = createImage.newInstance({
    gridSpacing : [ 10, 10, 10],
    dataExtent : [ 0,255,0,255,0,255]
	});
     
  //readTextFile(`./images/test.vti`);
  vtkObjects.vtiReader = vtkObjects.vtkXMLImageDataReader.newInstance();
  
      
      
  vtkObjects.fullScreenRenderer = vtkObjects.vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0],
	});
  vtkObjects.renderer = vtkObjects.fullScreenRenderer.getRenderer();
  vtkObjects.renderWindow = vtkObjects.fullScreenRenderer.getRenderWindow();
	vtkObjects.vtkFPSMonitor.setRenderWindow(vtkObjects.renderWindow);
	vtkObjects.vtkFPSMonitor.update();
  actor = vtkObjects.vtkVolume.newInstance();
  mapper = vtkObjects.vtkVolumeMapper.newInstance();
  mapper.setSampleDistance(0.7);
   
     
  actor.setMapper(mapper);
  // create color and opacity transfer functions
  const ctfun = vtkObjects.vtkColorTransferFunction.newInstance();
  ctfun.addRGBPoint(200.0, 0.9, 0.9, 0.9);
  ctfun.addRGBPoint(2000.0, 0.01, 0.01, 0.01);
  const ofun = vtkObjects.vtkPiecewiseFunction.newInstance();
  ofun.addPoint(0.0, 0.0);
  ofun.addPoint(400.0, 1.0);
  // actor.getProperty().setRGBTransferFunction(0, ctfun);
  actor.getProperty().setScalarOpacity(0, ofun);
  // actor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
  // actor.getProperty().setInterpolationTypeToLinear();
  // actor.getProperty().setUseGradientOpacity(0, true);
  // actor.getProperty().setGradientOpacityMinimumValue(0, 15);
  // actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
  // actor.getProperty().setGradientOpacityMaximumValue(0, 100);
  // actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
  actor.getProperty().setShade(true);
  actor.getProperty().setAmbient(1);
  actor.getProperty().setDiffuse(0.7);
  actor.getProperty().setSpecular(0.3);
  actor.getProperty().setSpecularPower(8.0);
  // Add grid texture
  const gridSource = vtkObjects.vtkImageGridSource.newInstance();
  gridSource.setDataExtent(0, 255, 0, 255, 0, 0);
  gridSource.setGridSpacing(1000, 1000, 0);
  gridSource.setGridOrigin(5, 5, 0);
       
  const texture = vtkObjects.vtkTexture.newInstance();
  texture.setInterpolate(true);
  texture.setInputConnection(gridSource.getOutputPort());
  actor.addTexture(texture);


  load();
}



module.exports = {
  load: load
};

webutil.runAfterAllLoaded( () => { 
  createObjects();
});   