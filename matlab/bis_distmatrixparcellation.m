% Example

% First argument is the distance matrix (sparse format)
% Second argument is the image index map (bis_image)
% Third argument is the number of clusters
% Fourth argument is Euclidean distance weight
function output=bis_distmatrixparcellation(distancematrix,indexmap,no_cluster,sm_weight)

    sparseI=distancematrix(:,1:2);
    sparseM=distancematrix(:,3:4);

    disp(['Sparse Matrix=',mat2str(sparseI(1:3,:)),' ', mat2str(sparseM(1:3,:))]);
    indexmap.print('indexmap');

    % Compute Key parameters
    ind_img=indexmap.getImageData();

    len = double(max(max(max(ind_img))));
    disp(['____ max row number from index image=', num2str(len)]);

    %  Create Sparse Matrix
    % 2 is SSD, 3=Euclidean 1=sum
    size(sparseM)
    
    a=sparseM(:,1:1)+sm_weight*sparseM(:,2:2);
    sigma=median(a);

    disp(['____ sigma=',num2str(sigma)]);
    w = sparse(sparseI(:,1), sparseI(:,2), exp(- (a/sigma).^2), len, len);
    w=w+w';
    disp(['density=', num2str(nnz(w)/prod(size(w)))]);

    disp('top 5x5');
    full(w(1:5,1:5))

    clear sparseM;
    clear sparseI;


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