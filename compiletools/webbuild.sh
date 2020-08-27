#!/bin/bash

if [ "*${1}*" == "**" ]; then
    EXTRA=""
else
    EXTRA="-m"
fi


IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"
BDIST=${BDIR}/dist


echo "_______________________________________________________________________"
echo "___ "
echo "___ Building web distributions"
echo "___ SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "___ BDIST=${BDIST}"
echo "___"


mkdir -p ${BDIST}
mkdir -p ${BDIR}/install/zips
mkdir -p ${BDIR}/web
mkdir -p ${BDIR}/doc
touch ${BDIR}/web/LICENSE

# Create server zip file
cd ${SRCDIR}
touch ${BDIST}/a.zip
rm ${BDIST}/*zip

echo "_______________________________________________________________________"
echo "___"
echo "___ Invoking gulp build ${EXTRA}"
echo "___"

gulp build ${EXTRA}

if [ "*${EXTRA}*" == "*-m*" ]; then

    echo "_______________________________________________________________________"
    echo "___"
    echo "___ Invoking gulp zip"
    echo "___"
    
    gulp zip
    mv ${BDIST}/*zip ${BDIR}/install/zips
    
    echo "_______________________________________________________________________"
    echo "___"
    echo "___ Invoking npm pack"
    echo "___"


    cd ${SRCDIR}
    gulp npmpack
    cd ${BDIST}/biswebbrowser
    npm pack
    cp *tgz ${BDIR}/install/zips
    cd ${BDIR}/install/zips
    
    
    echo "_______________________________________________________________________"
    echo "___"
    echo "___ Listing files"
    echo "___"
    pwd
    ls -lrt 
    
    echo "_______________________________________________________________________"
    echo "___"
    echo "___ Done with web distribution"
    echo "___"
    echo "_______________________________________________________________________"
else
    echo "_______________________________________________________________________"
    echo "___"
    echo "___ Done with simple web build"
    echo "___"
    echo "_______________________________________________________________________"
fi
