# Base
FROM ubuntu:18.04

MAINTAINER Xenios Papademetris <xpapademetris@gmail.com>

# install system-wide deps for python and node
RUN apt-get -yqq update
RUN echo "hello"
RUN apt-get install -yqq python-pip python-dev python3 python3-pip
RUN apt-get install -yqq unzip g++ gcc cmake cmake-curses-gui
RUN apt-get install -yqq curl openjdk-8-jdk git make
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash
RUN apt-get install -yq nodejs

# python packages
RUN pip3 install numpy nibabel

# Node.js globals
RUN npm install -g gulp mocha rimraf
RUN npm install -g electron --unsafe-perm=true --allow-root
RUN npm install -g electron-packager

# Checkout bisweb source
RUN mkdir /opt/bisweb
WORKDIR /opt/bisweb
RUN git clone https://github.com/bioimagesuiteweb/bisweb src
WORKDIR /opt/bisweb/src
RUN git branch -l
RUN git checkout devel
RUN git pull

# checkout bisweb gpl plugin source
WORKDIR /opt/bisweb
RUN git clone https://github.com/bioimagesuiteweb/gplcppcode gpl

# Create BUILD Setup
WORKDIR /opt/bisweb/src
RUN npm install 
RUN node config/createbuild.js

# Build the JS code first
WORKDIR /opt/bisweb/src
RUN touch /opt/bisweb/src/build/web/LICENSE
RUN gulp build

# Now C++ Build for WASM
WORKDIR /opt/bisweb/src/build/wasm
RUN cp /opt/bisweb/various/scripts/*.sh /opt/bisweb/src/build
RUN chmod +x /opt/bisweb/src/build/*.sh
RUN ../cmake_full.sh
RUN make -j2
RUN make install

# Create npm package biswebnode
WORKDIR /usr/local/bisweb
RUN npm pack
RUN cp *tgz /opt/bisweb

# Create npm package biswebbrowser
WORKDIR /opt/bisweb/src/
RUN gulp build
RUN gulp npmpack
WORKDIR /opt/bisweb/src/build/dist/biswebbrowser
RUN ls -l 
RUN npm pack
RUN cp *tgz /opt/bisweb

# Build NATIVE
WORKDIR /opt/bisweb/src/build/native
RUN ../cmake_full_native.sh
RUN make -j2
RUN make package

# Expose 8080
EXPOSE 8080


