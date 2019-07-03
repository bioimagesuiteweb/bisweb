This directory contains a Dockerfile and associated scripts for creating a
bisweb build environment container.

* Dockerfile -- the actual spec file

* build.sh -- a short script to create the container (basically the one line)

        docker build -t xeniosp/bisweb .

* run.sh -- a short script to run a created container in interactive mode

        sudo docker run -p 8080:8080 -it xeniosp/bisweb bash

* dotbashrc -- a sample .bashrc file for the root user

* The main script `fullbuild.sh` -- this builds bisweb. This is copied in
  /root/bisweb/src/build and called from the docker process.

* Once this is done you can find zip/tar.gz files of the various components in
  `/root/bisweb/src/build/install`.
  
* To run the JS development environment simply type:

    cd /root/bisweb/src
    gulp
  
Details as to how the build is performed can be found in the four component scripts:
  
* nativebuild.sh -- builds the C++ code for use from python/matlab
* testbuild.sh -- runs some regression tests
* wasmbuild.sh -- builds the C++ code for use from JS
* webbuild.sh -- builds the web-based tools



