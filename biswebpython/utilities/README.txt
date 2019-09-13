BioImage Suite Python Module for Calcium Preprocessing
Author: Jackson Zhaoxiong Ding
zhaoxiong.ding@yale.edu

Description of Files:
    Files added (path relative to python src code dir):
    /module/calciumPreprocess.py
    /utilities/calcium_image.py
    /utilities/calcium_analysis.py

    calciumPreprocess.py
    This is a BIS Python Module; it is fully integrated with the BIS command line system (so the arg-requirements and cmd line help are provided).
    The output has been validated correct according to Xilin's MATLAB code found on the Shred server (in /mridata2/mri_group/xilin_data/xinxin/pre_process/)

    calcium_image.py 
    Provides some essential (but sometimes specific to our preprocessing) tools for image manipulation. Supports resize, rotate, and channel seperation functionality.

    calcium_analysis.py 
    Provides the key scientific steps for our preprocessing. Each step is modularized as its own function (ex. top hat filter, two-wavelength regression, dF/F)

Toolkits Required:
    pip3 install scikit-image pillow
    scikit-image's morphology module is used for their top-hat filter implementation
    Pillow is used for TIFF image I/O

    *LICENSING NOTE*
    Both scikit and Pillow seem to use the New BSD license, which is compatible with BIS's Apache 2.0 license. Scikit explicitly states their license. Pillow only states their license, which -- to the best of my Legalese reading ability -- seems compatible.

How to Run:
    sampleMovie.tif and mask.tif are required. sampleMovie can be found in /mridata2/mri_group/xilin_data/xinxin/pre_process/ in the Shred server, and mask can be found on my MAC /Volumes/Jackson.
    python3 calciumPreprocess.py --blue sampleMovie.tiff --mask mask.tif --blueout blue_out.nii.gz --uvout uv_out.nii.gz --tophat 300 --rotation -43 --downsample 0.5
    
