cd /root/bisweb/gpl
git pull

cd /root/bisweb/src
git pull

npm install -d
cd /root/bisweb/src/docker

cp fullbuild.sh /root/bisweb/src/build/fullbuild.sh
cp wasmbuild.sh /root/bisweb/src/build/wasmbuild.sh
cp webbuild.sh  /root/bisweb/src/build/webbuild.sh
cp nativebuild.sh /root/bisweb/src/build/nativebuild.sh
cp testbuild.sh  /root/bisweb/src/build/testbuild.sh
cp biswebinstall.sh /root/bisweb/src/build/biswebinstall.sh
dos2unix /root/bisweb/src/build/*.sh
chmod +x /root/bisweb/src/build/*.sh

cd /root/bisweb/src


