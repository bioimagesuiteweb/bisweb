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

import os
import sys

my_path=os.path.dirname(os.path.realpath(__file__));
sys.path.append(os.path.abspath(my_path+'/../../build/native'));
sys.path.append(os.path.abspath(my_path+'/../../python'));

import biswrapper as libbiswasm;
import bis_objects as bis

a=len(sys.argv);

if a<5 :
    print('\n Not enough argmments specified\n\tUsage: indivParc indivfmri groupparc numexemplar smooth output');
    sys.exit(1)

imagename1=sys.argv[1];
imagename2=sys.argv[2];
numexemplar=int(sys.argv[3]);
smooth=int(sys.argv[4]);
output=sys.argv[5];

print('++++ Beginning image names',imagename1,imagename2,output,'\n\n');


fmri=bis.bisImage().load(imagename1); print('++++ \t fmri loaded from',imagename1,' dims=',fmri.dimensions);
group=bis.bisImage().load(imagename2); print('++++ \t group loaded from',imagename2,' dims=',group.dimensions);
print('++++\n calling C++ code\n');

paramobj= { 'numberofexemplars' : numexemplar, 'smooth' : smooth};

out_img=libbiswasm.individualizeParcellationWASM(fmri,group,paramobj,2);

out_img.save(output);
print('++++\n output saved in ',output);
sys.exit();
