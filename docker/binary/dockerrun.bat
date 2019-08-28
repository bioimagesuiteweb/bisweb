@echo off

SET D_DIR=c:/temp/biswebcontainer
SET D_USER=xenios

echo +++++ Starting bisweb/tools container with external directory %D_DIR% and user %D_USER%

docker run -it --rm -p 8080:80 -p 24000:24000 ^
       --mount src=%D_DIR%,target=/data,type=bind ^
       -e ORIG_DIR=%D_DIR% ^
       -e LOCAL_USER=%D_USER% ^
       --name biswebtools ^
       bisweb/tools %*

