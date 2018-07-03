var vtkFullScreenRenderWindow = vtk.Rendering.Misc.vtkFullScreenRenderWindow
var vtkActor = vtk.Rendering.Core.vtkActor
var vtkPlaneSource = vtk.Filters.Sources.vtkPlaneSource
var vtkMapper = vtk.Rendering.Core.vtkMapper
var Representation = vtk.Rendering.Core.vtkProperty.Representation
var vtkDataArray = vtk.Common.Core.vtkDataArray
var noise = new SimplexNoise()
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

const planeSource = vtkPlaneSource.newInstance({
    xResolution:100,
    yResolution:100
});
var points = planeSource.getOutputData().getPoints()
//setInterval(()=>{
    let xMax = Math.sqrt(points.getNumberOfPoints()-1)
    for(var i = 0; i < points.getNumberOfPoints();i++){
        nx = Math.floor(i/xMax)
        ny = (i%xMax)
        //if(i > 1000)debugger;
        e =    1 * noise.noise2D(1 * nx, 1 * ny);
  +  0.5 * noise.noise2D(2 * nx, 2 * ny);
  + 0.25 * noise.noise2D(4 * nx, 4 * ny);
        points.setPoint(i,points.getPoint(i)[0],points.getPoint(i)[1],Math.pow(e, 2)/100);
    }
    planeSource.update()
//},1)
const mapper = vtkMapper.newInstance();
const actor = vtkActor.newInstance();

actor.getProperty().setRepresentation(Representation.SURFACE);

mapper.setInputConnection(planeSource.getOutputPort());
actor.setMapper(mapper);

renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();

var shift = 0;
var shiftSpeed = 1;
var UpdateSpeed = 30;
var Colors


setInterval(()=>{
    let xMax = Math.sqrt(points.getNumberOfPoints()-1)
    for(var i = 0; i < points.getNumberOfPoints();i++){
        let nx = (Math.floor(i/xMax) + shift);
        let ny = (i%xMax);
        //if(i > 1000)debugger;
        let e =    1 * noise.noise2D(1 * nx, 1 * ny);
  +  0.5 * noise.noise2D(2 * nx, 2 * ny);
  + 0.25 * noise.noise2D(4 * nx, 4 * ny);
        points.setPoint(i,points.getPoint(i)[0],points.getPoint(i)[1],Math.pow(e, 2)/30);


    }
    shift += shiftSpeed;
     planeSource.update();
     mapper.getInputData().modified();
     
     const newArray = new Float32Array(3 * points.getNumberOfPoints());
     newArray.fill(10);
     const colors = vtkDataArray.newInstance({
        numberOfComponents: 3,
        values: newArray,
        name: 'colors'
      });
        mapper.getInputConnection()().getPointData().setScalars(Colors);
        mapper.getInputData().modified();

     renderWindow.render();
},UpdateSpeed)


