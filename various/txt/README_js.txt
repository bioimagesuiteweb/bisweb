This distribution contains JavaScript command-line applications that are part
of the BioImage Suite Web package. See the LICENSE file in this directory for more information.

Before you do anything else you must install Node.js version 10.x. You may obtain this from https://nodejs.org/en/

__Note: In the rest of this document the directory this file is located in is
refered to as BISWEBDIR__

---

To run the modules:

0. The first time you do this -- you need to install the prerequities by
typing npm install in the bisweb directory

   cd BISWEBDIR
   npm install

1. Optionally set your paths

On Mac/Linux type

   source setpaths.sh

(Or source setpaths.csh if you are running csh/tcsh)

On MS-Windows type

   setpaths.bat

2. Then execute the tool of your choice.As an example to run the smooth image
tool (and get its help page) type:

    bisweb.js smoothImage -h


If you did not set the paths then simply type

   BISWEBDIR/lib/bisweb.js smoothImage -h

_Note:_ The list of modules can be found in the file BISWEBDIR/ModuleList.txt
