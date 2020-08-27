#!/bin/bash

DIR=${HOME}
USERID=`id -u $USER`

echo "Starting bisweb/devel container with external persistent directory ${DIR} and uid=${USERID}"

docker run --rm -it --mount src=${DIR},target=/hostfiles,type=bind \
     -e LOCAL_USER_ID=${USERID} \
     --name bisweb \
     bisweb/devel-gpu


