# Fine Allen legacy gold-standard build

This directory generates a reference surface for the 448-region fine mouse
atlas using the old BioImage Suite VTK implementation. It is intentionally
kept separate from `fineallen/` so that the incomplete earlier attempt remains
untouched.

The input image is used in place from:

`../fineallen/N162_finesc_symm_0.1.nii.gz`

The build has three stages:

1. extract right and left ROI surfaces with `vtkpxSurfaceUtil::ObjectMapToPolyData`;
2. reproduce the historical smoothed-point/nearest-point parcel mapping;
3. pack the two hemispheres into the connectivity viewer's gzipped binary format.

## Run

Start XQuartz and wait for it to finish launching. The legacy `setpaths.sh`
uses Bash syntax, so start a Bash subshell in a new Terminal window and run:

```bash
exec bash
cd /Users/xenios/bisweb/src/various/connatlas/fineallen_gold
source /Users/xenios/legacy/trunk3/build/setpaths.sh
vtk create_gold_surfaces.tcl 2>&1 | tee output/01_extract.log
vtk ../brainsurface/mapparcelstosurface.tcl 2>&1 | tee output/02_map.log
node ../brainsurface/combinelobes.js 2>&1 | tee output/03_pack.log
node validate_gold.js | tee output/04_validate.log
vtk write_smoothed_proxies.tcl 2>&1 | tee output/05_smoothing.log
```

The final reference file will be:

`output/allen_fine_surface_atlas_gold.bin.gz`

The historical LPS reference is retained for regression comparisons. The
connectivity viewer instead uses the RAS, adaptive-resolution surface at:

`../../../web/images/allen_fine_surface_atlas.bin.gz`

The two ASCII diagnostic surfaces will be:

- `output/right_atlas.vtk`
- `output/left_atlas.vtk`

The current RAS, factor-2 adaptive runtime extraction is retained as:

- `output/right_ras_adaptive2.vtk`
- `output/left_ras_adaptive2.vtk`

Expected final parcel numbering is dense:

- right hemisphere: 1 through 224
- left hemisphere: 225 through 448

The extraction settings are isolated in `parameters.tcl`. The initial values
mirror the old object-map surface-control defaults: Gaussian sigma 1 voxel in
each direction, resampling factor 3, and the fixed contour level 50 used by
`ObjectMapToPolyData`.

## Quick checks

After the commands finish, check that the final file exists and review the
reported point, cell, source-label, output-label, and `numbad` counts:

```bash
ls -lh output/allen_fine_surface_atlas_gold.bin.gz
grep -E "points:|cells:|raw label range:|Output Range|numbad" output/*.log
cat output/04_validate.log
```

Please send the three log files, or paste the quick-check output, if a stage
fails or if its counts differ substantially from the existing fine surfaces.

## JavaScript replacement

The application itself does not import the generator. The Fine menu item is
defined by `web/images/atlases/mouseallenmri.json`, just like the existing
mouse atlases. The standalone JavaScript replacement can regenerate a packed
surface directly from the labeled NIfTI image:

```bash
cd /Users/xenios/bisweb/src
node js/scripts/createconnectivitysurfacefromimage.js \
  --input web/images/allen_fine.nii.gz \
  --output /tmp/allen_fine_js.bin.gz \
  --centered-resampling \
  --adaptive \
  --skip-nearest \
  --reference web/images/allen_fine_surface_atlas.bin.gz
```

Add `--vtk-prefix /tmp/allen_fine_js` to also write ASCII diagnostic files.
The runtime extraction starts with sigma 1 voxel and resampling factor 2 for
each ROI. `--centered-resampling` centers the factor-2 grid on the image so
paired regions use the same sampling phase. With `--adaptive`, only an ROI
that would disappear is retried with
less smoothing and, when necessary, a denser sampling grid. `--skip-nearest`
preserves each extracted component's known parcel label instead of allowing
the historical nearest-point pass to erase very small parcels. Source and
output labels are both dense: right 1:224 and left 225:448.

The preserved legacy source image at
`various/connatlas/fineallen/N162_finesc_symm_0.1.nii.gz` instead uses left
labels 501:724 and is stored as LPS. To reproduce the historical extraction,
add `--left-range 501:724 --resample 3 --native-orientation`; the output labels
remain 1:448.

With the legacy settings, the JavaScript implementation reproduces the old
per-ROI extraction counts. The RAS runtime surface deliberately differs: it
uses factor 2 plus adaptive fallback so that all 224 regions per hemisphere
remain represented.
