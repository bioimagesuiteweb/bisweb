![Logo](https://bioimagesuiteweb.github.io/bisweb-manual/bisweb_newlogo_small.png)

---
## Welcome to BioImage Suite Web

BioImage Suite Web (bisweb) is a web-based medical image analysis suite
primarily geared towards Neuroimaging Analysis. We gratefully acknowledge
support from the [NIH Brain Initiative](https://www.braininitiative.nih.gov/)
under grant R24 MH114805 (Papademetris X. and Scheinost D. PIs).

A good overview of the software can be found
[in slides from a presentation at the 2018 NIH Brain Initiative Meeting](https://bioimagesuiteweb.github.io/webapp/images/BioImageSuiteWeb_NIHBrainInitiativeMeeting_April2018.pdf),
which was the first public introduction of the software.

BioimageSuite Web is a hybrid application and toolkit. It contains a set of
command line tools, and desktop and web applications. In addition the code is
modular/componentized and may be useful as a basis for other applications as
well.

The software can be accessed from
[https://bioimagesuiteweb.github.io/webapp/](https://bioimagesuiteweb.github.io/webapp/).
You may also download desktop and command line versions from
[our download side](http://bisweb.yale.edu/binaries).

For end-user documentation please see the [User Manual (_Draft_)](https://bioimagesuiteweb.github.io/bisweb-manual/). (The sources for this are also on github at [the manual repository](https://github.com/bioimagesuiteweb/bisweb-manual).)

For developer documentation please look in the [docs](docs) directory of this
repository, starting with [docs/README.md](docs/README.md).

__Licensing__: The source code of the core BioImage Suite Web (as found in
this repository) is made available freely under the terms of the
[Apache open source license](http://www.apache.org/licenses/LICENSE-2.0). It
is not approved for clinical use. Use at your own risk. Permission is
explicitly granted to reuse (and re-license) any Apache licensed source files
in this repository in software released under GPL v2 or later.

__Binary Versions__: The binary versions of BioImage Suite Web use an
additional
[set of GPL-licensed files](https://github.com/bioimagesuiteweb/gplcppcode). If
the C++ code is compiled so as to include these files (by turning the flag
BIS_USEGPL to `ON`) any resulting binary distribution must comply with the
terms of the GPL v2. (This is the case with the supplied binary versions of
BioImage Suite Web.)

__To use as a library:__


To use (parts of) BioImage Suite Web as a library you can install it via npm:

For node.js

    npm install biswebnode
    
For browser/electron

    npm install biswebbrowser

See the examples repository for examples:

[https://github.com/bioimagesuiteweb/examples](https://github.com/bioimagesuiteweb/examples)

__Code Acknoledgements:__ We have greatly benefited from reading the source
code of [xtk](https://github.com/xtk/X). We also acknowledge the many posters
on Stack Overflow -- we have tried to link to some of the answers we used in
the code. BioImage Suite Web uses many excellent open source tools/libraries
such as [node.js](https://nodejs.org/en/),
[electron](http://electron.atom.io/), [gulp](http://gulpjs.com/),
[mocha](https://mochajs.org/), [jsdoc](http://usejsdoc.org/),
[jshint](http://jshint.com/), [threejs](https://threejs.org/),
[webpack](https://webpack.github.io/), [cmake](http//www.cmake.org),
[doxygen](http://www.stack.nl/~dimitri/doxygen/),
[emscripten](http://kripken.github.io/emscripten-site/),
[eigen](http://eigen.tuxfamily.org/index.php?title=Main_Page),
[boostrap](http://getbootstrap.com/docs/3.3/), [JQuery](https://jquery.com/)
and others through their dependencies.

