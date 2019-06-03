This distribution contains Python command-line applications that are part
of the BioImage Suite Web package. See the LICENSE file in this directory for more information.

Before you do anything else you must:

1. Install Python v 3.5 or newer.
2. Install the numpy and nibabel packages using pip3. On MacOS or Ubuntu this
can be done by typing

     sudo pip3 install numpy nibabel

To run the scripts

1. Optionally set your paths

On Mac/Linux type

   source setpaths.sh

(Or source setpaths.csh if you are running csh/tcsh)

On MS-Windows type

   setpaths.bat

2. Then execute the tool of your choice. (The modules are in the python/modules
directory.) As an example to run the smooth image script (and
get its help page) type:

   smoothImage.py -h







