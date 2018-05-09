.PHONY: all
all : 
	make asdf.o.nii.gz aaa.o.nii.gz

.PHONY: clean
clean : 
	rm -rf *.o.nii.gz

asdf.o.nii.gz : ../../test/testdata/MNI_2mm_orig.nii.gz
	node bisweb.js smoothImage -i ../../test/testdata/MNI_2mm_orig.nii.gz -o asdf.o.nii.gz --sigma 4.0

aaa.o.nii.gz : asdf.nii.gz
	node bisweb.js thresholdImage -i asdf.o.nii.gz -o aaa.o.nii.gz --low 50 --high 100


