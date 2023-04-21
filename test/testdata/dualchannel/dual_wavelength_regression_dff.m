clear
clc

addpath /mridata2/mri_group/xilin_data/misac/mouse_atlas/
addpath /mridata2/mri_group/xilin_data/nifit_code_matlab/

N = 10;
M = 8;
T = 40;
blue_am = 10;
uv_am = 6;


blue = blue_am*randn(N, M, T);
uv = uv_am*randn(N,M,T);

blue_off = repmat( rand(N,M)*10+5, 1,1,T);
uv_off = repmat( rand(N,M)*10+5, 1,1,T);

blue_raw = blue+blue_off;
uv_raw = uv+uv_off;

res_uv = zeros(N,M,T); % only remove the centered uv

res_uv_dff = zeros(N,M,T); % remove the centered uv and divide by the mean of blue

res_uv_zero = zeros(N,M,T); % remove the centered uv and divide by the mean of blue and remove the mean of blue


for i = 1:N;
    for j = 1:M;
        cur_blue = squeeze( blue_raw(i,j,:));
        cur_uv = squeeze( uv_raw(i,j,:));
        cur_uv_centered = cur_uv - mean(cur_uv);
        b = regress(cur_blue, [cur_uv_centered, ones(T,1)]);
        
        res_uv(i,j,:) = cur_blue - cur_uv_centered*b(1);
        if(b(2)>0)
            res_uv_dff(i,j,:)= (cur_blue - cur_uv_centered*b(1))/b(2);
            res_uv_zero(i,j,:) = res_uv_dff(i,j,:)-mean(res_uv_dff(i,j,:));
        else
            disp([num2str(i),' ', num2str(j), '  temporal mean negative']);
        end
    end
end

mask_path = '/data24/mri_group/elake_data_analyses/atlases_templates/';
my_path = '/data22/mri_group/xilin_data/mouse_atlas/ca_preprocessing_testing/';
mask_nii = load_nii_gz([mask_path, 'N162_finest_224_noskip_surface_depth30_RL_diff_0.1.nii.gz'], my_path);

ss = mask_nii.hdr.dime.pixdim(2);

blue = reshape(blue, [N, M, 1, T]);
uv = reshape(uv, [N, M, 1, T]);
res_uv = reshape(res_uv, [N, M, 1, T]);
res_uv_dff = reshape(res_uv_dff, [N,M,1,T]);
res_uf_zero = reshape(res_uv_zero, [N,M,1,T]);


blue_nii = make_nii(blue_raw, [ss ss ss],[0 0 0], 16);
blue_nii.hdr.hist.sform_code = mask_nii.hdr.hist.sform_code;
blue_nii.hdr.hist.qform_code = mask_nii.hdr.hist.qform_code;
blue_nii.hdr.hist.quatern_d = mask_nii.hdr.hist.quatern_d;

blue_nii.hdr.hist.qoffset_x = mask_nii.hdr.hist.qoffset_x;
blue_nii.hdr.hist.qoffset_y = mask_nii.hdr.hist.qoffset_y;
blue_nii.hdr.hist.qoffset_z = mask_nii.hdr.hist.qoffset_z;

blue_nii.hdr.hist.srow_x = mask_nii.hdr.hist.srow_x;
blue_nii.hdr.hist.srow_y = mask_nii.hdr.hist.srow_y;
blue_nii.hdr.hist.srow_z = mask_nii.hdr.hist.srow_z;

save_nii(blue_nii, [my_path, 'blue.nii.gz']);


uv_nii = make_nii(uv_raw, [ss ss ss],[0 0 0], 16);
uv_nii.hdr.hist.sform_code = mask_nii.hdr.hist.sform_code;
uv_nii.hdr.hist.qform_code = mask_nii.hdr.hist.qform_code;
uv_nii.hdr.hist.quatern_d = mask_nii.hdr.hist.quatern_d;
uv_nii.hdr.hist.qoffset_x = mask_nii.hdr.hist.qoffset_x;

