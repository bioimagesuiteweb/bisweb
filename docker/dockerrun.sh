#!/bin/bash

docker run  -it  -p 8080:8080 -p 24000:24000 \
     --name bisweb \
     bisweb/devel 


