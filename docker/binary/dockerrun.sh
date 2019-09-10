#!/bin/bash

DIR=${HOME}
USERID=`id -u $USER`


echo "+++++ Starting bisweb/tools container with external directory ${DIR} and user=${USER}:${USERID}"

docker run -it --rm -p 8080:80 -p 24000:24000 \
     --mount src=${DIR},target=/data,type=bind \
     -e ORIG_DIR=${DIR} \
     -e LOCAL_USER_ID=${USERID} \
     -e LOCAL_USER=${USER} \
     --name biswebtools \
     bisweb/tools \
     "$@"

