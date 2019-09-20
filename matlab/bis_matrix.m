% Read and Write binmatr sparse matrix format
% -------------------------------------------
function module=bis_matrix()

    module.loadbinary=@loadbinmatrix;
    module.savebinary=@savebinmatrix;
    
    function result =loadbinmatrix(filename)
    
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
           tp='int64';    
        elseif (mode==2)
           tp='float';
        end
    
        disp(['____ Reading binary matrix from ',mat2str(filename),' dims=',mat2str([numrows,numcols]),' tp=',mat2str(tp)]);
        result=transpose(fread(handle,[ numcols, numrows],tp));
        fclose(handle);
    end

    function result =savebinmatrix(filename,mat)
    
         handle=fopen(filename,'w');
    
         if handle == -1
            ff=['bis_savebinmatrix::cannot open file ' , filename];
            disp(ff);
            result=0;
            return;
        end

        d=size(mat);
        mode=3;
        tp='double';
        if isa(mat,'int64')
           mode=1;
           tp='int64'
        elseif isa(mat,'single')
           mode=2;
           tp='single'
        end

        header=[1970, mode, d(1), d(2) ];
        fwrite(handle,header,'uint32')
        fwrite(handle,transpose(mat),tp)
        fclose(handle);
        disp(['____ Saved binary matrix from', mat2str(filename),' dims=',mat2str(d),' tp=',mat2str(tp)]);
    end
   
end