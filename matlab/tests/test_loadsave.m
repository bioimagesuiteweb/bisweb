function result=test_loadsave(debug)
    
    if nargin<1
        debug=1;
    end

    [testutil,filepath,lib]=bis_testutils('test_loadsave');


    fname1=testutil.getTestFilename([ 'glm' filesep 'Test_allruns2.nii' ]);
    fname2=testutil.getTestFilename([ 'glm' filesep 'Test_allruns2.nii.gz' ]);

    input1 = bis_image(fname1,debug+1);
    input2 =  bis_image(fname2,debug+1);

    if (debug>0)
        disp('----------------------------------');
        disp('Subtracting image');
        disp('----------------------------------');
    end
    
    if (debug)
        disp(['Testing real difference']);
    end 

    result1=testutil.compare(input1.getImageData(),input2.getImageData(),'Load .nii vs Load .nii.gz',0,0.1);

    temp=tempname();
    temp2=tempname();

    disp(['Saving in: ',temp]);
    t1=[temp,'.nii' ];
    t2=[temp2,'.nii.gz' ];
    input1.save(t1);
    input1.save(t2);

    input3=bis_image(t1);
    input4=bis_image(t2);

    result2=testutil.compare(input2.getImageData(),input3.getImageData(),' save then load .nii',0,0.1);
    result3=testutil.compare(input2.getImageData(),input4.getImageData(),' save then load .nii.gz',0,0.1);

    
    a=result1{2};
    b=result2{2};
    c=result3{2};

    r=max(a,max(b,c));
    result = {  'Test Load Save'; r};


    %delete(t1)
    %delete(t2)
    testutil.cleanup({ t1 ;t2});

end
    
