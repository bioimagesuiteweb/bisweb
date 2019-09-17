% Example
% xcluster('/home/xenios/var/xilin/test',30,0.1,'../001labelmap.hdr');
% 
% First argument is fall path of input stem
%
%   _sparse_ind.binx is binary indices (int32) 
%   _sparse_val.binx is binary values  (float)
%   _indexmap.nii.gz is indexmap image  (float)
%
% Second argument is number of clusters
% Third argument is Euclidean distance weight
% Four argument is output image file to save cluster image

function out=xcluster(fname,no_cluster,sm_weight,outname)

% Read indices
sparseI=binload_xp([ fname '_sparse_ind.binx']);
disp(['first three rows of sparseI, size=', num2str(size(sparseI))])
sparseI(1:3,:)

% Read values
sparseM=binload_xp([ fname '_sparse_val.binx']);
disp(['first three rows of sparseM, size=', num2str(size(sparseM))])
sparseM(1:3,:)

% Read index image
disp(['reading nii_gz from ',[fname '_indexmap.nii.gz']]);
index_nii=load_nii_gz([fname '_indexmap.nii.gz'], '/tmp');
ind_img = index_nii.img;
spa=index_nii.hdr.dime.pixdim(:,2:4);
disp(['spacing = ', num2str(spa)]);
clear index_nii;
% 

% Compute Key parameters
len = double(max(max(max(ind_img))));
disp(['max row number from index image=', num2str(len)]);

%  Create Sparse Matrix
% 2 is SSD, 3=Euclidean 1=sum
a=sparseM(:,2)+sm_weight*sparseM(:,3);
sigma=median(a);
disp(['sigma=',num2str(sigma)]);
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

% Save Output
disp(['Saving image in ',outname]);
yu_analyzew(label_img,outname,size(label_img),spa,4);

% Clean up and go home
v=max(max(max(label_img)));
out=v;
disp(['Image saved in ',outname,' max cluster no=', num2str(out)]);
end