This directory contains a Dockerfile and associated scripts for creating a
bisweb build environment container.

* Dockerfile -- the actual spec file

* dockerbuild.sh -- a short script to create the container (basically the one line)

        docker build -t bisweb/devel -f Dockerfile

From here we have two `run scripts`

* dockerrun.sh -- this runs bisweb and stores everything inside the container

        docker run  -it  -p 8080:8080 -p 24000:24000 \
            --name bisweb \
            bisweb/devel 



* dockerrun2.sh -- this runs bisweb and stores everything in a directory
  external to the container
  
         #!/bin/bash

         DIR=${HOME}
         USERID=`id -u $USER`

         echo "Starting bisweb/devel container with external persistent directory ${DIR} and uid=${USERID}"

         docker run --rm  -it  -p 8080:8080 -p 24000:24000 \
            --mount src=${DIR},target=/hostfiles,type=bind \
            -e LOCAL_USER_ID=${USERID} \
            --name bisweb \
            bisweb/devel 

This creates a new user bisweb with the same uid as the host user running the
container and mounts their home directory ($HOME) (or any other place, change
$DIR in the script) in a directory called /hostfiles/biswebcontainer

Once you start the container you will meet a prompt of the form
     ------------------------ In Bisweb docker image ----------------------------------------
    To create a bisweb source directory
    1. Navigate to the desired directory
    2. Run the script: biswebconfig.sh
    ------------------------ ---------------------------------------------------------------

    [BISWEBDEVEL]:/hostfiles/biswebcontainer>

If you do not have a bisweb difectory in your home directory
(`/hostfiles/biswebcontainer`), then one will be created for you and then the
script `biswebconfig.sh` will be run to create the setup.

This will download the bisweb source tree and configure and build it as
needed.  Once this is completed, you now have a full bisweb source directory configured in your
directory of choice (we will call this `/hostfiles/biswebcontainer/bisweb`). 

Some notes:

1. You fill find packged binary files of the various components in
 
      `~/bisweb/src/build/install`.

2. To run the JS development environment simply type:

        cd ~/bisweb/src
        gulp
  
Details as to how the build is performed can be found in the four component
scripts (which can be found in the directory  `~/bisweb/bisweb/src/compiletools`):
  
* nativebuild.sh -- builds the C++ code for use from python/matlab
* testbuild.sh -- runs some regression tests
* wasmbuild.sh -- builds the C++ code for use from JS
* webbuild.sh -- builds the web-based tools

