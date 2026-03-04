import numpy as np
import scipy.sparse
import scipy.sparse.linalg

import biswebpython.core.bis_objects as bis_objects


def build_similarity_matrix_from_sparse_distances(distancematrix,
                                                  smoothness=0.0,
                                                  sigma=-1.0,
                                                  n_vertices=None,
                                                  debug=False):

    if distancematrix is None or len(distancematrix.shape) != 2:
        raise ValueError('Input distance matrix must be two dimensional')

    cols = distancematrix.shape[1]
    if cols not in [3, 4]:
        raise ValueError('Input distance matrix must have 3 or 4 columns')

    rows = np.asarray(distancematrix[:, 0], dtype=np.int64).ravel() - 1
    cols = np.asarray(distancematrix[:, 1], dtype=np.int64).ravel() - 1

    if np.min(rows) < 0 or np.min(cols) < 0:
        raise ValueError('Sparse matrix indices must be one-based and positive')

    dst = np.asarray(distancematrix[:, 2], dtype=np.float64).ravel()
    if distancematrix.shape[1] == 4:
        dst = dst + float(smoothness) * np.asarray(distancematrix[:, 3], dtype=np.float64).ravel()

    if n_vertices is None:
        n_vertices = int(max(np.max(rows), np.max(cols)) + 1)
    else:
        n_vertices = int(n_vertices)

    if sigma is None or sigma <= 0.0:
        valid = dst[np.isfinite(dst) & (dst > 0.0)]
        if valid.shape[0] > 0:
            sigma = float(np.median(valid))
        else:
            sigma = 1.0

    if sigma <= 0.0:
        sigma = 1.0

    weights = np.exp(-np.square(dst / sigma))
    out = scipy.sparse.coo_matrix((weights, (rows, cols)), shape=(n_vertices, n_vertices), dtype=np.float64)
    out = out.tocsr()
    out = 0.5 * (out + out.transpose())

    if debug:
        density = float(out.nnz) / float(out.shape[0] * out.shape[1])
        print('++++ similarity matrix sigma=', sigma, ' shape=', out.shape, ' density=', density)

    return out.tocsr(), sigma


def normalized_cut_eigenvectors(W,
                                num_clusters,
                                offset=0.5,
                                maxiter=100,
                                tolerance=1e-6,
                                debug=False):

    n = W.shape[0]
    if n < 1:
        raise ValueError('Empty similarity matrix')

    k = int(min(max(1, num_clusters), n))

    d = np.asarray(np.abs(W).sum(axis=1)).ravel()
    d2 = np.asarray(W.sum(axis=1)).ravel()
    dr = 0.5 * (d - d2)
    d = d + 2.0 * float(offset)
    dr = dr + float(offset)

    Wreg = W + scipy.sparse.diags(dr, offsets=0, shape=(n, n), format='csr')
    dinvsqrt = 1.0 / np.sqrt(d + np.finfo(np.float64).eps)
    dd = scipy.sparse.diags(dinvsqrt, offsets=0, shape=(n, n), format='csr')
    pp = dd.dot(Wreg).dot(dd)
    pp = 0.5 * (pp + pp.transpose())

    if n == 1:
        eigvals = np.array([float(pp[0, 0])], dtype=np.float64)
        eigvecs = np.array([[1.0]], dtype=np.float64)
    else:
        if k >= n:
            dense_pp = pp.toarray()
            eigvals, vbar = np.linalg.eigh(dense_pp)
        else:
            v0 = np.ones(n, dtype=np.float64)
            eigvals, vbar = scipy.sparse.linalg.eigsh(pp,
                                                      k=k,
                                                      which='LA',
                                                      tol=float(tolerance),
                                                      maxiter=int(maxiter),
                                                      v0=v0)
        order = np.argsort(-eigvals)
        eigvals = np.real(np.asarray(eigvals)[order])
        vbar = np.real(np.asarray(vbar)[:, order])
        eigvecs = dd.dot(vbar)

        norm_target = np.sqrt(float(n))
        for i in range(0, eigvecs.shape[1]):
            nrm = np.linalg.norm(eigvecs[:, i])
            if nrm > np.finfo(np.float64).eps:
                eigvecs[:, i] = eigvecs[:, i] / nrm * norm_target
            if eigvecs[0, i] != 0:
                eigvecs[:, i] = -eigvecs[:, i] * np.sign(eigvecs[0, i])

    if debug:
        print('++++ computed eigenvectors shape=', eigvecs.shape, ' eigenvalues=', eigvals)

    return np.asarray(eigvecs, dtype=np.float64), np.asarray(eigvals, dtype=np.float64)


