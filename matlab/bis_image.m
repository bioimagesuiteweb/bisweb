% Creates a bis_image data structure
%     if fname is specifed then this is loaded from this
%     debug is a flag (0 to 3) which controls how much printing is done
%
%  Key Functions:
%       load -- loads from a filename (.nii.gz)
%       save -- saves to a filename (.nii.gz)
%       getImage -- returns Image Structure
%           This consists of
%              .img -- the image data matrix
%              .spacing -- the voxel dimensions
%              .affine - the orientation matrix (4x4)
%              .orcode - the orientation code (e.g. RAS) 
%       getImageData -- returns raw Image Matrix
%       getSpacing -- returns the voxel size
%       getDimensions -- returns the image dimensions
%       getOrientation -- returns the image orientation code (e.g. RAS)
%       getAffine -- returns the 4x4 affine matrix mapping ijk to xyz

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
    moduleOutput.create=@create;
    moduleOutput.print=@print;
    moduleOutput.getImageData=@getImageData;
    moduleOutput.getSpacing=@getSpacing;
    moduleOutput.getDimensions=@getDimensions;
    moduleOutput.getAffine=@getAffine;
    moduleOutput.getOrientation=@getOrientation;
    
    if (nargin>0)
        if (nargin<2)
            debug=0;
        end
        load(fname,debug);
    end

    
    % ------------------------------------------
    %
    %  Get Internal Properties / Data
    %
    % ------------------------------------------
    
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

    function result = getDimensions()
        result=size(internal.img);
    end

    % -----------------------------------------------
    % Create
    %     img -- matlab matrix
    %     spacing -- vector of pixel sizes
    %     affine -- is 4x4 matrix or 'LPS' or 'RAS'
    %
    % ----------------------------------------------
    function result=create(img,spacing,affine)

        if (nargin<3)
            affine=eye(4);
        end 

        sz=prod(size(affine));
        if (sz==3)
            if (affine=='LPS')
                affine=eye(4);
                affine(1,1)=-1;
                affine(2,2)=-1;
            elseif (affine=='RAS')
                affine=eye(4);
            end
        end
        
        internal.img=img;
        internal.spacing=spacing;
        fixspacing();

        internal.affine=affine;
        fixaffine();
        internal.orcode=getorientationcode(internal.affine,internal.spacing);
        result=internal;
        return;
    end

    
    % ----------------------------------------------------------
    % Print Image, name is description, debug controls printing
    % ----------------------------------------------------------
    function print(name,debug)

        if (nargin<1)
            name='';
        end 
        if (nargin<2)
            debug=3;
        end

        disp([ '___ ',name])
        if (debug>0)
            disp(['      dimensions=',mat2str(size(internal.img)),' spacing=',mat2str(internal.spacing),' orientation=',internal.orcode,' type=',class(internal.img)]);
            if (debug>1)
                disp(['      matrix=',mat2str(internal.affine)]);
            end
        end

    end
  
    % ----------------------------------------------------------
    % Load Image from f, debug controls amount of printouts
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
        internal.affine=transpose(h.Transform.T);
        internal.spacing=h.PixelDimensions';

        fixspacing();
        internal.orcode=getorientationcode(internal.affine,internal.spacing);


        print(['Loaded image from', h.Filename ],debug);
        result=internal;
    end

    % --------------------------------------------------------------
    % Save Image to filename f
    % --------------------------------------------------------------
    function result = save(f)

        fixspacing();
        fixaffine();
        spacing=internal.spacing;

        % Create header structure
        nii=make_nii(internal.img,spacing(1:3));
      
        % Replace stuff in header structure to make this behave
        nii.hdr.dime.pixdim=[ 0 , spacing(1), spacing(2), spacing(3), spacing(4), spacing(5), 1,1];
        nii.hdr.hist.qform_code=0;
        nii.hdr.hist.sform_code=1;
        nii.hdr.hist.srow_x = internal.affine(1:1,1:4);
        nii.hdr.hist.srow_y = internal.affine(2:2,1:4);
        nii.hdr.hist.srow_z = internal.affine(3:3,1:4);
        nii.hdr.hist.descrip='bisweb matlab';
   
        % Save
        save_nii(nii,f);

        result=1;
    end
    

    % ----------------------------------------------------------
    % Fix Spacing
    % ----------------------------------------------------------
    
    function result=fixspacing()

        s=max(size(internal.spacing));
        if (s<3)
            t=internal.spacing;
            if (s==1)
                internal.spacing=transpose([ t(1),1.0,1.0]);
            else
                internal.spacing=transpose([ t(1),t(2),1.0]);
            end 
        end
        result=s;
    end

    % ----------------------------------------------------------
    % Fix Affine Matrix
    % ----------------------------------------------------------
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

    % -------------------------------------------------------------
    % Compute Orientation code given an affine matrix and spacing
    % -------------------------------------------------------------
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