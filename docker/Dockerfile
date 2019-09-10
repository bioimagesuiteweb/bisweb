# Base
FROM ubuntu:18.04

MAINTAINER Xenios Papademetris <xpapademetris@gmail.com>

# install system-wide deps for python and node
RUN apt-get -yqq update
RUN apt-get install -yqq python-pip python-dev python3 python3-pip
RUN apt-get install -yqq unzip g++ gcc cmake cmake-curses-gui
RUN apt-get install -yqq curl openjdk-8-jdk git make dos2unix
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash
RUN apt-get install -yq nodejs
RUN apt-get install -yqq doxygen graphviz gosu

# python packages
RUN pip3 install --upgrade pip
RUN pip3 install numpy nibabel

# Node.js globals
RUN npm install -g gulp mocha rimraf electron-packager

# Expose server
EXPOSE 8080

# dotbashrc and entrypoint file
COPY bash.bashrc /etc/bash.bashrc
RUN dos2unix /etc/bash.bashrc

#Entry point
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN dos2unix /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Configuration script
COPY biswebconfig.sh /usr/local/bin/biswebconfig.sh
RUN dos2unix /usr/local/bin/biswebconfig.sh
RUN chmod +x /usr/local/bin/biswebconfig.sh

# Specify entrypoint --
ENTRYPOINT ["bash", "/usr/local/bin/entrypoint.sh"]






