This directory contains the cpp code/modules of BioImage Suite Web.

This code can use an optional set of extra C++ files that are licensed under
the GPL v2. These last files can be obtained from the
[plugin repository](https://github.com/bioimagesuiteweb/gplcppcode).

To use these files, when configuring the code with CMake,

1. Set the `BIS_USEGPL` flag to `ON`.
2. St the path `BIS_GPL_DIR` to point to the location of these files (e.g. the
   location of the file BisWebExtra.cmake)

