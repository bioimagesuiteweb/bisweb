function result=test_createimage(debug)

    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('Test Create Image');
    
    img=bis_image();

    dat=zeros(5,5,'single');
    dat(3,3)=1;

    img.create(dat,[1,1]);
    img.print('Just created',3);


    param.sigmas=[0.0,0.0,0.0 ];
    param.radiusfactor=2.0;
    param.inmm='false';
    
    if (debug>0)
        disp('----------------------------------');
        disp(['Smoothing image', mat2str(param.sigmas) ]);
    end
    output = lib.gaussianSmoothImageWASM(img, param, debug);

    result1=testutil.compare(img.getImageData(),output.getImageData(),'Manual Create',0,0.01);
    disp('---')

    param.sigmas=[1.0,0.0,0.0 ];
    
    if (debug>0)
        disp('----------------------------------');
        disp(['Smoothing image', mat2str(param.sigmas) ]);
    end
    output = lib.gaussianSmoothImageWASM(img, param, debug);
    b=output.getImageData();
    b=b(:,3:3);
    c=[0.05 ,0.25,0.40,0.25,0.05];

    if (debug>0)
        disp(['Comparing ',mat2str(c')]);
        disp(['       vs ',mat2str(b')]);
    end

    result2=testutil.compare(b,c,'Manual Create + Smooth sigma=1',0,0.01);

    a=result1{2};
    b=result2{2};

    result=min(a,b);
    testutil.cleanup();
    result= {'Create Image', result};


    
end
