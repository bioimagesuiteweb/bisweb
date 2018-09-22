# Roadmap

---

## Pipeline Issues

* DICOM Import
  * Add dcm2nii support on the server (if dcm2nii is present)
    * security/checksums etc.

* BIDS Import
  * DICOM (dcm2nii output, with some renaming)
  * Paravision

* Quality Control for Anatomy

* Motion Correction and Registration
  * Quality Control

* Parcellation

* Filtering and Connectivity

* CPM

* Visualization

-------

## Supporting Functionality

* extend (or really refactor) VOI analysis tool to create a separate time series plotter as well (without the ROI step, and not showing volume)
  -- essentially provide matrix input and hide show volume button if not applicable!

* text output for modules (object added) but need to figure out where to store it, how to save it etc.
  popup text viewer with save option

* Test S3 and add querystring match for paravision

* Random back when loading settings


