
echo "------------------------------------------"; echo "Creating a_smoothed.nii.gz" ; node bisweb.js smoothImage

blank lines in makefile

all : step1 step2 step3

step1 : a_smoothed.nii.gz b_smoothed c_smoothed

step2 : a_thre b_thre c_thr


TODO: 

add unique names for each job (other than just the name of the command)
    - step1 for example should be the job name

visualize pipeline on tree viewer? 

make job running command (e.g. node bisweb.js ... ) a parameter with reasonable defaults. 
    - this will let you run it on a server, in background, etc. 
    - make it blankable so that people can specify Unix scripts
    - right now job smoothImage results in command node bisweb.js smoothImage --> runnable smoothImage and if runnable is blank dont' add space --> "smoothImage" then it could be gulp build, cp , tar ,zip 


    output directory
    create log files   >& logfile.log 2>&1

output file name generation rule (current way is fine as a default, but there should be alternatives)
    - List of files, i.e. name files exactly as a list of specified filenames
    - Create another output file (Makefile.json?) which specifies the output names for each job


