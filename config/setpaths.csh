set sourced=($_)
if ("$sourced" != "") then
    set rootdir = `dirname $sourced[2]`
else
    echo "sourced=${sourced}"
    echo "exiting .. try again"
    exit
endif

set DIR = `cd $rootdir && pwd`

setenv PATH ${DIR}/bin:${DIR}/lib:${DIR}/server;${DIR}/python/modules:${PATH}

echo "------------------------------------------------------------------------------------"
echo "BISWEB scripts are now in your path ($DIR)"
echo "PATH=${PATH}"
echo ""


