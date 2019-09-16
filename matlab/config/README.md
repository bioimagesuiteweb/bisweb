![Logo](https://bioimagesuiteweb.github.io/bisweb-manual/bisweb_newlogo_small.png)

---
## BioImage Suite Web -- MATLAB Package

This distribution contains a library to allow C++ code from BISWEB to be
accessed from Matlab.

To do this

1. call the function to set your MATLAB path appropriately

        bispath()

2. To load the bisweb library type

        lib=biswrapper();

3. If this works you will get some helpful print messages


See the Bisweb source (and especially the matlab subdirectory) for examples as
to how to use this code.


------------------
Example -- to run the individualized parcellation code (Salehi et al 2019) do:

1. Load the files from file names: (Replace the text _Group Parcellation Filename_ with an actual filename.  The images must be in NIfTI-1 .nii or .nii.gz format.

        group = bis_image(_Group Parcellation Filename_);
        fmri = bis_image(_fMRI 4D Image Set Filename_);

2. Call the parcellation

        sigma=4.0
        numexemplars=2678;
        debug=1
        output=bis_individualizedparcellation(fmri,group,sigma,numexemplars,debug,'false');

3. Save the output

        output.save(_Some output filename_
----

_Note_: The nii directory contains a cut-down version of the
[Tools for NIfTI and Analyze Image
](https://www.mathworks.com/matlabcentral/fileexchange/8797-tools-for-nifti-and-analyze-image)
provided by Jimmy Shen. We simply renamed the files to prevent name conflicts
with people that have the original toolbox installed.


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
