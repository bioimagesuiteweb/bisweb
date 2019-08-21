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
RUN mkdir -p /opt/bisweb/installers
COPY bisweb*python*.sh   /opt/bisweb/installers
COPY biswebnode*tgz /opt/bisweb/installers
COPY bisweb_*zip /opt/bisweb/installers

WORKDIR /opt/bisweb/installers
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
RUN unzip -o /opt/bisweb/installers/bisweb_*zip
RUN chmod 755 /var/www/html

# Copy bashrc file to home directory
COPY dotbashrc /opt/bisweb/.bashrc

# bisweb server config to expose /data directory
RUN mkdir /opt/bisweb/conf
COPY server.conf /opt/bisweb/conf/server.conf
RUN dos2unix /opt/bisweb/conf/server.conf

# Expose web server
EXPOSE 80
EXPOSE 24000

# Define Entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN dos2unix /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh


ENTRYPOINT ["bash", "/usr/local/bin/entrypoint.sh"]