def _discretization_eigenvector_data(eigenvectors):

    n = eigenvectors.shape[0]
    labels = np.argmax(eigenvectors, axis=1)
    data = np.ones(n, dtype=np.float64)
    discrete = scipy.sparse.csr_matrix((data, (np.arange(n), labels)),
                                       shape=(n, eigenvectors.shape[1]),
                                       dtype=np.float64)
    return discrete, labels


def discretize_eigenvectors(eigenvectors,
                            random_seed=0,
                            max_discretization_iters=20,
                            debug=False):

    if eigenvectors is None or len(eigenvectors.shape) != 2:
        raise ValueError('Eigenvectors must be a two dimensional matrix')

    n, k = eigenvectors.shape
    if n < 1 or k < 1:
        raise ValueError('Eigenvectors must be non-empty')

    vecs = np.array(eigenvectors, dtype=np.float64, copy=True)
    vm = np.sqrt(np.sum(vecs * vecs, axis=1))
    vm[vm < np.finfo(np.float64).eps] = 1.0
    vecs = vecs / vm[:, np.newaxis]

    rng = np.random.RandomState(int(random_seed))
    r = np.zeros((k, k), dtype=np.float64)
    first = int(rng.randint(0, n))
    r[:, 0] = vecs[first, :]
    c = np.zeros(n, dtype=np.float64)

    for j in range(1, k):
        c = c + np.abs(np.dot(vecs, r[:, j - 1]))
        idx = int(np.argmin(c))
        r[:, j] = vecs[idx, :]

    last_objective_value = 0.0
    labels = None
    discrete = None

    for it in range(0, int(max_discretization_iters) + 1):
        rotated = np.dot(vecs, r)
        discrete, assign = _discretization_eigenvector_data(rotated)

        if labels is None:
            labels = assign.astype(np.int32) + 1

        svd_input = np.asarray(discrete.transpose().dot(vecs), dtype=np.float64)
        u, s, vt = np.linalg.svd(svd_input, full_matrices=False)
        ncut_value = 2.0 * (float(n) - np.sum(s))

        if debug:
            print('++++ discretization iter=', it, ' ncut=', ncut_value)

        if abs(ncut_value - last_objective_value) < np.finfo(np.float64).eps or it >= int(max_discretization_iters):
            last_objective_value = ncut_value
            break

        last_objective_value = ncut_value
        r = np.dot(vt.transpose(), u.transpose())

    if labels is None:
        labels = np.zeros(n, dtype=np.int32) + 1

    return discrete, labels, last_objective_value


def labels_to_indexmap_image(labels, indexmap):

    if indexmap is None:
        raise ValueError('Index map is required')

    label_vec = np.asarray(labels).ravel().astype(np.int16)
    ind_img = np.asarray(indexmap.data_array)
    flat_in = ind_img.ravel(order='C')
    flat_out = np.zeros(flat_in.shape, dtype=np.int16)
    nonzero_idx = np.flatnonzero(flat_in)

    if label_vec.shape[0] > nonzero_idx.shape[0]:
        raise ValueError('Label vector is longer than the non-zero region of the indexmap')

    flat_out[nonzero_idx[:label_vec.shape[0]]] = label_vec
    out_img = np.reshape(flat_out, ind_img.shape, order='C')

    out = bis_objects.bisImage()
    out.create(out_img, indexmap.spacing, indexmap.affine)
    return out
