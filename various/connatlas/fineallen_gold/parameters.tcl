# Parameters for the legacy VTK gold-standard build.
#
# ObjectMapToPolyData thresholds each source label independently, smooths the
# binary mask, resamples it, extracts the 50 isocontour, and appends the result.

set input_image "../fineallen/N162_finesc_symm_0.1.nii.gz"

set gaussian_xy 1.0
set gaussian_z 1.0
set resample_factor 3.0

# name, first source label, last source label, dense output-label offset.
# ObjectMapToPolyData numbers the pieces in each call from zero, so these
# offsets produce right parcels 1..224 and left parcels 225..448.
set hemisphere_specs {
    { right 1   224 1   }
    { left  501 724 225 }
}
