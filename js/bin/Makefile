.PHONY: all
all : a_masked.o.nii.gz b_masked.o.nii.gz c_masked.o.nii.gz a_smoothed.o.nii.gz b_smoothed.o.nii.gz c_smoothed.o.nii.gz a_thresholded.o.nii.gz b_thresholded.o.nii.gz c_thresholded.o.nii.gz 

.PHONY: clean
clean:
	rm -f *.o.*

.PHONY: mask
mask : a_masked.o.nii.gz b_masked.o.nii.gz c_masked.o.nii.gz 

.PHONY: smooth
smooth : a_smoothed.o.nii.gz b_smoothed.o.nii.gz c_smoothed.o.nii.gz 

.PHONY: threshold
threshold : a_thresholded.o.nii.gz b_thresholded.o.nii.gz c_thresholded.o.nii.gz 

.PHONY: hello
hello : 

a_masked.o.nii.gz : a1.nii.gz mask.nii.gz
	node bisweb.js maskImage --debug true --input a1.nii.gz --mask mask.nii.gz --output a_masked.o.nii.gz

b_masked.o.nii.gz : a2.nii.gz mask.nii.gz
	node bisweb.js maskImage --debug true --input a2.nii.gz --mask mask.nii.gz --output b_masked.o.nii.gz

c_masked.o.nii.gz : a3.nii.gz mask.nii.gz
	node bisweb.js maskImage --debug true --input a3.nii.gz --mask mask.nii.gz --output c_masked.o.nii.gz

a_smoothed.o.nii.gz : a_masked.o.nii.gz
	node bisweb.js smoothImage --debug true --input a_masked.o.nii.gz --output a_smoothed.o.nii.gz

b_smoothed.o.nii.gz : b_masked.o.nii.gz
	node bisweb.js smoothImage --debug true --input b_masked.o.nii.gz --output b_smoothed.o.nii.gz

c_smoothed.o.nii.gz : c_masked.o.nii.gz
	node bisweb.js smoothImage --debug true --input c_masked.o.nii.gz --output c_smoothed.o.nii.gz

a_thresholded.o.nii.gz : a_smoothed.o.nii.gz
	node bisweb.js thresholdImage --debug true --input a_smoothed.o.nii.gz --output a_thresholded.o.nii.gz

b_thresholded.o.nii.gz : b_smoothed.o.nii.gz
	node bisweb.js thresholdImage --debug true --input b_smoothed.o.nii.gz --output b_thresholded.o.nii.gz

c_thresholded.o.nii.gz : c_smoothed.o.nii.gz
	node bisweb.js thresholdImage --debug true --input c_smoothed.o.nii.gz --output c_thresholded.o.nii.gz

