![Logo](https://bioimagesuiteweb.github.io/bisweb-manual/bisweb_newlogo_small.png)

---
## BioImage Suite Web -- Python Package

This is package exports much of functionality in BioImage Suite Web as a
python package. This requires Python v3.5 or later.

You can invoke all modules from the commandline using the globally installed
executable `biswebpy`. For example to run the image smoothing algorithm type

    biswebpy smoothImage -h
    

The modules are also available for inclusion in your own code under the
namespace `biswebpython`. The same smoothing filter, for example, can be
imported as:

    from biswebpython.core.bis_objects import *
    from biswebpython.modules.smoothImage import *

    # Create and load an image
    input=bisImage();
    input.load(_SOME_INPUT_FILENAME_);
    print('Input=',input.getDescription());

    # Create and execute the smoothing module
    smooth=smoothImage();
    smooth.execute( { 'input' : input }, { 'sigma' : 4.0, 'debug' : True });

    # Get and save the output
    output=smooth.getOutputObject('output');
    print('Output=',output.getDescription());
    out.save(_SOME_OUTPUT_FILENAME_);
    
---

For more information on bisweb see:

* The source repository --
  [https://github.com/bioimagesuiteweb/bisweb](https://github.com/bioimagesuiteweb/bisweb)
* The actual web application --
  [https://bioimagesuiteweb.github.io/webapp/](https://bioimagesuiteweb.github.io/webapp/)
  
You may also take a look at the examples repository
[https://github.com/bioimagesuiteweb/examples](https://github.com/bioimagesuiteweb/examples).

BioImage Suite Web (bisweb) is a web-based medical image analysis suite
primarily geared towards Neuroimaging Analysis. We gratefully acknowledge
support from the NIH Brain Initiative under grant R24 MH114805 (Papademetris
X. and Scheinost D. PIs).
