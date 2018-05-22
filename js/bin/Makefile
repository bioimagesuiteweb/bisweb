.PHONY: all
all : a_masked.o.nii.gz b_masked.o.nii.gz c_masked.o.nii.gz a_registered.o.nii.gz b_registered.o.nii.gz c_registered.o.nii.gz a_thresholded.o.nii.gz b_thresholded.o.nii.gz c_thresholded.o.nii.gz 

.PHONY: clean
clean:
	rm -f *.o.*

.PHONY: mask
mask : a_masked.o.nii.gz b_masked.o.nii.gz c_masked.o.nii.gz 

.PHONY: register
register : a_registered.o.nii.gz b_registered.o.nii.gz c_registered.o.nii.gz 

.PHONY: threshold
threshold : a_thresholded.o.nii.gz b_thresholded.o.nii.gz c_thresholded.o.nii.gz 

a_masked.o.nii.gz : a1.nii.gz mask.nii.gz
	maskImage undefined --debug true --input a1.nii.gz --mask mask.nii.gz --output a_masked.o.nii.gz

b_masked.o.nii.gz : a2.nii.gz mask.nii.gz
	maskImage undefined --debug true --input a2.nii.gz --mask mask.nii.gz --output b_masked.o.nii.gz

c_masked.o.nii.gz : a3.nii.gz mask.nii.gz
	maskImage undefined --debug true --input a3.nii.gz --mask mask.nii.gz --output c_masked.o.nii.gz

a_registered.o.nii.gz : a_masked.o.nii.gz
	registerImage undefined --debug true --input a_masked.o.nii.gz --output a_registered.o.nii.gz

b_registered.o.nii.gz : b_masked.o.nii.gz
	registerImage undefined --debug true --input b_masked.o.nii.gz --output b_registered.o.nii.gz

c_registered.o.nii.gz : c_masked.o.nii.gz
	registerImage undefined --debug true --input c_masked.o.nii.gz --output c_registered.o.nii.gz

a_thresholded.o.nii.gz : a_registered.o.nii.gz
	thresholdImage undefined --debug true --input a_registered.o.nii.gz --output a_thresholded.o.nii.gz

b_thresholded.o.nii.gz : b_registered.o.nii.gz
	thresholdImage undefined --debug true --input b_registered.o.nii.gz --output b_thresholded.o.nii.gz

c_thresholded.o.nii.gz : c_registered.o.nii.gz
	thresholdImage undefined --debug true --input c_registered.o.nii.gz --output c_thresholded.o.nii.gz

