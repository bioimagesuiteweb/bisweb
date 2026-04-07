# Connectivity Atlas Surface Files

This directory contains scripts and intermediate files used to build the brain-surface atlas files consumed by the connectivity viewer.

The final packaged surface object is stored as a gzipped binary file with a name like:

- `268_surface_atlas.bin.gz`
- `368_surface_atlas.bin.gz`
- `aal_surface_atlas.bin.gz`
- `allen_172_surface_atlas.bin.gz`
- `allen_coarse_surface_atlas.bin.gz`
- `allen_interm_surface_atlas.bin.gz`

These files are referenced from the atlas metadata under `web/images/atlases/*.json` and loaded by the connectivity control code.

## Build overview

The old workflow from `README.txt` is:

1. Make atlas RAS
2. Extract surfaces using old BioImage Suite surface control
3. Save VTK
4. Edit `setup.json` and `setup.tcl`
5. `mkdir output`
6. `vtk ../brainsurface/mapparcelstosurface.tcl`
7. `node ../brainsurface/combinelobes.js`

## Pipeline

### 1. Map parcels to surface vertices

`brainsurface/mapparcelstosurface.tcl` reads:

- a left/right surface mesh
- a left/right atlas mesh with parcel labels

For each surface vertex it finds the nearest atlas point and transfers the parcel id. It writes per-hemisphere JSON with:

- `points`: flattened xyz coordinates
- `indices`: parcel id for each vertex
- `triangles`: flattened triangle vertex indices

### 2. Combine hemispheres and pack binary output

`brainsurface/combinelobes.js` reads the left/right JSON files and packs them into a single binary blob, then writes it as `*.bin.gz`.

This is the file format parsed by:

- `js/coreweb/bisweb_connectivityvis3d.js`

and loaded by:

- `js/webcomponents/bisweb_connectivitycontrolelement.js`

## Binary format

After gunzipping, the file is a flat binary buffer:

1. global magic number
2. right hemisphere block
3. left hemisphere block

At runtime, the reader stores these as `0 = left`, `1 = right`.

### Global header

The first 4 bytes are a `uint32` magic number:

- `1702`: surface geometry plus parcel labels
- `1703`: surface geometry only, no parcel labels

### Per-hemisphere block

Each hemisphere begins with four `uint32` values:

1. `numelements`
2. `maxpoint`
3. `numpoints`
4. `numtriangles`

These are followed by:

1. `numelements` point arrays
2. one triangle array
3. optionally one parcel array

### Point arrays

Each point array is:

- type: `float32`
- length: `numpoints * 3`

The coordinates are flattened:

`x0, y0, z0, x1, y1, z1, ...`

`numelements` is the number of stored geometry resolutions for the same mesh topology. In the packing script these are taken from keys such as:

- `points`
- `points1`
- `points2`
- `points3`

### Triangle array

The triangle array is:

- type: `uint32`
- length: `numtriangles * 3`

It is a flat list of vertex indices:

`v0, v1, v2, v3, v4, v5, ...`

### Parcel array

If the magic number is `1702`, the hemisphere block ends with:

- type: `uint32`
- length: `numpoints`

This stores one parcel id per vertex. The connectivity viewer uses these values to color the mesh by parcel/network/connectivity statistics.

## Compact spec

```text
SurfaceAtlasBinGz := gzip(
  uint32 magic,
  HemisphereBlock right,
  HemisphereBlock left
)

HemisphereBlock :=
  uint32 numelements
  uint32 maxpoint
  uint32 numpoints
  uint32 numtriangles
  float32 points[numelements][numpoints*3]
  uint32 triangles[numtriangles*3]
  if magic == 1702:
    uint32 parcels[numpoints]
```

## Relationship to connectivity parcellations

The surface atlas binary is not the same thing as the parcellation definition loaded into `BisParcellation`.

The connectivity application uses two related assets:

1. a parcellation file for node centers, ordering, and attributes
2. a binary surface atlas file for mesh geometry and per-vertex parcel ids

The binary surface atlas provides the 3D cortical rendering. The parcellation file provides the node definitions used for matrices, node labels, and ROI metadata.
