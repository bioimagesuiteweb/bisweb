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

% -----------------------------------------------------
%
% Main Function
% 
% -----------------------------------------------------


function moduleOutput = bis_image(fname,debug)

    if ~exist('niftiinfo')
        disp('BISWEB ERROR -- You need a newer version of Matlab -- 2017b or later to use this function');
        bisimage=0;
        return;
    end

    internal.img=[0];
    internal.spacing=[1,1,1,1,1];
    internal.affine=eye(4);
    internal.orcode= 'RAS';

    moduleOutput.load=@load;
    moduleOutput.save=@save;
    moduleOutput.clone=@clone;
    moduleOutput.create=@create;
    moduleOutput.print=@print;
    moduleOutput.getOrientationCode=@getorientationcode;
    moduleOutput.getImage=@getImage;
    moduleOutput.getImageData=@getImageData;
    moduleOutput.getSpacing=@getSpacing;
    moduleOutput.getAffine=@getAffine;
    moduleOutput.getOrientation=@getOrientation;
    
    if (nargin>0)
        if (nargin<2)
            debug=0;
        end
        load(fname,debug);
    end

    function result = getImage()
        result=internal;
    end

    function result = getImageData()
        result=internal.img;
    end
    
    function result = getAffine()
        result=internal.affine;
    end
    
    function result = getOrientation()
        result=internal.orcode;
    end
    
    function result = getSpacing()
        result=internal.spacing;
    end
    
    function result=create(a)
        internal=a;
        result=internal;
        fixaffine();
    end 

    function result=fixaffine()
        
        temp=internal.spacing;
        v=max(size(temp));
        spacing=[1.0,1.0,1.0,1.0,1.0];
        spacing(1:v)=temp;
    
        % Fix affine to agree with spacing in spacing
        affine=eye(4,4);
        affine(1:4,4:4)=internal.affine(1:4,4:4);
        oldsp=[ norm(internal.affine(1:3,1:1)),norm(internal.affine(1:3,2:2)),norm(internal.affine(1:3,3:3))]';
        for col=1:3
            for row=1:3,
                affine(row,col)=internal.affine(row,col)/oldsp(col)*spacing(col);
            end
        end

        internal.affine=affine;
        internal.spacing=spacing;
        result=1;
    end

    
    function result=print(name,debug)

        if (nargin<2)
            debug=1
        end

        if (debug>0)
            disp([ '___ ',name])
            if (debug>1)
                disp(['      dimensions=',mat2str(size(internal.img)),' spacing=',mat2str(internal.spacing),' orientation=',internal.orcode,' type=',class(internal.img)]);
                if (debug>2)
                    disp(['      matrix=',mat2str(internal.affine)]);
                end
            end
        end

        result=0;
    end
  
    % ----------------------------------------------------------
    % Load Image
    % ----------------------------------------------------------


    function result = load(f,debug)

        if (nargin<1)
            bisimage=0;
            return;
        end

        if (nargin<2)
            debug=2;
        end

        h=niftiinfo(f);
        internal=load_untouch_nii(f,[],[],[],[],[],[]);
        internal.desc='Bisweb matlab image';
        internal.header=h;
        internal.affine=h.Transform.T;
        internal.spacing=h.PixelDimensions';
        internal.orcode=getorientationcode(internal.affine,internal.spacing);

        print(['Loaded image from', h.Filename ],debug);
        result=internal;
    end

    % Clone Image

    function result = clone(input,dims,spacing,tp,debug)

        if (nargin<1)
            result=0;
            return;
        end

    
        if (nargin<2)
            dims=size(input);
        end

        if (nargin<3)
            spacing=input.spacing;
        end

        if (max(size(spacing))<1)
            spacing=input.spacing;
        end

        if (nargin<4)
            tp=class(input.img)
        end

        if (nargin<5)
            debug=0
        end

        % Make sure spacing is a 5-vector
        internal.spacing=spacing;
        internal.affine=input.affine;
        fixaffine();
        internal.desc='Bisweb matlab image';
        internal.img=zeros(dims,tp);
        internal.orcode=getorientationcode(internal.affine,internal.spacing);

        print('__ Cloned image',debug);
        result=internal
    end

    function result = save(f,bisimage)

        if (nargin<2)
            bisimage=internal;
            return;
        end

        % Make sure spacing is a 5-vector
        v=max(size(bisimage.spacing));
        spacing=[1.0,1.0,1.0,1.0,1.0];
        spacing(1:v)=bisimage.spacing;
        
        % Fix affine to agree with spacing in spacing
        affine=eye(4,4);
        affine(1:4,4:4)=bisimage.affine(1:4,4:4);
        oldsp=[ norm(bisimage.affine(1:3,1:1)),norm(bisimage.affine(1:3,2:2)),norm(bisimage.affine(1:3,3:3))]';
        for col=1:3
            for row=1:3,
                affine(row,col)=bisimage.affine(row,col)/oldsp(col)*spacing(col);
            end
        end

        % Create header structure
        nii=make_nii(bisimage.img,spacing(1:3));
    
        % Replace stuff in header structure to make this behave
        nii.hdr.dime.pixdim=[ 0 , spacing(1), spacing(2), spacing(3), spacing(4), spacing(5), 1,1];
        nii.hdr.hist.qform_code=0;
        nii.hdr.hist.sform_code=1;
        nii.hdr.hist.srow_x = affine(1:1,1:4);
        nii.hdr.hist.srow_y = affine(2:2,1:4);
        nii.hdr.hist.srow_z = affine(3:3,1:4);
        nii.hdr.hist.descrip='bisweb matlab';
    
        % Save
        save_nii(nii,f);
        result=f;
    end

    function orcode = getorientationcode(affine,spacing)

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
    end
end