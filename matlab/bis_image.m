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

    internal.img=(1);
    internal.spacing=[1,1,1,1,1];
    internal.affine=eye(4);
    internal.orcode= 'RAS';
    internal.filename='';

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
    
    function result = Filename()
        result=internal.filename;
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
    
        internal.filename='';
        internal.img=img;
        internal.spacing=spacing;
        makeSureSpacingIsLongEnough();

        internal.affine=affine;
        makeSpacingAndAffineConsistent();
        internal.orcode=computeOrientationCodeFromAffineAndSpacing();
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
            disp(['      dimensions=',mat2str(size(internal.img)),' spacing=',mat2str(internal.spacing,4),' orientation=',internal.orcode,' type=',class(internal.img)]);
            if (debug>1)
                disp(['      matrix=',mat2str(internal.affine,4)]);
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

        
        internal=load_untouch_nii_bis(f,[],[],[],[],[],[]);
        computeAffineAndSpacingFromHeader(internal.hdr);
        internal.orcode=computeOrientationCodeFromAffineAndSpacing();
        internal.filename=f;

        print(['Loaded image from ', internal.filename],debug);
        result=1;
    end

    % --------------------------------------------------------------
    % Save Image to filename f
    % --------------------------------------------------------------
    function result = save(f)

        makeSureSpacingIsLongEnough();
        makeSpacingAndAffineConsistent();
        spacing=internal.spacing;

        % Create header structure
        nii=make_nii_bis(internal.img,spacing(1:3));
      
        % Replace stuff in header structure to make this behave
        nii.hdr.dime.pixdim=[ 0 , spacing(1), spacing(2), spacing(3), spacing(4), spacing(5), 1,1];
        nii.hdr.hist.qform_code=0;
        nii.hdr.hist.sform_code=1;
        nii.hdr.hist.srow_x = internal.affine(1:1,1:4);
        nii.hdr.hist.srow_y = internal.affine(2:2,1:4);
        nii.hdr.hist.srow_z = internal.affine(3:3,1:4);
        nii.hdr.hist.descrip='bisweb matlab';
   
        % Save
        save_nii_bis(nii,f);
        internal.filename=f;
        result=1;
        disp(['saving image in ',f]);
    end
    


    % -------------------------------------------------------------
    % Compute Orientation code given an affine matrix and spacing
    % -------------------------------------------------------------
    function orcode = computeOrientationCodeFromAffineAndSpacing()
        
        affine=internal.affine;
        spacing=internal.spacing;

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

    % -------------------------------------------------------------
    % Compute Orientation Matrix and Spacing from NIFTI Header
    % -------------------------------------------------------------
    function computeAffineAndSpacingFromHeader(hdr)

        pixdim=hdr.dime.pixdim;
        
        if(hdr.hist.qform_code > 0) 
            %      console.log('using q_form');
            % https://github.com/Kitware/ITK/blob/master/Modules/IO/NIFTI/src/itkNiftiImageIO.cxx
            a = 0.0; b = hdr.hist.quatern_b; c = hdr.hist.quatern_c; d = hdr.hist.quatern_d;
            xd = 1.0; yd = 1.0; zd = 1.0;
            qx = hdr.hist.qoffset_x; qy = hdr.hist.qoffset_y; qz = hdr.hist.qoffset_z;

            % compute a
            a = 1.0 - (b*b + c*c + d*d) ;
            if( a < 0.0000001 )
                a = 1.0 / sqrt(b*b+c*c+d*d) ;
                b = b*a ; c = c*a ; d = d*a ;        % normalize (b,c,d) vector 
                a = 0.0;                       % a = 0 ==> 180 degree rotation 
            else
                a = sqrt(a) ;                     % angle = 2*arccos(a) 
            end

            % scaling factors
            if(pixdim(2) > 0.0) 
                xd = pixdim(2);
            end

            if(pixdim(3) > 0.0) 
                yd = pixdim(3);
            end

            if(pixdim(4) > 0.0) 
                zd = pixdim(4);
            end

            % qfac left handed
            if(pixdim(1) < 0.0) 
                zd = -zd;
            end

            % fill IJKToRAS
            IJKToRAS=[  (a*a+b*b-c*c-d*d)*xd,  2*(b*c-a*d)*yd,  2*(b*d+a*c)*zd,  qx ;
                        2*(b*c+a*d)*xd,  (a*a+c*c-b*b-d*d)*yd,  2*(c*d-a*b)*zd,  qy ;
                        2*(b*d-a*c )*xd,  2*(c*d+a*b)*yd,  (a*a+d*d-c*c-b*b)*zd, qz ];
        elseif (hdr.hist.sform_code>0)

            sx = hdr.hist.srow_x; sy = hdr.hist.srow_y; sz = hdr.hist.srow_z;
            % fill IJKToRAS
            IJKToRAS= [  sx(1), sx(2), sx(3), sx(4); 
                         sy(1), sy(2), sy(3), sy(4);
                         sz(1), sz(2), sz(3), sz(4) ];
            pixdim(2) = sqrt(sx(1)*sx(1)+sy(1)*sy(1)+sz(1)*sz(1));
            pixdim(3) = sqrt(sx(2)*sx(2)+sy(2)*sy(2)+sz(2)*sz(2));
            pixdim(4) = sqrt(sx(3)*sx(3)+sy(3)*sy(3)+sz(3)*sz(3));
        elseif hdr.hist.qform_code == 0
            % fill IJKToRAS 
            IJKToRAS=[  pixdim(2), 0, 0, 0;
                        0, pixdim(3), 0, 0;
                        0, 0, pixdim(4), 0 ];

        else
            disp('UNKNOWN METHOD IN PARSER NIIX');
        end

        internal.spacing=   transpose([ pixdim(2), pixdim(3),pixdim(4),pixdim(5),pixdim(6) ]);
        for i=3:5
            if (internal.spacing(i)<0)
                internal.spacing(i)=1;
            end
        end
        internal.affine = [ IJKToRAS; 0 0 0 1 ];

    end

        % ----------------------------------------------------------
    % Fix Spacing
    % ----------------------------------------------------------
    
    function makeSureSpacingIsLongEnough()

        s=max(size(internal.spacing));
        if (s<3)
            t=internal.spacing;
            if (s==1)
                internal.spacing=transpose([ t(1),1.0,1.0]);
            else
                internal.spacing=transpose([ t(1),t(2),1.0]);
            end 
        end
    end

    % ----------------------------------------------------------
    % Fix Affine Matrix
    % ----------------------------------------------------------
    function makeSpacingAndAffineConsistent()
        
        temp=internal.spacing;
        v=max(size(temp));
        spacing=transpose([1.0,1.0,1.0,1.0,1.0]);
        spacing(1:v)=temp;
    
        % Fix affine to agree with spacing in spacing
        % Actual Spacing in i is shift for 1-i
        % Magn affine*[1,0,0,1]' - affine*[0 0 0 1]'
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
    end

end
