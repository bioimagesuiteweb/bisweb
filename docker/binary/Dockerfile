# Base
FROM ubuntu:18.04

MAINTAINER Xenios Papademetris <xpapademetris@gmail.com>

# install system-wide deps for python and node
RUN apt-get -yqq update
RUN apt-get install -yqq python3 python3-pip curl
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash
RUN apt-get install -yq nodejs

# python packages
RUN pip3 install numpy nibabel

# Copy installer files
COPY bisweb*python*.sh   /root/bisweb/
COPY biswebnode*tgz /root/bisweb

WORKDIR /root/bisweb/
RUN echo "Installing"
RUN ls -l

RUN echo "install bisweb python3 package"
RUN sh ./bisweb*python*sh --prefix=/usr/local --skip-license

RUN echo "install biswebnode"
RUN /usr/bin/npm install -g biswebnode*tgz
RUN chmod +x /usr/lib/node_modules/biswebnode/lib/dcm2nii_binaries/*/*

# Copy bash file
COPY dotbashrc /root/.bashrc



