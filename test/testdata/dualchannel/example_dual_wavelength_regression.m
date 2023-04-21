clear
clc

addpath /mridata2/mri_group/xilin_data/misac/mouse_atlas/
addpath /mridata2/mri_group/xilin_data/nifit_code_matlab/

N = 10;
M = 8;
T = 40;
blue = randn(N, M, T);
uv = randn(N,M,T);

res = randn(N,M,T);
for i = 1:N;
    for j = 1:M;
        cur_blue = squeeze( blue(i,j,:));
        cur_uv = squeeze( uv(i,j,:));
        [~,~,res(i,j,:)] = regress(cur_blue, cur_uv);
    end
end

mask_path = '/data24/mri_group/elake_data_analyses/atlases_templates/';
my_path = '/data22/mri_group/xilin_data/mouse_atlas/ca_preprocessing_testing/';
mask_nii = load_nii_gz([mask_path, 'N162_finest_224_noskip_surface_depth30_RL_diff_0.1.nii.gz'], my_path);

ss = mask_nii.hdr.dime.pixdim(2);

blue = reshape(blue, [N, M, 1, T]);
uv = reshape(uv, [N, M, 1, T]);
res = reshape(res, [N, M, 1, T]);


blue_nii = make_nii(blue, [ss ss ss],[0 0 0], 16);
blue_nii.hdr.hist.sform_code = mask_nii.hdr.hist.sform_code;
blue_nii.hdr.hist.qform_code = mask_nii.hdr.hist.qform_code;
blue_nii.hdr.hist.quatern_d = mask_nii.hdr.hist.quatern_d;

blue_nii.hdr.hist.qoffset_x = mask_nii.hdr.hist.qoffset_x;
blue_nii.hdr.hist.qoffset_y = mask_nii.hdr.hist.qoffset_y;
blue_nii.hdr.hist.qoffset_z = mask_nii.hdr.hist.qoffset_z;

blue_nii.hdr.hist.srow_x = mask_nii.hdr.hist.srow_x;
blue_nii.hdr.hist.srow_y = mask_nii.hdr.hist.srow_y;
blue_nii.hdr.hist.srow_z = mask_nii.hdr.hist.srow_z;

save_nii(blue_nii, [my_path, 'blue_test.nii.gz']);


uv_nii = make_nii(uv, [ss ss ss],[0 0 0], 16);
uv_nii.hdr.hist.sform_code = mask_nii.hdr.hist.sform_code;
uv_nii.hdr.hist.qform_code = mask_nii.hdr.hist.qform_code;
uv_nii.hdr.hist.quatern_d = mask_nii.hdr.hist.quatern_d;
uv_nii.hdr.hist.qoffset_x = mask_nii.hdr.hist.qoffset_x;

uv_nii.hdr.hist.qoffset_y = mask_nii.hdr.hist.qoffset_y;
uv_nii.hdr.hist.qoffset_z = mask_nii.hdr.hist.qoffset_z;
uv_nii.hdr.hist.srow_x = mask_nii.hdr.hist.srow_x;
uv_nii.hdr.hist.srow_y = mask_nii.hdr.hist.srow_y;
uv_nii.hdr.hist.srow_z = mask_nii.hdr.hist.srow_z;
save_nii(uv_nii, [my_path, 'uv_test.nii.gz']);



res_nii = make_nii(res, [ss ss ss],[0 0 0], 16);
res_nii.hdr.hist.sform_code = mask_nii.hdr.hist.sform_code;
res_nii.hdr.hist.qform_code = mask_nii.hdr.hist.qform_code;
res_nii.hdr.hist.quatern_d = mask_nii.hdr.hist.quatern_d;
res_nii.hdr.hist.qoffset_x = mask_nii.hdr.hist.qoffset_x;

res_nii.hdr.hist.qoffset_y = mask_nii.hdr.hist.qoffset_y;
res_nii.hdr.hist.qoffset_z = mask_nii.hdr.hist.qoffset_z;
res_nii.hdr.hist.srow_x = mask_nii.hdr.hist.srow_x;
res_nii.hdr.hist.srow_y = mask_nii.hdr.hist.srow_y;
res_nii.hdr.hist.srow_z = mask_nii.hdr.hist.srow_z;
save_nii(res_nii, [my_path, 'res_test.nii.gz']);