uv_nii.hdr.hist.qoffset_y = mask_nii.hdr.hist.qoffset_y;
uv_nii.hdr.hist.qoffset_z = mask_nii.hdr.hist.qoffset_z;
uv_nii.hdr.hist.srow_x = mask_nii.hdr.hist.srow_x;
uv_nii.hdr.hist.srow_y = mask_nii.hdr.hist.srow_y;
uv_nii.hdr.hist.srow_z = mask_nii.hdr.hist.srow_z;
save_nii(uv_nii, [my_path, 'uv.nii.gz']);



res_uv_nii = make_nii(res_uv, [ss ss ss],[0 0 0], 16);
res_uv_nii.hdr.hist.sform_code = mask_nii.hdr.hist.sform_code;
res_uv_nii.hdr.hist.qform_code = mask_nii.hdr.hist.qform_code;
res_uv_nii.hdr.hist.quatern_d = mask_nii.hdr.hist.quatern_d;
res_uv_nii.hdr.hist.qoffset_x = mask_nii.hdr.hist.qoffset_x;

res_uv_nii.hdr.hist.qoffset_y = mask_nii.hdr.hist.qoffset_y;
res_uv_nii.hdr.hist.qoffset_z = mask_nii.hdr.hist.qoffset_z;
res_uv_nii.hdr.hist.srow_x = mask_nii.hdr.hist.srow_x;
res_uv_nii.hdr.hist.srow_y = mask_nii.hdr.hist.srow_y;
res_uv_nii.hdr.hist.srow_z = mask_nii.hdr.hist.srow_z;
save_nii(res_uv_nii, [my_path, 'res_uv.nii.gz']);


res_uv_dff_nii = make_nii(res_uv_dff, [ss ss ss],[0 0 0], 16);
res_uv_dff_nii.hdr.hist.sform_code = mask_nii.hdr.hist.sform_code;
res_uv_dff_nii.hdr.hist.qform_code = mask_nii.hdr.hist.qform_code;
res_uv_dff_nii.hdr.hist.quatern_d = mask_nii.hdr.hist.quatern_d;
res_uv_dff_nii.hdr.hist.qoffset_x = mask_nii.hdr.hist.qoffset_x;

res_uv_dff_nii.hdr.hist.qoffset_y = mask_nii.hdr.hist.qoffset_y;
res_uv_dff_nii.hdr.hist.qoffset_z = mask_nii.hdr.hist.qoffset_z;
res_uv_dff_nii.hdr.hist.srow_x = mask_nii.hdr.hist.srow_x;
res_uv_dff_nii.hdr.hist.srow_y = mask_nii.hdr.hist.srow_y;
res_uv_dff_nii.hdr.hist.srow_z = mask_nii.hdr.hist.srow_z;
save_nii(res_uv_dff_nii, [my_path, 'res_uv_dff.nii.gz']);


res_uv_zero_nii = make_nii(res_uv_zero, [ss ss ss],[0 0 0], 16);
res_uv_zero_nii.hdr.hist.sform_code = mask_nii.hdr.hist.sform_code;
res_uv_zero_nii.hdr.hist.qform_code = mask_nii.hdr.hist.qform_code;
res_uv_zero_nii.hdr.hist.quatern_d = mask_nii.hdr.hist.quatern_d;
res_uv_zero_nii.hdr.hist.qoffset_x = mask_nii.hdr.hist.qoffset_x;

res_uv_zero_nii.hdr.hist.qoffset_y = mask_nii.hdr.hist.qoffset_y;
res_uv_zero_nii.hdr.hist.qoffset_z = mask_nii.hdr.hist.qoffset_z;
res_uv_zero_nii.hdr.hist.srow_x = mask_nii.hdr.hist.srow_x;
res_uv_zero_nii.hdr.hist.srow_y = mask_nii.hdr.hist.srow_y;
res_uv_zero_nii.hdr.hist.srow_z = mask_nii.hdr.hist.srow_z;
save_nii(res_uv_zero_nii, [my_path, 'res_uv_zero.nii.gz']);


