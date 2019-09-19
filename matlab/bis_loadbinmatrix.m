% Read and Write binmatr sparse matrix format
% -------------------------------------------

function result =bis_loadbinmatrix(filename)

     handle=fopen(filename,'r');

     if handle == -1
        ff=['bis_loadbinmatrix::cannot open file ' , filename];
        disp(ff);
        result=0;
        return;
    end

    magic=fread(handle,1,'uint32');
    mode=fread(handle,1,'uint32');

    if (magic~=1970 & mode<1)
    	ff=['bis_loadbinmatrix::file ' , filename,' is not a sparse distance matrix file'];
      disp(ff);
      restult=0;
      return;
    end

    numrows=fread(handle,1,'uint32');
    numcols=fread(handle,1,'uint32');

    tp='double';

    if (mode==1)
       tp='int32';    
    elseif (mode==2)
       tp='float';
    end

    disp(['____ Reading binary matrix from ',mat2str(filename),' dims=',mat2str([numrows,numcols]),' tp=',mat2str(tp)]);
    result=transpose(fread(handle,[ numcols, numrows],tp));
    fclose(handle);
end

