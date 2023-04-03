import numpy as np
from sklearn.preprocessing import normalize

np.set_printoptions(precision=3)
np.set_printoptions(formatter={'float': '{: 0.3f}'.format})

data = np.array([
    [100, 100],
    [300,  100],
    [200,  100]]);

data2= np.array([
    [ 10,8 ],
    [ -10,8 ],
    [ 10,8 ]]);

norm_data=normalize(data,axis=0,norm='l2');
norm_data2=normalize(data2,axis=0,norm='l2');


print('data=\n',data,'\n data2=\n',data2)
print('ndata=\n',norm_data,'\n ndata2=\n',norm_data2)

dot=np.sum(norm_data*norm_data2,axis=0)

print('dot=',dot,'\n\n');

print('Scaledot=',dot*norm_data2);


z=norm_data-dot*norm_data2;


print('z=\n',z,'\n\n');

final=(data/norm_data)*z;
print('Final=',final);
