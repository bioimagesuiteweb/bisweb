#!/bin/bash

# From https://denibertovic.com/posts/handling-permissions-with-docker-volumes/
# Add local user
# Either use the LOCAL_USER_ID if passed in at runtime or
# fallback to 9001

echo "------------------------------------------------"
echo "+++ Starting docker container."

USERHOME=/home/user

if [ -d  /hostfiles ]; then
    USERHOME=/hostfiles/biswebcontainer
    echo "+++ Creating persisting home directory in ${USERHOME}"
else
    echo "+++ Creating home directory inside the container in ${USERHOME}"
fi

USER_ID=${LOCAL_USER_ID:-9001}
echo "Starting with UID : $USER_ID"
useradd --shell /bin/bash -u $USER_ID -o -c "" -m bisweb -d ${USERHOME}
echo "++++ Added user bisweb"
sleep 2

if [ -d  /hostfiles ]; then
    chown -R bisweb ${USERHOME}
fi

echo "------------------------------------------------"

cd ${USERHOME}
cp /usr/local/share/dotbashrc ${USERHOME}/.bashrc
chown bisweb ${USERHOME}/.bashrc
dos2unix ${USERHOME}/.bashrc

echo "++++ Configured home directory"
echo "++++ ------------------------------------------------"

exec gosu bisweb /bin/bash -i


