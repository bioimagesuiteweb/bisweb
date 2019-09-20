# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# From the Tensorflow Docker Image, Modified for our needs
# ==============================================================================


echo "----------------------------------------------------------"

if [[ $EUID -eq 0 ]]; then
  cat <<WARN
WARNING: You are running this container as root, which can cause new files in
mounted volumes to be created as the root user on your host machine.

To avoid this, run the container by specifying your user's userid:

$ docker run -u \$(id -u):\$(id -g) args...
WARN
else
        echo ""
fi

echo "+++++ Starting bisweb fileserver"
biswebnode bisserver --config /usr/local/installers/server.conf --ipaddr 0.0.0.0 &
sleep 2
echo ""
echo "------------------------ In Bisweb docker image w/server ----------------------------------------"
echo ""
echo "To execute the bisweb JS command line tools type: biswebnode"
echo "    to use the node.js library simply require('biswebnode')"
echo ""
echo "To execute the bisweb Python command line tools type: biswebpy"
echo "    to use the python3 library simply import biswebpython"
echo ""
echo "The web applications are available under localhost:8080"
echo "     with a local biweb file server on port 24000"
echo ""
echo "To run the node.js regression tests simply type:"
echo "     biswebnode regressiontests --run 1"
echo "To run the python3 regression tests simply type:"
echo "     biswebpy regressiontests"
echo "------------------------ ------------------------------------------------------------------------"
echo "Your host directory ${ORIG_DIR} is mapped to the container directory /data"
echo "------------------------ ------------------------------------------------------------------------"


alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'
alias ll='ls -l'                              
alias la='ls -A'                              

PS1="[BISWEBTOOLS]:\w>"
export PS1

cd /data
