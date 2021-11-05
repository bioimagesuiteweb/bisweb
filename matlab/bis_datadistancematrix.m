% Example

% First argument is the data matrix (row=subjects, columns=attributes)
% Second argument is the sparsity, default=0.1
% Third argument is debug flag
function output=bis_datadistancematrix(input,sparsity,debug)


    if nargin<3
        debug=0;
    end

    if nargin<2
      sparsity=0.1
    end

    output=0;
    

    distmatrix=squareform(pdist(input));

    if (debug>0)
      disp(['____ Sparse Distance Matrix computed ',mat2str(size(distmatrix))]);
    end

    num=size(distmatrix);
    numrows=num(1,1);
    kthreshold=round(numrows*sparsity+0.9999);
    if (kthreshold<2)
      kthreshold=2;
    end

    
    if (debug>0)
      disp(['____ Num Elements=',mat2str(numrows),' kthreshold=',mat2str(kthreshold)]);
    end

    output=zeros(numrows*kthreshold,3);
    outrow=1;

    for r=1:numrows

      srt=sort(distmatrix(r,:));
      thr=srt(kthreshold);
      
      if (debug>1)
        disp(['Row = ',num2str(r),' ',mat2str(srt),' numel=',num2str(kthreshold), ' threshold=',num2str(thr)]);
      end
      
      for c=1:numrows

        if distmatrix(r,c) <= thr
          output(outrow,1)=r;
          output(outrow,2)=c;
          output(outrow,3)=distmatrix(r,c);
          outrow=outrow+1;
      end
    end
    
      
    

end
