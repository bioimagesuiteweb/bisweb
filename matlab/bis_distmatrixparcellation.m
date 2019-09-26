% Example

% First argument is the distance matrix (sparse format)
% Second argument is the image index map (bis_image)
% Third argument is the number of clusters
% Fourth argument is Euclidean distance weight
function output=bis_distmatrixparcellation(distancematrix,indexmap,no_cluster,sm_weight)

    disp(['____ Sparse Matrix=',mat2str(distancematrix(1:3,:))]);
    indexmap.print('indexmap');

    % Compute Key parameters
    ind_img=indexmap.getImageData();

    len = double(max(max(max(ind_img))));
    disp(['____ max row number from index image=', num2str(len)]);

    sz=size(distancematrix);
    if ( sz(2)==4 ) 
        % We have a sparse matrix
        %  Create Sparse Matrix
        % 1 is SSD, 2=Euclidean 
        dst=distancematrix(:,3:3)+sm_weight*distancematrix(:,4:4);
        sigma=median(dst);
        disp(['____ sigma (sparse)=',num2str(sigma)]);
        w = sparse(distancematrix(:,1), distancematrix(:,2), exp(- (dst/sigma).^2), len, len);
        clear dst;
    else
        sigma=median(distancematrix);
        disp(['____ sigma (dense)=',num2str(sigma)]);
        w = exp(- (distancematrix/sigma).^2);
    end
       
    w=0.5*(w+transpose(w));
    disp(['____ density=', num2str(nnz(w)/prod(size(w)))]);

    disp('____ top 5x5 of W');
    full(w(1:5,1:5))
      
    % Do Clustering
    disp(['num clusters=', num2str(no_cluster)]);
    disp('Computing clustering');
    label_img = xilin_cluster_single(w,ind_img,no_cluster);

    % Max label
    v=max(max(max(label_img)));
    disp(['Max Label=',mat2str(v)]);

    output=bis_image();
    output.create(label_img,indexmap.getSpacing(),indexmap.getAffine());
end