% LICENSE
% 
% _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
% 
% BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
% 
% - you may not use this software except in compliance with the License.
% - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
% 
% __Unless required by applicable law or agreed to in writing, software
% distributed under the License is distributed on an "AS IS" BASIS,
% WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
% See the License for the specific language governing permissions and
% limitations under the License.__
% 
% ENDLICENSE


lib=biswrapper();

lib.redirect_stdout('matlog2.txt',1);

lines=fileread('..\test\testdata\complex.grd');
combo=lib.parseComboTransformTextFileWASM(lines,1);


grd=combo.grids{1};

disp([' grid=',mat2str(grd.dimensions),' spa=',mat2str(grd.spacing),' ori=', mat2str(grd.origin)]);


data = [  20, 0.5250, 1.5128, 0.2732 ;
          47, -0.6805, 1.3356, 0.6628 ;
          9850, -0.3057, -1.4673, -0.1346 ];

linear = [ 0.999, -0.044, -0.021,  2.691;
           0.045,  0.998,  0.035, -0.860;
           0.020, -0.036,  0.999,  0.552;
           0.000,  0.000,  0.000,  1.000 ];


dl=combo.linear-linear
error=max(max(dl))

disp([' linear error=',mat2str(error) ]);

g=grd.data;

disp(['size of grid data=',mat2str(size(g))]);

for i = 1: 3        
  cp=int32(data(i,1));
  i_data = [ data(i,2),data(i,3),data(i,4) ];
  o_data = [ g(cp+1,1),g(cp++1,2),g(cp+1,3) ];
  error=error+max(abs(i_data-o_data));
  disp([' i_data=',mat2str(i_data), ' o_data=',mat2str(o_data), '        error=',mat2str(error) ]);
end


s=lib.createComboTransformationTextFileWASM(combo,1);



