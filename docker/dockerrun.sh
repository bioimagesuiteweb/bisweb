docker run -it --rm -p 8080:80 -p 24000:24000 \
     --mount src=${HOME},target=/hostfiles,type=bind \
     -e LOCAL_USER_ID=`id -u $USER` \
     --name bisweb \
     bisweb/devel 


