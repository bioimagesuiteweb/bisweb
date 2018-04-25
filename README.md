## Welcome to BioImage Suite Web

BioImage Suite Web (bisweb) is a web-based medical image analysis suite
primarily geared towards Neuroimaging Analysis. We gratefully acknowledge
support from the [NIH Brain Initiative](https://www.braininitiative.nih.gov/)
under grant R24 MH114805 (Papademetris X. and Scheinost D. PIs).

A good overview of the software can be found
[in slides from a presentation at the 2018 NIH Brain Initiative Meeting](web/images/BioImageSuiteWeb_NIHBrainInitiativeMeeting_April2018.pdf),
which was the first public introduction of the software.

BioimageSuite Web is a hybrid application and toolkit. It contains a set of
command line tools, and desktop and web applications. In addition the code is
modular/componentized and may be useful as a basis for other applications as
well.

The software is currently in late beta version. A fully working `demo` version
can be found
at [https://bioimagesuiteweb.github.io/webapp/](https://bioimagesuiteweb.github.io/webapp/).

For developer documentation please look in the [doc](doc) directory of this
repository, starting with [doc/README.md](doc/README.md).

__Licensing__: Almost all of the source code of BioImage Suite Web is made
available freely under the terms of the
[Apache open source license](http://www.apache.org/licenses/LICENSE-2.0). It
is not approved for clinical use. Use at your own risk. Permission is
explicitly granted to reuse (and relicense) any Apache licensed source files
in this repository in software released under GPL v2 or later.

A small number of C++ files (see [cpp/gpl](cpp/gpl)) are made available under
the [GPL v2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html). If
the C++ code is compiled so as to include these files (by turning the flag
BIS_USEGPL to `ON` which is the default) any resulting binary distribution
must comply with the terms of the GPL v2. (This is the case with the supplied
binary versions of BioImage Suite Web.)


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

