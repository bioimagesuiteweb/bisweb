% Example

% First argument is the 4D input image (bis_image)
% Second argument is struct parameter set
%   mode=2 (band-pass) (1=high-pass, 0=low-pass)
%   low=0.008
%   high=0.2;
%   tr=1.0
%   debug=0
%
% Fourth argument is debug flag
function output=bis_butterworth(input,mode,low,high,tr,removemean)

    if nargin<6
      removemean=1;
    end

    if (nargin<5)
      tr=1.0;
    end

    if (nargin<4)
      high=0.2;
    end

    if (nargin<3)
      low=0.008;
    end

    if (nargin<2)
      mode=2;
    end

    disp(['Params: mode=',mat2str(mode),' low=',mat2str(low),' high=',mat2str(high),' tr=',mat2str(tr) ]);
    

    orig=input.getImageData();
    dim=size(orig);
    orig = reshape( orig, dim(1)*dim(2)*dim(3), dim(4));
    disp(['Reshaped=',mat2str(size(orig)) ]);

    disp(['Input max=',mat2str(min(min(min(orig)))),' : ',mat2str(max(max(max(orig))))]);

    
    
    if (removemean>0)
      mean_removed=single(orig')-single(mean(orig'));
    else
      mean_removed=orig';
    end
    
    c_low =  [ high ];
    c_high = [ low ]; 
    fs = 1/tr;

    disp(['Input mean removed=',mat2str(min(min(min(mean_removed)))),' : ',mat2str(max(max(max(mean_removed))))]);
    
    
    if (mode>0)
      ratio_high = 2*c_high/fs;
      disp([' ------- HIGH ']);
      [Bh,Ah]=butter(2, ratio_high,'high');
      disp(['B high=',mat2str(Bh)]);
      disp(['A high=',mat2str(Ah)]);
      out_high = filter(Bh, Ah, mean_removed);
      disp(['High max=',mat2str(min(min(min(out_high)))),' : ',mat2str(max(max(max(out_high))))]);
    else
      out_high=mean_removed;
    end


    if (mode ~= 1)
      ratio_low = 2*c_low/fs;
      disp([' ------- LOW ']);
      [Bl,Al]=butter(2, ratio_low,'low');
      disp(['B low=',mat2str(Bl)]);
      disp(['A low=',mat2str(Al)]);
      out_low =  filter(Bl, Al, out_high);
      disp(['Low max=',mat2str(min(min(min(out_low)))),' : ',mat2str(max(max(max(out_low))))]);
    else
      out_low=out_high;
    end


    
    bdat=reshape(out_low',dim(1),dim(2),dim(3),dim(4));
    
    output=bis_image();
    output.create(bdat,input.getSpacing(),input.getAffine());

end
