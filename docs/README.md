![Logo](https://bioimagesuiteweb.github.io/bisweb-manual/bisweb_newlogo_small.png)

---
This document contains developer documentation for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). Follow this
link
[for the end-user documentation/manual](https://bioimagesuiteweb.github.io/bisweb-manual/).

A web page version (as opposed to browsing the source) of this page can be found [at this link](https://bioimagesuiteweb.github.io/bisweb/).

---

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


BioImage Suite Web (BisWeb) is a web-based medical image analysis tool 
geared towards processing neural images. We gratefully acknowledge support from
the [NIH Brain Initiative](https://www.braininitiative.nih.gov/) under grant R24 MH114805 (Papademetris X. and Scheinost D. PIs).
A good overview of the software can be found
[in slides from a presentation at the 2018 NIH Brain Initiative Meeting](https://bioimagesuiteweb.github.io/webapp/images/BioImageSuiteWeb_NIHBrainInitiativeMeeting_April2018.pdf),
which was the first public introduction of the software.

The architecture of BioImage Suite Web is shown below:

![BioImage Suite Web Software Architecture](figures/bisweb.png)
---

 BioImage Suite Web uses a mixture of JavaScript for the user interfaces and C++ for the image processing with optional Python and Matlab wrappers.  Additional information about aspects of the software can be found in other files in this directory, such as:

* Some background material on why JavaScript is the primary language for Biomage Suite Web in [WhyJS.md](WhyJS.md).
* Aspects of JavaScript that are particularly relevant to the project in [AspectsofJS.md](AspectsOfJS.md).
* How to program using the base BioImage Suite Web Libraries in JS in [BisWebJS.md](BisWebJS.md).
* The interface from JavaScript to WebAssembly in [JStoWASM.md](JStoWASM.md).
* Using the base BioImage Suite Web libraries from Python in [BisWebPython.md](BisWebPython.md).
* Using the base BioImage Suite Web libraries from Matlab in[BisWebMatlab.md](BisWebMatlab.md). This code is primitive compared to the rest of the code base and more importantly is __unsupported__. Use at your own risk!
* Descriptions of the module architecture in two separate documents 
    - JavaScript: [ModulesInJS.md](ModulesInJS.md)
    - Python: [ModulesInPython.md](ModulesInPython.md).
* Details about how the [Electron](https://electronjs.org/) desktop applications are constructed in [DesktopAppsWithElectron.md](DesktopAppsWithElectron.md).

---

## Setting up your Development Environment

The goal of this section is to help the reader set up a proper software development
environment. BioImage Suite Web uses the following tools:

* [__Git__](https://git-scm.com/) : A popular version control system.
* [__Node.js__](https://nodejs.org/en/) : The command line JavaScript interpreter. Packaged with __npm__ which is the package manager that comes with node.js.
* [__Gulp__](https://gulpjs.com/): An automation tool designed to ease JavaScript build tasks.
* [__webpack__](https://webpack.js.org/): A packaging tool that enables Node.js style modules in browser applications.
* [__Mocha__](https://mochajs.org/): A scripting library designed to automate regression testing.
* [__JSHint__](http://jshint.com/): "A tool that helps to detect errors and potential problems in your JavaScript code" (from the webpage).
* [__JSDoc__](http://usejsdoc.org/): A parsing tool that generates documentation from comments in code.
* [__Electron__](https://electronjs.org/): A tool that uses
  the HTML/CSS/JS that makes up a webpage to create a desktop application.

Editing code also requires a text editor. Users with no prior experience may want to try Microsoft's
[Visual Code](https://code.visualstudio.com/) editor. [Sublime](https://www.sublimetext.com/) and [Atom](https://atom.io/) are also fine choices. [Emacs](https://www.gnu.org/software/emacs/) or [Vim](https://www.vim.org/) may be considered for the truly dedicated/crazy, but users of such esoterica tend to know who they are already.

More information about each of these tools may be found in the links contained in this section.

### Aside: If you are using Microsoft Windows

The instructions in this documents are primarily for Linux (Ubuntu) and secondarily MacOS. These are Unix-y operating systems with a common set of commandline tools and package managers which make life a little easier.

If you are developing on a Windows machine, it is strongly recommended to compile/build BioImage Suite Web using the Ubuntu distribution available from the Windows Store as of 2016. This is part of the [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10) and will simplify your life immensely. See also [https://github.com/QMonkey/wsl-tutorial](https://github.com/QMonkey/wsl-tutorial) and also the section [ Microsoft Windows and WSL](#Microsoft-Windows-and-WSL) at the end of the document for more details.

---

### Installing Git

Git may already be installed on Linux and Mac. ``which git`` will  return the path for Git if it is installed, or an error message otherwise. For MS-Windows please see [this page](https://git-scm.com/download/win). This will also install a `bash`
command line shell which can be used in the same way as a standard `bash` shell (the shell that ships with MacOS and Linux).

To test that git is correctly installed type:

    git --version

If it returns a descriptive answer (e.g. ``git version ...``) then Git is properly installed.

### Installing Node.js

It it recommended the install the latest version of Node.js from the
[Node.js webpage](https://nodejs.org/en/) (download the latest stable version which should be
8.9.x or newer). The ``node`` and ``npm`` binary may need to be added to ``PATH``.

To test a correct installation type

    node -v

If it returns a descriptive answer, e.g. ``v8.9.0``, then Node is correctly installed.

### Setting up

Once both Git and Node are set up, install the rest of the tools as follows: on MacOS or Linux open a terminal and type

    sudo npm install -g gulp mocha jsdoc eslint modclean webpack webpack-cli uglify-es rimraf 

or on Windows type

    npm install -g gulp mocha jsdoc eslint modclean webpack webpack-cli uglify-es rimraf

This will install the core
tools. Please note that the '-g' flag stands for 'global', which means these
modules are installed in the global package directory
(e.g. /usr/local/node_modules) instead of the local package directory. If there is an error or the server times out,
simply re-run the same command until
it is complete.

Next install Electron and its associated tools. As of April 2018 there is bug in
the electron installer which requires a more complex command:

     sudo npm install -g electron --unsafe-perm=true --allow-root
     sudo npm install -g electron-packager

The JS development environment is now complete.

## Building and Running BioImage Suite Web

BioImage Suite Web is currently compiled/packaged in directories inside the source tree. The contents are as follows:

* node_modules — The location of dependent node_modules. This will be populated by npm.
* build — The core build directory.
    - build/wasm — The build directory for the WebAssembly code. You can move this out if your prefer; however, the key output files will be redirected to the build directory so that webpack can find them.
    - build/dist — The output directory for ``.zip`` files or packaged Electron applications.
    - build/cpp — (optional) This is where the native libraries for accessing the C++ code from Python and Matlab will be built.
    - build/web — The output directory for creating the final web-applications and associated ``.css``, ``.html`` files etc.

* compiletools — Scripts and configuration files to help with compiling.
* config — Configuration files for webpack, JSDoc etc.
* cpp — C++ code.
* doc — Directory containing this and other documentation files.
* js — Directory containing all js code
* lib — Directory containing js external libraries and some css/html that are either not distributed via npm or are customized in some way.
* matlab — Directory containing the primitive Matlab wrapper code.
* python — Directory containing the Python code.
* test — Directory containing the regression tests and data.
* various — Miscellaneous files.
    - various/download — Versions of Emscripten (this is a skeleton version) and Eigen for installation.
    - various/wasm — Pre-built version of the Wasm-related JS files to expedite getting started. These can be copied to `build/wasm` to eliminate the need to compile C++ to Web Assembly. These are updated periodically though so to use up-to-date code they will have to be recompiled.
    - various/config — Configuration files for Emacs, Bash and Visual Studio Code that may be useful. 
* web — The directory containing the ``.html`` /``.css`` files for the web and desktop applications. This also contains the configuration files for Electron desktop applications.

In addition there are two key files that live in the main directory

* ``package.json`` — The package description file for npm that lists the dependencies of our software. Generates a companion file, ``package-lock.json``
* ``gulpfile.js``  — The configuration file for Gulp.

### Getting the BioImage Suite Web code

First create an empty director. Avoid paths that have spaces in
them; a folder named 'bisweb' or something similar in the home directory will work well.

    cd ~
    mkdir bisweb
    git clone https://github.com/bioimagesuiteweb/bisweb bisweb

The source code for the project may be found on [Github](https://github.com/bioimagesuiteweb/bisweb).

---

## Building the JS Code

Assuming the steps above, the BioImageSuite Web code should be inside a folder named ``bisweb``. This will be used as the name of the root directory for the project, but you can name it whatever you'd like so long as you're consistent. 

    cd bisweb

Note the presence of ``package.json``. This contains references to the dependencies required by BioImageSuite Web. Ensure that these are up to date by typing:

    npm install

or, for more verbose output:

    npm install -d

_Note:_ Dependencies may change over time. If Bisweb does not perform as
expected try checking if there are updates to the dependencies.

_Note 2:_ If npm install fails to install tensorfow.js (probably because you
do not have a proper node-gyp) setup, simply delete the line containing
`tensorflow` from `package.json` and try again. This is optional at this point.

 To create the WebAssembly binaries and ``build`` folder structure from the source files, see `createbuild.sh` (instructions can be found in [Installing Emscripten and Eigen and Configuring your Build Directories](#installing-emscripten-and-eigen-and-configuring-your-build-directories)). Otherwise, Bisweb comes with a prebaked version of the wasm binaries:

    chmod +x config/createjsbuild.sh
    ./config/createjsbuild.sh

This will create three directories, ``build/web``, ``build/wasm``, and ``build/dist`` and copy the wasm binary in ``various/wasm`` to the build folders. This will perform the same function as making the WebAssembly binaries from the C++ code, though the prebaked binaries may not be fully up-to-date in every version of the software.

__Important: The build tools (Gulp, webpack, etc.) will look for the files in exactly these locations, so moving them elsewhere may cause build steps to fail.__ The curious may want to look at the configuration files `config/webpack_config.js`, `config/app_config.js` and `config/bisweb_pathconfig.js`.


The last step is to build the entire application:

    gulp build

This will copy core files to `build/web`, the destination for the both the web and Electron builds.

### Open the Web Applications

 To do this type:

    gulp serve

This does three things:

* It creates a light-weight web server.
* It runs JSHint that performs syntax checking on all the JS files
* It runs webpack which packages all the ``.js`` files into a single
  web-compatible JS output

Open a web-browser and go to
[http://localhost:8080/web](http://localhost:8080/web). If it all works the main screen should pop up.

_Note: The observant reader may notice that the `.html` files live in the `web` directory. Executing `gulp build` modifies these and places them in `build/web` for eventual distribution/packaging. This does some re-writing of the HTML header to change paths etc._

### Running Regression Tests

The regression tests should function by this point. These should be executed to test proper integration of the WebAssembly code. To do so, type:

    mocha test

This will take a few minutes to finish. The results will be stored in ``.js`` files under ``tests``. If not all tests are reported as successful, there may be a problem with the WebAssembly code.

At this point the JS-development directory should be fully functional.

---

## Building the C++ Code as a WebAssembly Library

The previous sections used prebaked versions of the WebAssembly binaries. This section will describe how to build this final part of the software, the C++/WebAssembly binaries. These instructions are for Unix-style operating systems, e.g. Linux, MacOS and the [WSL version of Ubuntu Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10) that can be installed from the MS-Windows Store.

This process requires three tools:

* [_CMake_](https://cmake.org/) : The cross-platform ``make`` tool originally created for the needs of the [Insight Toolkit (ITK)](https://itk.org/).
* [_Emscripten_](https://github.com/kripken/emscripten): A project from Mozilla that can be used to compile
  C++ to WebAssembly
* [_Eigen_](http://eigen.tuxfamily.org/index.php?title=Main_Page) : A numerical linear algebra library. This is the only external library used by BioImage Suite Web.

### Installing CMake

#### Ubuntu/Debian

Ubuntu and Debian support CMake through their built-in package manager, [``apt``](https://help.ubuntu.com/lts/serverguide/apt.html). Enter the following:

    sudo apt-get install cmake cmake-curses-gui

#### MacOS

On MacOS install CMake from [their website](https://cmake.org/download/) and then from the GUI follow the instructions under Tools | How to Install for CommandLine Use to install it for command line use. The easiest option is propabably to create symbolic links in ``/usr/local`` as follows:

    sudo "/Applications/CMake.app/Contents/bin/cmake-gui" --install
    


### Installing Python v3.5 or later

Emscripten needs a modern version of Python, i.e. v3.5 or later, and will fail to install without one.

On Ubuntu type:

    sudo apt-get install python3

MacOS has its own package manager, [brew](https://brew.sh/), that maintains versions of Python. If ``brew`` is installed, the latest version of python can be installed using:

    brew install python3

Ensure that `python3` is in your path. If it is, then

    which python3

should return a response that looks like `/usr/bin/python3` or `/usr/local/bin/python3`.

#### Python Packages

Please install the packages `numpy` and `nibabel` using the pip package manager as follows:

    sudo pip3 install numpy nibabel

These are used by the Python regression tests.

### Installing Emscripten and Eigen and Configuring your Build Directories

The C++ BisWeb code has a single external library dependency — Eigen. We also need to install Emscripten to compile the C++ code to Web Assembly. Both the installation of these tools and the creation of the correct development directories is automated using the [createbuild.sh](../config/createbuild.sh) script from the config directory as follows:

First go to your source directory

    cd SOURCE_DIR

Ensure createbuild.sh is executable

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

This will create a set of html files in `build/doc`.

For the C++ code you will need to install doxygen and dot.l On Ubuntu this can be done as:

    sudo apt-get install doxygen graphviz

On Mac OS (using brew) you can similarly get these using:

    brew install doxygen graphviz


Then simply type

    gulp cdoc

The final output will go in the directory `build/doc/doxygen/html`.

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

---

### Web-based Tests (_experimental_)

__Browser__:

To run tests in the browser (this applies only to the module tests) type

      gulp serve

Then navigate to:

      http://localhost:8080/web/biswebtest.html

Then select the tests to run and click `Run Tests` to execute.


__Electron__:


To run tests in Electron (this applies only to the module tests) type

      gulp build 

Then (assuming you are in the `src` directory) type:

      electron web biswebtest

Then select the tests to run and click `Run Tests` to execute.


