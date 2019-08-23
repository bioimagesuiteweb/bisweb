#!/bin/bash

# From https://denibertovic.com/posts/handling-permissions-with-docker-volumes/
# Add local user
# Either use the LOCAL_USER_ID if passed in at runtime or
# fallback to 9001

USER_ID=${LOCAL_USER_ID:-9001}
USER=${LOCAL_USER:bisweb}
HDIR="/dockerhome/${USER}"

mkdir -p /dockerhome
echo "+++++ Creating user ${USER}:${USER_ID} and home directory=${HDIR}"
useradd --shell /bin/bash -u $USER_ID -o -c ${USER} -m ${USER} -d ${HDIR}

export CMD="${@}"
export BISWEBCMD="*${@}*"

if [ "${BISWEBCMD}" == "**" ] || [ "${BISWEBCMD}" == "*bash*" ]; then
    echo "+++++ Starting apache server on port 80"
    /usr/sbin/apachectl -DFOREGROUND > /var/log/apache.log  2>1 &
    cp /usr/local/share/dotbashrc ${HDIR}/.bashrc
    chown -R ${USER} ${HDIR}
    cd ${HDIR}
    exec gosu ${USER} bash
else
    chown -R ${USER} ${HDIR}
    echo "_____ Executing specified command ${CMD}"
    echo "_____     host directory ${ORIG_DIR} is mapped to /data"
    exec gosu ${USER} ${CMD}
fi



