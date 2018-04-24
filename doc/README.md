# Introduction

[NODE.JS]: https://nodejs.org/en/
[GIT]: https://git-scm.com/
[ELECTRON]: http://electron.atom.io/
[GULP]:http://gulpjs.com/
[MOCHA]:https://mochajs.org/
[JSDOC]:http://usejsdoc.org/
[JSHINT]:http://jshint.com/
[REPO]: https://git.yale.edu/MSD/JS
[NIFTI]: https://nifti.nimh.nih.gov/nifti-1
[THREEJS]: https://threejs.org/
[WEBGL]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[BOOTSTRAP]: http://getbootstrap.com/
[DIVEINTOHTML5]: http://diveintohtml5.info
[WEBPACK]:https://webpack.github.io/
[CMAKE]:http//www.cmake.org
[EMSCRIPTEN]:http://kripken.github.io/emscripten-site/
[EIGEN]:http://eigen.tuxfamily.org/index.php?title=Main_Page

This is the "initial" file of the BioImage Suite Web _developer_ documentation. It contains instructions for configuring and building the software.


BioImage Suite Web (BisWeb) is a web-based medical image analysis suite primarily
geared towards Neuroimaging Analysis. We gratefully acknowledge support from
the [NIH Brain Initiative](https://www.braininitiative.nih.gov/) under grant R24 MH114805 (Papademetris X. and Scheinost D. PIs).
A good overview of the software can be found
[in slides from a presentation at the 2018 NIH Brain Initiative Meeting](web/images/BioImageSuiteWeb_NIHBrainInitiativeMeeting_April2018.pdf),
which was the first public introduction of the software.

The architecure of BioImage Suite Web is shown below:

![BioImage Suite Web Software Architecture](figures/bisweb.png)
---

As you can see this involves a mixture of JavaScript and C++ code with optional Python and Matlab wrappers.  Additional information about aspects of the software can be found in other files in this directory, such as:

* Some background material on why we selected JavaScript as the primary language for Biomage Suite Web can be found in [WhyJS.md](WhyJS.md).
* We cover some aspects of JavaScript that are particularly relevant to our project in [AspectsofJS.md](AspectsOfJS.md).
* The next document is describing how to program using the base BioImage Suite Web Libraries in JS [BisWebJS.md](BisWebJS.md).
* The interface from JavaScript to WebAssembly is described in [FromJStoWASMAndBack.md](FromJStoWASMAndBack.md).
* We briefly touch on using the base BioImage Suite Web Libraries from Python in [BisWebPython.md](BisWebPython.md).
* The same native libraries that work in Python can be accessed through Matlab. This interface is primitive but if you are curious/adventurous see [BisWebMatlab.md](BisWebMatlab.md). This is _unsupported code._ Use at your own risk!
* We discuss the module architecture in two separate documents 
    - JavaScript: [ModulesInJS.md](ModulesInJS.md)
    - Python: [ModulesInPython.md](ModulesInPython.md).
* Details about how the [Electron][ELECTRON] desktop applications are constructed can be found in the document [DesktopAppsWithElectron.md](DesktopAppsWithElectron.md).

---

## Setting up your Development Environment

Having set the context we are now ready to begin. The goal of this
section is to help the reader set up a proper software development
environment. We use the following tools:

* [_git_][GIT] : A popular version control system.
* [_node.js_][NODE.JS] : The command line JavaScript interpreter. This will also provide you with _npm_ which is the package manager that comes with node.js.
* [_gulp_][GULP]: A tool to automate JavaScript
  development.
* [_webpack_][WEBPACK]: A tool that enables the use of node.js style modules in browser applications.
* [_mocha_][MOCHA]: A tool for regression testing.
* [_jshint_][JSHINT]: "A tool that helps to detect errors and potential problems in your JavaScript code" (per the webpage!).
* [_jsdoc_][JSDOC]: A tool for code documentation.
* [_electron_][ELECTRON]: A tool that allows the use
  of HTML/CSS/JS to create a desktop application.

You will also need a text editor. There are many many good text editors out
there. If you have no prior experience you can try  Microsoft's
[Visual Code](https://code.visualstudio.com/) editor. I personally use Emacs as the shortcut keystrokes are burned into memory from over 20 years of playing with this but Emacs is not the easiest editor to get started with.

All of the tools above have extensive online documentation which we
will not replicate here. We will instead adopt a "recipe"-based
approach moving from example to example (with minimal explanations)
and assume that the interested reader can find additional information online.

### Aside: If you are using Microsoft Windows

The instructions in this documents are primarily for Linux (Ubuntu) and secondarily MacOS. These are Unix-y operating systems with a common set of commandline tools and package managers which make life a little easier.

If you are developing on a Microsoft Windows machine (as is the primary author of this document), we strongly recommend compiling/building BioImage Suite Web using the Ubuntu distribution available from the Windows Store. This is part of the [Windows Subsystem for Linux(WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10). WSL has been an amazing addition to Windows as of 2016 (or so). This will simplify your life immensely. See also [https://github.com/QMonkey/wsl-tutorial](https://github.com/QMonkey/wsl-tutorial) and also the section [ Microsoft Windows and WSL](#Microsoft-Windows-and-WSL) at the end of this document for more details.

---

### Installing GIT

The first step is to install git. On Linux and Mac this might already
be installed on your system so test using ``git --version`` (see
 below). For MS-windows please go to the [Git Webpage][GIT]
and download the appropriate installer. This will also install a bash
command line shell which we will use for all command line operations
in Windows. On MacOS/Linux you can use the built-in command line bash
shell and git as supplied by your system.

To test that git is correctly installed type:

    git --version

If you get a reasonable answer (e.g. ``git version ...``) then git is properly installed.

### Installing Node.js

I recommend that you download Node.js from the
[Node.js webpage][NODE.JS] (download the latest stable version which should be
8.9.x or newer). You may need to add the directory that the executables ``node`` and ``npm`` are to your path.

To test type

    node -v

If you get something like ``v8.9.0`` as output then node is correctly installed.

### Setting up

Once you have both git and node set up you can install the rest of the tools as follows. Open a bash console (on Windows use the Git Bash console) and type (On MacOS/Linux use __sudo npm install__ ...)

    sudo npm install -g gulp mocha jsdoc jshint webpack webpack-cli

These operations (which will take some time) will install the core
tools. Please note that the '-g' flag stands for 'global', i.e. these
modules are installed in the global package directory
(e.g. /usr/local/node_modules) as opposed to your local package directory,
hence the need for ``sudo`` or elevated access. Should you get an error
simply re-run the same command (sometimes there are server timeouts) until
it is complete. On MS-Windows skip ''sudo''. At this point you are set to go.

Next install electron and its associated tools. As of April 2018 there is bug in
the electron installer which requires a more complex command. To do this enter

     sudo npm install -g electron --unsafe-perm=true --allow-root
     sudo npm install -g electron-packager

Your JS development environment is now complete.

## Building and Running BioImage Suite Web

_Note_: BioImage Suite Web (right now) is compiled/packaged in directories inside the source tree. One day we might change this (though npm putting node_modules inside your package sort of makes this unavoidable). You will eventually have a source tree will acquire two extra directories as follows:

* node_modules -- the location of dependent node_modules. This will be populated by npm
* build -- the core build directory
    - build/wasm -- the build directory for the web assembly code (You can move this out if your prefer). The key output files, however, will be redirected to the build directory so that webpack can find them
    - build/dist -- the output directory for zip files or packaged electron applications
    - build/cpp -- this is where the native libraries (optional) for accessing the C++ code from Python and Matlab will be built.
    - build/web -- the output directory for creating the final web-applications and associated .css,.html files etc.

The rest of the directories in your source tree are

* compiletools -- scripts and configuration files to help with compiling
* config -- configuration files for webpack, jsdoc etc.
* cpp -- The C++ code
* doc -- the directory containing this and other documentation files
* js -- the directory containing all js code
* lib -- a directory containing js external libraries (and some css/html) that are not distributed via npm or are customized in some way
* matlab -- the directory containing the fairly primitive matlab wrapper code
* python -- the directory containing the python code
* test -- the directory containing the regression tests and data
* various -- miscellaneous files
    - various/download -- versions of Emscripten (this is a skeleton version) and Eigen (see below) for installation.
    - various/wasm -- pre-built version of the wasm-related JS files to expedite getting started. These can be copied to `build/wasm` to eliminate the need to compile C++ to Web Assembly (at least initially). We update these periodically.
    - various/config -- configuration files for Emacs, Bash and Visual Studio Code that you find useful. 
* web -- the directory containing the html/css files for the web and desktop applications. This also contains the configuration files for Electron desktop applications

In addition there are two key files that live in the main directory

* package.json -- the package description file for npm that captures the dependencies of our software (and its companion file package-lock.json)
* gulpfile.js  -- the configuration file for gulp

### Getting the BioImage Suite Web code

First create an empty directory somewhere. Avoid paths that have spaces in
them. I tend to create a directory called "bisweb" in my home directory.

    cd ~
    mkdir bisweb
    git clone https://github.com/bioimagesuiteweb/bisweb.git bisweb

We will move this repository to github _very soon_.

---

## Building the JS Code

First go to the biscpplib directory inside the source tree. If you installed
BioImage Suite Web in the default location (i.e. ~/javascript) then simply
first

    cd ~/bisweb/biscpplib

__Note:__ Once we move to github the `biscpp` directory will be eliminated and the source will sit directly inside the root `bisweb` directory.

Then download all dependencies using npm (the node package manager as):

    npm update

If you want a more verbose output type instead:

    npm update -d

_Note:_ You will need to perform this step periodically as new dependencies
are added to the software.

If you envision building the Web Assembly code from source you can create the build directory structure using the `createbuild.sh` script (see instructions below in the section [Installing Emscripten and Eigen and ...](#Installing-Emscripten-and-Eigen-and-Configuring-your-Build-Directories)). If you are only interested in the JS only code for now instead type:

    chmod +x config/createjsbuild.sh
    ./config/createjsbuild.sh

This will create three directories `build/web`, `build/wasm` and `build/dist` and copy (from various/wasm) a recent version of the wasm binary compilation in the right places so that you can run BisWeb without the need to build the C++ to Web Assembly from source (instructions for this are below.)

__You need to use these exact directories as this is where the build tools (gulp, webpack) will look for the files.__ (For the curious: take a look at the configuration files `config/webpack_config.js`, `config/app_config.js` and `config/bisweb_pathconfig.js`.)


Now you are ready to go. Type:

    gulp build

This will copy core files in `build/web`. This is the destination for the webpage/electron build.

### Open the Web Applications

 To do this type:

    gulp serve

This does three things:

* It creates a light-weight web server.
* It runs jshint that performs syntax checking on all your JS files
* It runs webpack which packages all the js files into a single
  "web-compatible" JS output

Open a web-browser and navigate to
[http://localhost:8080/web](http://localhost:8080/web). If it all works you
should the main screen pop up.

__Note:__ If you look around you will notice that the `html` files live in the `web` directory. Executing `gulp build` modifies these and places them in `build/web` for eventual distribution/packaging. This does some re-writing of the HTML header to change paths etc.

### Running Regression Tests

At this point you should try running the regression tests. To do this, type:

    mocha test

After a few minutes this will run the regression tests (see the .js files in
the _tests_ directory) and hopefully report that they all pass.

At this point you have a working JS-development directory.

---

## Building the C++ Code as a Web Assembly Library

In the previous section, we used precompiled versions of the C++/WebAssembly code to get us started. In this section, we will describe how to build this final part of the software, the C++ code. Our instructions are for Unix-style operating systems (Linux, MacOS and the WSL version of Ubuntu Linux that can be easily installed from the MS-Windows Store).

To do this, we first need to install three software packages that are required for this step:

* [_CMake_][CMAKE] : this is the cross-platform make tool that was originally
  created for the needs of the Insight Toolkit (ITK).
* [_Emscripten_][EMSCRIPTEN] : this is a project out of Mozilla that can be used to compile
  C++ to webassembly
* [_Eigen_][EIGEN] : this is a numerical linear algebra library that is used
  by our code. This is the only external library used by BioImage Suite web.

### Installing CMake

#### Ubuntu/Debian

Download and install this from the webpage. On Ubuntu install this using apt
as follows:

    sudo apt-get install cmake cmake-curses-gui

#### MacOS

On MacOS install cmake from [cmake.org](cmake.org) and then from the GUI follow the instructions under Tools | How to Install for CommandLine Use to install this for command line use. The easiest option is propabably to create symbolic links in /usr/local as follows:

    sudo "/Applications/CMake.app/Contents/bin/cmake-gui" --install

### Installing Python v3.5 or later

You should also install `python` (v3.5 or later) at this point as well. Emscripten will fail to install without a modern version of python installed (especially on MacOS).

On Ubuntu simply type:

    sudo apt-get install python3

On MacOS, you can use [brew](https://brew.sh/), you can install this using

    brew install python3

Please make sure that `python3` is in your path. To test:

    which python3

You should get a response that looks like `/usr/bin/python3` or `/usr/local/bin/python3`.

#### Python Packages

Please install the packages `numpy` and `nibabel` using the pip package manager as follows:

    sudo pip3 install numpy nibabel

These are used by the Python regression tests.

### Installing Emscripten and Eigen and Configuring your Build Directories

The C++ BisWeb code has a single external library dependency -- Eigen. We also need to install Emscripten to compile the C++ code to Web Assembly. Both the installation of these tools and the creation of the correct development directories is automated using the [createbuild.sh](../config/createbuild.sh) script from the config directory as follows:

First go to your source directory

    cd SOURCE_DIR

Ensure createbuild.sh is executable (it should be!)

    chmod +x config/createbuild.sh  

Run the script:

    ./config/createbuild.sh


This will install Eigen v3, the latest cut of Emscripten and then create the build directories and a bunch of scripts all inside a directory called `build` in your source tree. For the curious, a detailed description of createbuild [can be found at the end of this document](#Detailed-description-of-createbuild.sh).

### Configuring and Building

__This requires some understanding of CMake.__ There is lots of info online on this.

You will need to run cmake to configure the project as a "cross-compiled" application. The easiest way to do this (if you follow our instructions completely) is as follows:

    cd build
    source setpaths.sh
    cd wasm

__Note:__ You should always `source setpaths.sh` before any make/cmake operations in the future as well.

Then to accept all defaults type

    ../cmake.sh .

_Note_: If you would like to customize things replace `cmake.sh` with `ccmake.sh`. to use the ccame GUI version of cmake. 
The core settings are

* BIS_A_EMSCRIPTED -- if ON cross compile using Emscripten else build native library using native compilers (this is how the Python libraries are compiled)
* BIS_WEB_OPT -- this is the optimization flags for the compiler (-O2 is default)
* BUILDNAME -- this is the automatically generated build name
* BUILD_TESTING -- set this to ON to enable ctest-style testing (in addition to mocha). CTest calls mocha.
* EXECUTABLE_OUTPUT_PATH -- Make sure this goes to `build/wasm` as this is where `webpack` and the `node.js` will look for the final libraries. 
* EIGEN3_DIR -- set this to the location of the eigen cmake directory -- it should be set automatically for you.

This [cmake.sh](../compiletools/cmake.sh)/[ccmake.sh](../compiletools/ccmake.sh) scripts simply sets some environment variables and runs cmake with the necessary flags. You can can do this manually and set the flags inside cmake but this is not for the faint-hearted. 

One CMake is done, on the console simply type

    make

or better use the -j flag to set multiple parallel jobs

    make -j2

If it all goes well you will have a fresh set of files in your build/wasm directory:

* libbiswasm_wrapper.js -- the JS wrapper code (more on this in another document)
* libbiswasm.wasm -- the actual web assembly output file (which we do not use directly)
* libbiswasm.js -- the Emscripten Module that packages the web assembly library
* libbiswasm_wasm.js -- a custom script that embeds the WASM file.

__Note:__ In the future, if you make any changes to the C++ code (or inherit some via git pull), source `setpaths.sh` before typing `make` as this may invoke `cmake` which will not find (by default) the paths to Emscripten.

In addition you will have created the command line tools in build/wasm/lib

This is a set of bash and batch files plus two large-ish js files bisweb.js and bisweb-test.js that are the webpack-packaged versions of the command line code. You can install and package these in the usual cmake way using _make install_ and _make package_ if you know what to set up the proper configuration in CMake.

If you are feeling brave you can at this point type:

    make test

This will run the regression tests. It will take a while but hopefully everything passes.

---

## Building the C++ Code as a Native Shared Library for Python/Matlab

__You will need to install Python 3.5 or higher for this to work__.

This is simpler than the WebAssembly build BUT you need to have the __WebAssembly libraries compiled first as the Python module descriptions (more on this in [ModulesInPython.md](ModulesInPython.md)) are created from the JS Code.__

If you followed the steps above you will have a directory called `build/native`. Then cd to this and run the script [cmake_native.sh](../compiletools/cmake_native.sh) as follows:

    cd build/native
    ../cmake_native .

(Again if you would like to customize things replace `cmake_native.sh` with `ccmake_native.sh`.)

Once you are done type:

    make -j2

and then

    make test

as before.

---

## Creating the Code Documentation

For the JS code simply type 

    gulp jsdoc

This will create a set of html files in `build/web/doc`.

For the C++ code you will need to install doxygen and dot.l On Ubuntu this can be done as:

    sudo apt-get install doxygen graphviz

On Mac OS (using brew) you can similarly get these using:

    brew install doxygen graphviz


Then simply type

    gulp cdoc

The final output will go in the directory `build/web/doxygen/html`.

---

## Installing and Packaging

### Web Applications

The first is for the webpage itself. To do this type

    gulp build -m 1 
    gulp zip

The setting `-m 1` turns on minification of the JS code and turns off debug statements. The final result should be a zip file in `build/dist` that can simply be uploaded to a web server.

### Electron Application

To package bisweb as a desktop application for electron simply type

    gulp package

You will find the resulting file (.app,.exe,.zip depending on the platform) in `build/dist`.

### Command Line Tools

For either Python tools or WASM commandline tools you can install these using

    make install

This will send the files to the directory CMAKE_INSTALL_PREFIX/bisweb. You can set the value of CMAKE_INSTALL_PREFIX in cmake, the default is /usr/local.

You can also configure packaging using cpack within CMake. Then type:

    make package

This will create the appropriate .tar.gz, .sh, .zip (depending on options selected) file for you to share.

A cool little trick is to `make install` both the WASM and the Python tools to the same directory. Then simply zip this and you will have a single JS/Python command line installation!

---

## Detailed description of createbuild.sh

We discuss below the internals of `config\createbuild.sh` for any one who is curious. What follows is an annotated simplified version of this script (with the print statements removed to shorten it). If you prefer, you can invoke the steps below one at a time instead of the script. In that case set the environment variable DIR to point to the location of the build directory.

1. Find the location of this script and the build directory

        DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
        DIR="${DIR}/../build"

2. Create the build directory if needed

        mkdir -p ${DIR}
        cd ${DIR}

3. Install Eigen 3

        mkdir -p ${DIR}/eigen3
        cd ${DIR}/eigen3
        unzip ${DIR}/../various/download/Eigen.zip

4. Install Emscripten
    
        cd ${DIR}
        tar xvfz ${DIR}/../various/download/emsdk-portable.tar.gz
        cd emsdk_portable
        chmod +x emsdk
        ${DIR}/emsdk_portable/emsdk update
        ${DIR}/emsdk_portable/emsdk install latest
        ${DIR}/emsdk_portable/emsdk activate latest 




5. Create the remaining build directories

        mkdir -p ${DIR}/web
        mkdir -p ${DIR}/wasm
        mkdir -p ${DIR}/cpp
        mkdir -p ${DIR}/dist

6. Copy the scripts

        cp ${DIR}/../config/setpaths_build.sh ${DIR}/setpaths.sh
        cp ${DIR}/../compiletools/cmake.sh ${DIR}/cmake.sh
        cp ${DIR}/../compiletools/ccmake.sh ${DIR}/ccmake.sh
        cp ${DIR}/../compiletools/cmake_native.sh ${DIR}/cmake_native.sh
        cp ${DIR}/../compiletools/ccmake_native.sh ${DIR}/ccmake_native.sh

7. Make the cmake scripts executable

        chmod +x ${DIR}/cmake*.sh
        chmod +x ${DIR}/ccmake*.sh

This will create a set of directories (if they are not already there)

* build/web -- for bundling the web-app code
* build/wasm -- for building the Web Assembly code
* build/native -- for building the native C++ libraries (for Python)
* build/dist -- for outputing desktop applications

Next it will install emscripten in `build/emsk_portable` and Eigen v3 in `build/eigen3`. The Emscripten installation might take a while depending on your internet connection. See also the [instructions on the WebAssembly Developer's Guide](http://webassembly.org/getting-started/developers-guide/) if you want to understand what is going on under the hood..

Next it will create five scripts in the build directory.

* setpaths.sh -- a bash file for setting your paths when compiling Web Assembly. Simply source build/setpaths.sh to set this up
* cmake.sh -- a wrapper around cmake for building the Web Assembly code.
* ccmake.sh -- a wrapper around ccmake for the same purpose
* cmake_native.sh - a wrapper around cmake for building the native libraries for Python
* ccmake_native.sh - a wrapper around ccmake for building the native libraries for Python


---
## Dropbox and Google Drive Keys

The only source file that is not publicly supplied is the file containing keys
for Google Drive and Dropbox access. A skeleton files is provided in
[js/nointernal/bis_keystore.js](../js/nointernal/bis_keystore.js). If you intend to include this code in your own application you will need to register it with Dropbox/Google Drive as needed and obtain your own keys and add them to this file (which you should also keep private). The easiest way to do this in the current source setup is to:

* Create a directory structure that contains two folders
  - bisweb (or anything you want) -- clone the BioImage Suite Web repository inside this directory.
  - internal (this _must be_ called internal) -- this is for your own private code.
  
* In internal create a subdirectory called `js`

* Copy the files from `bisweb/js/nointernal` to `internal/js` directory and edit them to set the correct keys.
  
* Run the build using 

        cd bisweb
        gulp --internal 1

The parameter "--internal 1" instructs webpack to include the code from the internal directory and not include the boilerplate from `js/nointernal` -- see `config/webpack.config.js` if you are curious as to how this happens.

---

## Microsoft Windows and WSL

The one weakness of compiing BisWeb under the [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10) is that Electron does not run under WSL at this point (it does run but lacks the WebGL integration we need for the viewers.) If you need to work with both C++ code and Electron, here is a recipe that works:

1. Checkout the bisweb source tree under both WSL (e.g. /home/user/bisweb) and under "Native" Windows (e.g. c:\users\user\bisweb)

2. Configure the Windows version to just build the JS distribution (i.e. no WebAssembly)

3. Configure the WSL (Ubuntu effectively) version to build the full version (including Web Assembly)

Under WSL (Ubuntu) in CMake set the two variables (under advanced)

* BIS_WASMLIB_COPY : ON
* BIS_EXTRAPATH : /c/users/user/bisweb/build/wasm

This will instruct CMake to copy the output of the WebAssembly compilation (the three files `libbiswasm.js`, `libbiswasm_wasm.js` and `libbiswasm_wrapper.js` to 'c:\users\user\bisweb\build\wasm' each time they are regenerated. This is done automatically as a post-build rule within CMake. __This takes advantage of the fact that WASM results in completely platform-independent bytecode__, hence we can compile it one one platform and use it everywhere. The advent of WSL means that one does not need to fight with Windows tools and paths anymore. (Though it has been done, but the WSL solution is so much nicer!) Much of the initial testing of the Electron version of BioImage Suite Web was performed in exactly this dual platform setup.

If you are not planning to modify the C++ code then you can simply build this once under WSL and just copy the three files above manually.
