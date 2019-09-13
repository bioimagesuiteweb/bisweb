# LICENSE
# 
# _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
# 
# BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
# 
# - you may not use this software except in compliance with the License.
# - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
# 
# __Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.__
# 
# ENDLICENSE

import os;
import sys;

my_path=os.path.dirname(os.path.realpath(__file__))
n=os.path.abspath(my_path+'/../..')
l=sys.path;

if (n not in l):
    sys.path.append(n);

if os.name == 'nt':
    sys.path.append(os.path.abspath(my_path+'\\..\\lib'))
else:
    sys.path.append(os.path.abspath(my_path+'/../lib'))

    
