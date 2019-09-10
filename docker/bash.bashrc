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

# Aliases
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'
alias ll='ls -l'                              
alias la='ls -A'                              

PS1="[BISWEBDEVEL]:\w>"
export PS1

export DISPLAY=host.docker.internal:0
export PATH=/usr/local/bin:${PATH}



cd ${HOME}


if [ -d  ${HOME}/bisweb ]; then
    cd ${HOME}/bisweb
    echo "All set. You have a  directory ${HOME}/bisweb."
else
    echo "You do not have a bisweb directory. "
    echo "     Auto configuring bisweb for you in ${HOME}/bisweb."
    echo "----------------------------------------------------------"
    mkdir -p bisweb
    cd bisweb
    /usr/local/bin/biswebconfig.sh
fi      

echo "----------------------------------------------------------"   
