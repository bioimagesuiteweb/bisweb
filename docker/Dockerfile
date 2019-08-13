# Base
FROM ubuntu:18.04

MAINTAINER Xenios Papademetris <xpapademetris@gmail.com>

# install system-wide deps for python and node
RUN apt-get -yqq update
RUN apt-get install -yqq python-pip python-dev python3 python3-pip
RUN apt-get install -yqq unzip g++ gcc cmake cmake-curses-gui
RUN apt-get install -yqq doxygen graphviz
RUN apt-get install -yqq curl openjdk-8-jdk git make dos2unix
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash
RUN apt-get install -yq nodejs

# python packages
RUN pip3 install numpy nibabel

# Node.js globals
RUN npm install -g gulp mocha rimraf
RUN npm install -g electron --unsafe-perm=true --allow-root
RUN npm install -g electron-packager

# Checkout bisweb source
RUN mkdir /root/bisweb
WORKDIR /root/bisweb
RUN git clone https://github.com/bioimagesuiteweb/bisweb src
WORKDIR /root/bisweb/src
RUN git branch -l
RUN git checkout devel
RUN git pull

# checkout bisweb gpl plugin source
WORKDIR /root/bisweb
RUN git clone https://github.com/bioimagesuiteweb/gplcppcode gpl

# Create BUILD Setup
WORKDIR /root/bisweb/src
RUN npm install -d
RUN node config/createbuild.js

# Now C++ Build for WASM
WORKDIR /root/bisweb/src/build
RUN echo "Copying files"

COPY fullbuild.sh   /root/bisweb/src/build/fullbuild.sh
COPY wasmbuild.sh   /root/bisweb/src/build/wasmbuild.sh
COPY webbuild.sh    /root/bisweb/src/build/webbuild.sh
COPY nativebuild.sh /root/bisweb/src/build/nativebuild.sh
COPY testbuild.sh   /root/bisweb/src/build/testbuild.sh
RUN dos2unix /root/bisweb/src/build/*.sh
RUN chmod +x /root/bisweb/src/build/*.sh
RUN /root/bisweb/src/build/fullbuild.sh

# Expose server
EXPOSE 8080

# Build NATIVE
WORKDIR /root/bisweb/src/
RUN echo "done setting up docker machine"

COPY dotbashrc /root/.bashrc



