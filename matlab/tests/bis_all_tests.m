

function result=bis_all_tests(debug)

    [testutil,filepath,lib]=bis_testutils();
    if nargin<1
        debug=1;
    end

    result={
        test_loadsave(debug);
        test_combo(debug);
        test_computeglm(debug);
        test_computeroi(debug);
        test_createimage(debug);
        test_imagedistancematrix(debug);
        test_largemem_smooth(debug);
        test_matrix(debug);
        test_regressout(debug);
        test_resample(debug);
        test_reslice(debug);
        test_smooth(debug);
        test_indiv(debug+1);
        test_xcluster(debug+1);
    };
    
    for i=1:4
        disp('   ');
    end
    disp('============================================================')
    sz=size(result);
    rs=[];
    for i=1:sz
        elem=result{i};
        tt=elem{1};
        l=size(tt);
        tt=strcat(tt,' ');
        for i=l(2):25
            tt=strcat(tt,'.');
        end

        nm='  F A I L E D  ';
        if elem{2}>0
           nm='  P A S S E D  ';
           rs=[rs , 1];
        else
            rs=[rs,0];
        end


        a=strcat('.... ',tt,' ',nm,' (',mat2str(elem{2}),')');
        disp(a);
    end



    s1=sum(rs);
    s2=max(size(rs));


    disp('============================================================')
    disp(['=== Test Results (1=pass)=',mat2str(rs')]);

     if (s1==s2)
        result=1;
        disp(['=== All ',mat2str(s2),' Tests Passed']);
    else 
        result=0;
        disp(['=== Some ',mat2str(s2-s1),' Tests Failed']);
    end


end
