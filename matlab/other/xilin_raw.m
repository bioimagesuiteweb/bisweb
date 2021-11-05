
function moduleOutput= xilin_raw()


  moduleOutput.my_ncut=@my_ncut;
  moduleOutput.discretisation=@discretisation;
  moduleOutput.discretisationEigenVectorData=@discretisationEigenVectorData;
  return

  function [Eigenvectors,Eigenvalues, vbar] = my_ncut(W,nbEigenValues,dataNcut)
    % function [Eigenvectors,Eigenvalues] = my_ncut(W,nbEigenValues,dataNcut);
    % 
    % Input:
    %     W= symmetric similarity matrix
    %     nbEigenValues=  number of Ncut eigenvectors computed
    %     dataNcut= optional parameters
    %
    %     default parameters for dataNcut:
    %     dataNcut.offset = 5e-1; offset in the diagonal of W
    %     dataNcut.verbose = 0; 0 for verbose off mode, 1,2,3 for verbose on modes
    %     dataNcut.maxiterations = 100; max number of iterations in eigensolver
    %     dataNcut.eigsErrorTolerance = 1e-6; error tolerance in eigensolver
    %     dataNcut.valeurMin=1e-6; % truncates any values in W less than valeurMin
    % 
    % Output: 
    %    Eigenvectors= continuouse Ncut eigenvectos, size = length(W) x nbEigenValues
    %    Eigenvalues= Ncut eigenvalues, size = 1x nbEigenValues
    %
    % Timothee Cour, Stella Yu, Jianbo Shi, 2004.
    % Originally made available "This software is made publicly for research use only. It may be modified and redistributed under the terms of the GNU General Public License."
    %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    %     Normalized Cut Segmentation Code                              %
    %						                                            %	
    %  Timothee Cour (INRIA), Stella Yu (Berkeley), Jianbo Shi (UPENN)  %
    %     						                                        %
    %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
        
    if nargin < 2
        nbEigenValues = 8;
    end
    if nargin < 3
        dataNcut.offset = 5e-1;
        dataNcut.verbose = 0;
        dataNcut.maxiterations = 100;
        dataNcut.eigsErrorTolerance = 1e-6;
        dataNcut.valeurMin=1e-6;    
        dataNcut.stopmid = 0;
        dataNcut.sysm = 1;
    end
    
    % % make W matrix sparse
    % W = sparsifyc(W,dataNcut.valeurMin);
    
    % check for matrix symmetry
    if max(max(abs(W-W'))) > 1e-10 %voir (-12) 
        disp(max(max(abs(W-W'))));
        % error('W not symmetric');
    end
    
    n = size(W,1);
    nbEigenValues = min(nbEigenValues,n);
    offset = dataNcut.offset;
    
    
    % degrees and regularization
    d = sum(abs(W),2);
    dr = 0.5 * (d - sum(W,2));
    d = d + offset * 2;
    dr = dr + offset;
    W = W + spdiags(dr,0,n,n);
    
    Dinvsqrt = 1./sqrt(d+eps);
    DD = spdiags(Dinvsqrt, 0, n, n);
    if( dataNcut.sysm ==1)
        P = DD*W*DD; % normalize the weight matrix
    else
        PP = DD*W*DD; % normalize the weight matrix
    end
    
    clear W DD d dr;
    
    if( dataNcut.sysm ==1)
        % force symmetry to precision
        [lI lJ lV] = find(P);   
        % calculate the corresponding indices
        o_ind = sub2ind([n,n], lI, lJ);
        t_ind = sub2ind([n,n], lJ, lI);
        
        [sort_o_ind, o_I] = sort(o_ind); clear sort_o_ind;
        [sort_t_ind, t_I] = sort(t_ind); clear sort_t_ind t_ind;
           
        tV = (lV(o_I) + lV(t_I))/2;
        clear t_I;
        len = length(lV);
        
        VV = zeros(1, len);
        VV(o_I) = tV;
        clear tV lV
        PP = sparse(lI,lJ,VV,n,n,length(lI));
        clear lI lJ VV;
    end
    
    options.issym = 1;
         
    if dataNcut.verbose
        options.disp = 3; 
    else
        options.disp = 0; 
    end
    options.maxit = dataNcut.maxiterations;
    options.tol = dataNcut.eigsErrorTolerance;
    
    % if( dataNcut.sysm ==1)
        % options.v0 = ones(size(P,1),1);
    % else
        options.v0 = ones(size(PP,1),1);
    % end
    options.p = max(35,2*nbEigenValues); %voir
    options.p = min(options.p,n);
    
    warning off
    [vbar,s] = eigs(PP,nbEigenValues,'LA',options); 
    warning on
    
    s = real(diag(s));
    [x,y] = sort(-s); 
    Eigenvalues = -x;
    vbar = vbar(:,y);  % the second dimension is the number of eigen values
    
    if( dataNcut.stopmid==0)
        Eigenvectors = spdiags(Dinvsqrt,0,n,n) * vbar;
    
        for  i=1:size(Eigenvectors,2)
            Eigenvectors(:,i) = (Eigenvectors(:,i) / norm(Eigenvectors(:,i))  )*norm(ones(n,1));
            if Eigenvectors(1,i)~=0
                Eigenvectors(:,i) = - Eigenvectors(:,i) * sign(Eigenvectors(1,i));
            end
        end
    else
        Eigenvectors =  vbar;
    end
    

  end
    
% ----------------------------------------------------------------------------------------
  function [EigenvectorsDiscrete,EigenVectors, ini_label, lastObjectiveValue]=discretisation(EigenVectors)
    % 
    % EigenvectorsDiscrete=discretisation(EigenVectors)
    % 
    % Input: EigenVectors = continuous Ncut vector, size = ndata x nbEigenvectors 
    % Output EigenvectorsDiscrete = discrete Ncut vector, size = ndata x nbEigenvectors
    %
    % Timothee Cour, Stella Yu, Jianbo Shi, 2004
    
    [n,k]=size(EigenVectors);
    
    vm = sqrt(sum(EigenVectors.*EigenVectors,2));
    EigenVectors = EigenVectors./repmat(vm,1,k);
    
    
    % generate the R matrix by random initialization
    R=zeros(k);
    R(:,1)=EigenVectors(1+round(rand(1)*(n-1)),:)';
    c=zeros(n,1);
    for j=2:k
        c=c+abs(EigenVectors*R(:,j-1));
        [minimum,i]=min(c);
        R(:,j)=EigenVectors(i,:)';
    end
    % the number of column in R is the same as the number of clusters
    
    lastObjectiveValue=0;
    exitLoop=0;
    nbIterationsDiscretisation = 0;
    nbIterationsDiscretisationMax = 20;%voir
    
    ini = 0;
    
    while exitLoop== 0 
        nbIterationsDiscretisation = nbIterationsDiscretisation + 1 ;
        % assign the labels by maximum suppression
        EigenvectorsDiscrete = discretisationEigenVectorData(EigenVectors*R);  % binary matrix
        
        % this part was added to the code to get the initial labeling 
        if(ini ==0)
            ini_label = zeros(1,n);
            for i=1:n;
                ini_label(i) = find(EigenvectorsDiscrete(i,:));
            end
            ini=1;
        end    
        %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
        
        
        % calculate the R matrix
        [U,S,V] = svd(EigenvectorsDiscrete'*EigenVectors,0);    
        NcutValue=2*(n-trace(S));
        
        if abs(NcutValue-lastObjectiveValue) < eps | nbIterationsDiscretisation > nbIterationsDiscretisationMax
            exitLoop=1;
        else
            lastObjectiveValue = NcutValue;
            R=V*U';
        end
    end

  end
% ----------------------------------------------------------------------------------------
    
  function Y = discretisationEigenVectorData(EigenVector)
               % Y = discretisationEigenVectorData(EigenVector)
    %
    % discretizes previously rotated eigenvectors in discretisation
    % Timothee Cour, Stella Yu, Jianbo Shi, 2004
    
    [n,k]=size(EigenVector);
    
    
    [Maximum,J]=max(EigenVector');
     
    Y=sparse(1:n,J',1,n,k);    
  end

end
    
    
    
