# Base
FROM ubuntu:18.04

MAINTAINER Xenios Papademetris <xpapademetris@gmail.com>

# install system-wide deps for python and node
RUN apt-get -yqq update
RUN apt-get install -yqq python3 python3-pip curl
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash
RUN apt-get install -yq nodejs
RUN apt-get install -yqq gosu dos2unix apache2 unzip

# python packages
RUN pip3 install numpy nibabel

# Copy installer files
RUN mkdir -p /usr/local/installers
COPY bisweb*python*.sh   /usr/local/installers
COPY biswebnode*tgz /usr/local/installers
COPY bisweb_*zip /usr/local/installers

WORKDIR /usr/local/installers
RUN echo "Installing"
RUN ls -l

#Python
RUN echo "install bisweb python3 package"
RUN sh ./bisweb*python*sh --prefix=/usr/local --skip-license

# Node.js
RUN echo "install biswebnode"
RUN /usr/bin/npm install -g biswebnode*tgz
RUN chmod +x /usr/lib/node_modules/biswebnode/lib/dcm2nii_binaries/*/*

# Web
WORKDIR /var/www/html
RUN unzip -o /usr/local/installers/bisweb_*zip
RUN chmod 755 /var/www/html

# Copy bashrc file
# dotbashrc and entrypoint file
COPY bash.bashrc /etc/bash.bashrc
RUN dos2unix /etc/bash.bashrc

# bisweb server config to expose /data directory
COPY server.conf /usr/local/installers/server.conf
RUN dos2unix /usr/local/installers/server.conf

# Expose web server
EXPOSE 80
EXPOSE 24000

# Define Entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN dos2unix /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh


ENTRYPOINT ["bash", "/usr/local/bin/entrypoint.sh"]


