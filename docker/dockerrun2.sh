#!/bin/bash
docker run -it --rm -p 8080:80 -p 24000:24000 \
     --mount src=/Users/xenios/Desktop,target=/data,type=bind \
     -e LOCAL_USER_ID=`id -u $USER` \
     --name biswebdevel \
     bisweb/devel bash
