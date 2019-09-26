% Example

% First argument is the 4D input image (bis_image)
% Second argument is the mask/objetmap (bis_image)
% Third argument is struct parameter set
%    param.useradius='false';  or 'true'
%    param.radius=3.0;     used if radius=true
%    param.sparsity=0.1;   used if radius=false
%    param.numthreads=2;   number of threads to run
%
% Fourth argument is debug flag
function output=bis_imagedistancematrix(input,objectmap,param,debug)

    bispath();
    lib=biswrapper();
    

    if nargin<4
        debug=0;
    end

    if nargin<3
        param={};
    end

    output=0;
    

    output=lib.computeImageDistanceMatrixWASM(input,objectmap,param,debug);

    disp(' ');

    if (debug>0)
        disp(['____ Sparse Distance Matrix computed ',mat2str(size(output)) ]);
    end
end