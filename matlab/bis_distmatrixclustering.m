% Example

% First argument is the distance matrix (sparse format)
% Second argument is the number of clusters
function output=bis_distmatrixclustering(distancematrix,no_cluster)

  disp(['____ Sparse Matrix=',mat2str(distancematrix(1:3,:))]);
  len = double(max(distancematrix(:,1)));

  
  dst=distancematrix(:,3:3);
  sigma=median(dst);
  
  disp(['____ sigma (sparse)=',num2str(sigma), ' numsubjects=',num2str(len)]);
  w = sparse(distancematrix(:,1), distancematrix(:,2), exp(- (dst/sigma).^2), len, len);
  clear dst;
  
  w=0.5*(w+transpose(w));
  disp(['____ density=', num2str(nnz(w)/prod(size(w)))]);
  
  disp('____ top 3x3 of W');
  full(w(1:3,1:3))
  
                                % Do Clustering
  disp(['num clusters=', num2str(no_cluster)]);
  disp('Computing clustering');
  
  disp('Computing Eigenvectors');
  [Eigenvectors,Eigenvalues, vbar] = xilin_raw().my_ncut(w,no_cluster);
  disp('Discretizing Eigenvectors');
  [Discrete, oEigenvectors, ini_label, ncvalue] = xilin_raw().discretisation(Eigenvectors(:, 1:no_cluster));
  
  output=ini_label;

  return

% ----------------------------------------------------------------------------------------

