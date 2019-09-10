#!/bin/bash

# From https://denibertovic.com/posts/handling-permissions-with-docker-volumes/
# Add local user
# Either use the LOCAL_USER_ID if passed in at runtime or
# fallback to 9001

echo "----------------------------------------------------------"

cat<<TF

 #####      #     ####   #    #  ######  #####
 #    #     #    #       #    #  #       #    #
 #####      #     ####   #    #  #####   #####
 #    #     #         #  # ## #  #       #    #
 #    #     #    #    #  ##  ##  #       #    #
 #####      #     ####   #    #  ######  #####

TF
echo "----------------------------------------------------------"

USERHOME=/home/user

if [ -d  /hostfiles ]; then
    USERHOME=/hostfiles/biswebcontainer
    echo "+++ Creating persisting home directory in ${USERHOME}"
else
    echo "+++ Creating home directory inside the container in ${USERHOME}"
fi

USER_ID=${LOCAL_USER_ID:-9001}
echo "+++ Starting with UID : $USER_ID"
useradd --shell /bin/bash -u $USER_ID -o -c "" -m bisweb -d ${USERHOME} > /var/log/add.txt 2>1 
echo "+++ Added user bisweb"
touch ${USERHOME}/.profile
rm    ${USERHOME}/.profile
touch ${USERHOME}/.bashrc
rm    ${USERHOME}/.bashrc

sleep 1

cd ${USERHOME}

exec gosu bisweb /bin/bash -i


