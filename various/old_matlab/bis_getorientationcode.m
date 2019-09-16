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

function orcode = bis_getorientationcode(affine,spacing)

    if (nargin<2)
        spacing=[1.0,1.0,1.0]';
    end

    A=affine(1:3,1:3);
    S=eye(3);
    for ia=1:3
        S(ia,ia)=1.0/spacing(ia);
    end
    OR=A*S;

    axis=[ 1 ,2, 3 ]';
    flip=[ 0 ,0, 0 ]';

    order=[3,1,2]';
    left=[3,1,2]';
    for i=1:3
        ia=order(i);
        axis(ia)=left(1);

        for ib=2:size(left)
            other=left(ib);
            if abs(OR(ia,other))>abs(OR(ia,axis(ia)))
                axis(ia)=other;
            end
        end

        if (OR(ia,axis(ia))<0)
            flip(ia)=1;
        end                 

        for k=1:3
            OR(k,axis(ia))=1;
            OR(ia,k)=1;
        end

        for col=1:3,
            sum=0.0;
            for row=1:3
                sum=sum+(OR(row,col)*OR(row,col));
            end
            
            if (sum>0.0) 
                sum=sqrt(sum);
                for row=1:3
                    OR(row,col)=OR(row,col)/sum;
                end
            end
        end

        sz=max(size(left));
        if (i<3)
            if left(1) == axis(ia)
                left=left(2:end);
            elseif (left(2)==axis(ia))
                if (sz>2)
                    left=[ left(1), left(3) ]'
                else
                    left= left(1:1);
                end
            else
                left= left(1:2);
            end
        end
    end

    invaxis=[0,0,0]';
    invflip=[0,0,0]';

    for k=1:3
    cj=1;
    truej=1;
    while cj<=3
        if (axis(cj)==k) 
            truej=cj;
            cj=4;
        end
        cj=cj+1;
    end
    invaxis(k)=truej;
    invflip(k)=flip(truej);
    end

    name='';
    names = [ [ 'L','R' ] ; [ 'P','A' ];  ['I','S']];
    for i=1:3
        ia=invaxis(i);
        ib=2-invflip(i);
        name=[ name, names(ia,ib) ];
    end

    orcode=name;
