#!/bin/bash

# From https://denibertovic.com/posts/handling-permissions-with-docker-volumes/
# Add local user
# Either use the LOCAL_USER_ID if passed in at runtime or
# fallback to 9001

echo "------------------------------------------------"
echo "+++ Starting docker container."

USER_ID=${LOCAL_USER_ID:-9001}
echo "Starting with UID : $USER_ID"
useradd --shell /bin/bash -u $USER_ID -o -c "" -m bisweb -d /home/bisweb
echo "++++ Added user bisweb"
sleep 2

echo "------------------------------------------------"

cd /home/bisweb
cp /usr/local/share/dotbashrc /home/bisweb/.bashrc
chown bisweb /home/bisweb/.bashrc
dos2unix /home/bisweb/.bashrc

echo "++++ Configured home directory"
echo "++++ ------------------------------------------------"

exec gosu bisweb /bin/bash -l


