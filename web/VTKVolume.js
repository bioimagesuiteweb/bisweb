
var vtkColorTransferFunction = vtk.Rendering.Core.vtkColorTransferFunction;
var vtkHttpDataSetReader = vtk.IO.Core.vtkHttpDataSetReader;
var vtkFullScreenRenderWindow  = vtk.Rendering.Misc.vtkFullScreenRenderWindow;
var vtkPiecewiseFunction = vtk.Common.DataModel.vtkPiecewiseFunction;
var vtkVolume = vtk.Rendering.Core.vtkVolume;
var vtkVolumeMapper = vtk.Rendering.Core.vtkVolumeMapper;
var vtkXMLImageDataReader = vtk.IO.XML.vtkXMLImageDataReader;

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0],
  });
  const renderer = fullScreenRenderer.getRenderer();
  const renderWindow = fullScreenRenderer.getRenderWindow();
  
  // ----------------------------------------------------------------------------
  // Example code
  // ----------------------------------------------------------------------------
  // Server is not sending the .gz and whith the compress header
  // Need to fetch the true file name and uncompress it locally
  // ----------------------------------------------------------------------------
    
  const actor = vtkVolume.newInstance();
  const mapper = vtkVolumeMapper.newInstance();
  mapper.setSampleDistance(0.7);
  actor.setMapper(mapper);
  
  // create color and opacity transfer functions
  const ctfun = vtkColorTransferFunction.newInstance();
  ctfun.addRGBPoint(200.0, 0.4, 0.2, 0.0);
  ctfun.addRGBPoint(2000.0, 1.0, 1.0, 1.0);
  const ofun = vtkPiecewiseFunction.newInstance();
  ofun.addPoint(200.0, 0.0);
  ofun.addPoint(1200.0, 0.5);
  ofun.addPoint(3000.0, 0.8);
  actor.getProperty().setRGBTransferFunction(0, ctfun);
  actor.getProperty().setScalarOpacity(0, ofun);
  actor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
  actor.getProperty().setInterpolationTypeToLinear();
  actor.getProperty().setUseGradientOpacity(0, true);
  actor.getProperty().setGradientOpacityMinimumValue(0, 15);
  actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
  actor.getProperty().setGradientOpacityMaximumValue(0, 100);
  actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
  actor.getProperty().setShade(true);
  actor.getProperty().setAmbient(0.2);
  actor.getProperty().setDiffuse(0.7);
  actor.getProperty().setSpecular(0.3);
  actor.getProperty().setSpecularPower(8.0);
  fullScreenRenderer.addController(`
  <table>
  <tr>
    <td style="color: black;">Diffuse</td>
    <td colspan="3">
      <input style="width: 100%" class='color' type="range" min="0" max="1" step="0.05" value="0.7" />
    </td>
  </tr>
</table>
`);
$(fullScreenRenderer.getControlContainer()).css('top','100px');

  //readTextFile(`./images/test.vti`);
  const vtiReader = vtkXMLImageDataReader.newInstance();


  ['color'].forEach((propertyName) => {
    document.querySelector(`.${propertyName}`).addEventListener('input', (e) => {
      const value = Number(e.target.value);
      actor.getProperty().setDiffuse(value)
      renderWindow.render();
    });
  });

  async function load(rawText){

  vtiReader.parseAsArrayBuffer(rawText);


  // Pipeline handling
  actor.setMapper(mapper);
  mapper.setInputConnection(vtiReader.getOutputPort());
  renderer.addActor(actor);

  renderer.resetCamera();
  renderWindow.render();
  }

  function readTextFile(file)
    {
      fetchBinary(file).then((binary) => {
        load(binary);
      }).catch((e) => {
        console.log(e)
      });
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
    
var dropZone = document.getElementsByTagName('body')[0];

dropZone.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});



dropZone.addEventListener('drop', function(e) {

    e.stopPropagation();
    e.preventDefault();
    var file = e.dataTransfer.files[0]; // Array of all files
    const reader = new FileReader();
    reader.onload = function onLoad(e) {
      $('.overlay').hide()
      load(reader.result);
    };
    reader.readAsArrayBuffer(file);
});