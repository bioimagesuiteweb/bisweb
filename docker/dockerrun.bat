@echo off

SET D_DIR=c:/temp

echo +++++ Starting bisweb/devel container with external directory %D_DIR% 

docker run -it --rm -p 8080:8080 -p 24000:24000 ^
       --mount src=%D_DIR%,target=/hostfiles,type=bind ^
       --name bisweb ^
       bisweb/devel bash -l
