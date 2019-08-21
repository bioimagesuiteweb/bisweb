#!/bin/bash

# Checkout main bisweb source code
echo "Checking out bisweb source"
mkdir /opt/bisweb
cd /opt/bisweb
git clone https://github.com/bioimagesuiteweb/bisweb src
cd /opt/bisweb/src
git branch -l
git checkout devel
git pull

# checkout bisweb gpl plugin source
cd /opt/bisweb
git clone https://github.com/bioimagesuiteweb/gplcppcode gpl

# Create BUILD Setup
cd /opt/bisweb/src
npm install -d
node config/createbuild.js

# Now C++ Build for WASM
cd /opt/bisweb/src/build
echo "Copying files"

dos2unix /opt/bisweb/src/build/*.sh
chmod +x /opt/bisweb/src/build/*.sh
/opt/bisweb/src/build/fullbuild.sh
/opt/bisweb/src/build/biswebinstall.sh

# Expose server
EXPOSE 8080

# Build NATIVE
cd /opt/bisweb/src/
echo "done setting up docker machine -- now copying final scripts"

# Final configurations
cd /opt/bisweb/
COPY dotbashrc /opt/.bashrc
COPY dockerupdate.sh /opt/bisweb/update.sh
dos2unix /opt/bisweb/update.sh
chmod +x /opt/bisweb/update.sh




