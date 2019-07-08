
This directory contains modules that can run in both node.js and the browser.

---

##Custom Modules
* This folder is dedicated to the the specifications of modules designed to be run either through the BioImageSuite website or through the command line (see 'scripts' folder).

* The intent of structuring the BioImageSuite functionality like this is to separate each feature logically, i.e. to isolate the web rendering from the command line parsing from the actual specification of the modules. Given the wide variety of tools that power BIS, including Emscripten, HTML, ES6, Webpack, and a large number of Node modules, this separation helps to keep dependency on each tool only to the section to which it applies. 

    * For example, refactoring the command line tools to use a different parser would not affect the code that handles web rendering of the elements or the underlying functionality for BIS. 

###Modules 
* Modules are implemented using a hierarchical class structure.
    * BaseModule is the core class for BIS modules, similar to the Java's 'Object'. It has three direct inheritors.
		* ImageToImageModule: All modules that input one image and output one image. 

		* MatrixToMatrixModule: All modules that input one matrix and output one matrix. 

		* MatrixImageModule: All modules that take a combination of matrices and images and output either a matrix or an image.

	* All modules inherit from one of the three modules listed above. 

* Each bottom-level module includes a JSON description that determines how it will be rendered and what arguments it will take. Parameters include the following: 
	* name: Name of the module

	* description: Short description of what the module does
	* author: Who wrote the module

	* version: The current iteration of the module 

	* input: Specification for an element that will receive either a matrix or an image as input. Includes the following: 
		* type: Either 'image' or 'matrix'. Specified so the module knows which to try to load. 

		* name: The name of the input element

		* description: Short description of the input element expects

		* key: Dictionary key of the input that the element receives (referenced by other functionality in the module)

	* params: Specification for an element that will receive a single variable in the module. Includes the following:
		* name: Name of the element.

		* description: Short description of the parameter the element describes.

		* priority: How important the element is in the hierarchy of parameter elements. May affect in which order this element is presented, the rendering of elements on the web, etc.

		* advanced: Whether the element is advanced or not. Advanced elements are presented separately on the web.

		* gui: How input to the element is received. One of the following: 
			* 'check' or 'checkbox' 
			* 'slider' 
			* 'dropdown' 
			* 'text' or 'entrywidget' 

		* varname: Dictionary key that the module's execute function will use to reference the variable.

		* default: Default value of the parameter

		* type: Data type of the parameter. One of the following: 
			* 'float'
			* 'int' or 'integer' 
			* 'bool' or 'boolean' 
			* 'string' 

		* restrict or restrictAnswer: Optional. If specified user input must conform to one of the values in 'restrict'. 

		* low or lowbound: Only for 'slider' elements. The low bound for the slider. 

		* high or highbound: Only for 'slider' elements. The high bound for the slider. 
	 
* Detailed descriptions of modules are included in the 'scripts' directory. 

###Web Parser
* All elements displayed on BioImageSuite Web Application (BISWeb) are generated from a JSON description as described above. 

* Modules try to parse image input intelligently.
	* Images may be loaded to the GUI associated with a given module or not — there are load buttons associated with a given module and one associated with the viewer. 

	* A module will prioritize images loaded using its specific buttons over images loaded with other modules' buttons or with the viewer's buttons. In the case that none have been loaded, though, it will try to run using the image in the viewer as its input. 

	* After a module is run once, it forgets that input was associated with it. This is done so that operations can be performed serially without having to save and load an image several times. 
	* Some modules load multiple images/matrices — modules will tend to use the target image (the one being modified) as their default. Others will have to be specified explicitly and will not overwrite the image in the viewer. 

* Modules may have their input handled from a delegating system in the future. Stay tuned!

###Command Line Parser
* Detailed documentation for the command line parser is available in the 'scripts' directory. A small amount is reproduced here. 

* The following commands are currently supported:
	-load: Loads a specified module and execute it with the specified parameters.
	
	-test: Validates the proper function of a module by executing it on a test image and comparing it against the expected output. Same parameters as load. 


## Adding a New Module

1. Create your module probably copying an existing one and renaming it
2. Register the module in moduleindex.js  (see what happens to smoothimage and
   copy, two lines need to be added)
3. Add it to cpp/ModuleList.txt -- this is needed to create the script to run
   the module on make install
4. Add a test in modules_test.json  and any goldstandard data in
   test/testdata/ ....
5. Initialize the module in `webcomponents/modulemanagerelement.js` if     you want the module to have a menu item in BioImageSuite.
   
