This distribution contains a library to allow C++ code from BISWEB to be
accessed from Matlab. See the LICENSE file in this directory for more
information on BioImage Suite Web.

To do this

1. first add the directory 'matlab' inside this directory to your matlab path

2. call the function to add the lib directory to your path

   bispath()

3. To load the bisweb library type

   lib=biswrapper();

4. If this works you will get some helpful print messages

   
See the Bisweb source (and especially the matlab subdirectory) for examples as
to how to use this code.

----

_Note_: The nii directory contains a cut-down version of the
[Tools for NIfTI and Analyze Image
](https://www.mathworks.com/matlabcentral/fileexchange/8797-tools-for-nifti-and-analyze-image)
provided by Jimmy Shen. We simply renamed the files to prevent name conflicts
with people that have the original toolbox installed.
