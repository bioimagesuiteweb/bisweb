cd /opt/bisweb/gpl
git pull

cd /opt/bisweb/src
git pull

npm install -d
cd /opt/bisweb/src/docker

cp fullbuild.sh /opt/bisweb/src/build/fullbuild.sh
cp wasmbuild.sh /opt/bisweb/src/build/wasmbuild.sh
cp webbuild.sh  /opt/bisweb/src/build/webbuild.sh
cp nativebuild.sh /opt/bisweb/src/build/nativebuild.sh
cp testbuild.sh  /opt/bisweb/src/build/testbuild.sh
cp biswebinstall.sh /opt/bisweb/src/build/biswebinstall.sh
dos2unix /opt/bisweb/src/build/*.sh
chmod +x /opt/bisweb/src/build/*.sh

cd /opt/bisweb/src


