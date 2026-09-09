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

The validated reference has also been promoted into the connectivity viewer as:

`../../../web/images/allen_fine_surface_atlas.bin.gz`

The two ASCII diagnostic surfaces will be:

- `output/right_atlas.vtk`
- `output/left_atlas.vtk`

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
  --reference web/images/allen_fine_surface_atlas.bin.gz
```

Add `--vtk-prefix /tmp/allen_fine_js` to also write ASCII diagnostic files.
The defaults reproduce the Fine parameters: sigma 1 voxel, resampling factor
3, source ranges 1:224 and 501:724, and dense output labels 1:448.

The JavaScript implementation reproduces the legacy extraction counts for
every individual ROI (not just the totals): each hemisphere has 15,478 points
and 29,596 triangles. VTK and JavaScript discover the same mesh vertices in a
different order, so the generated packed file is structurally equivalent but
not byte-for-byte identical to the promoted legacy gold file.
