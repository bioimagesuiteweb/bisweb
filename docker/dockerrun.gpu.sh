#!/bin/bash

DIR=${HOME}
USERID=`id -u $USER`

echo "Starting bisweb/devel container with external persistent directory ${DIR} and uid=${USERID}"

docker run --rm  --gpus all -it  -p 8080:8080 -p 24000:24000 \
     --mount src=${DIR},target=/hostfiles,type=bind \
     -e LOCAL_USER_ID=${USERID} \
     --name bisweb \
     bisweb/devel-gpu


