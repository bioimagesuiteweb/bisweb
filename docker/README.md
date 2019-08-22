This directory contains a Dockerfile and associated scripts for creating a
bisweb build environment container.

* Dockerfile -- the actual spec file

* dockerbuild.sh -- a short script to create the container (basically the one line)

        docker build -t bisweb/devel -f Dockerfile

* dockerrun.sh -- a short script to run a created container in interactive mode

        docker run -it --rm -p 8080:80 -p 24000:24000 \
          --mount src=${HOME},target=/hostfiles,type=bind \
          -e LOCAL_USER_ID=`id -u $USER` \
          --name bisweb \
          bisweb/devel 

This creates a new user bisweb with the same uid as the host user running the
container and mounts their home directory ($HOME) in a directory called
/container

Once you start the container you will meet a prompt of the form


     ------------------------ In Bisweb docker image ----------------------------------------
    To create a bisweb source directory
    1. Navigate to the desired directory
    2. Run the script: biswebconfig.sh
    ------------------------ ---------------------------------------------------------------

    [BISWEBDEVEL]:/hostfiles>
    
If everything goes well you are in your home directory on the host
machine. From here create your directory e.g.

    mkdir bisweb
    cd bisweb
    
and run the script
    
    biswebconfig.sh
    
This will download the bisweb source tree and configure and build it as
needed.  Once this is completed, you now have a full bisweb source directory configured in your
directory of choice (we will call this `/hostfiles/bisweb`). 

Some notes:

1. You fill find packged binary files of the various components in
 
      `/hostfiles/bisweb/src/build/install`.

2. To run the JS development environment simply type:

       cd /container/bisweb/src
       gulp
  
Details as to how the build is performed can be found in the four component
scripts (which can be found in the directory  /hostfiles/bisweb/src/compiletools on the container disk):
  
* nativebuild.sh -- builds the C++ code for use from python/matlab
* testbuild.sh -- runs some regression tests
* wasmbuild.sh -- builds the C++ code for use from JS
* webbuild.sh -- builds the web-based tools

