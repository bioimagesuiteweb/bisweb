
puts stdout "parsing setup for 368 atlas"

set surface_names { "../brainsurface/lobes_right.vtk"  "../brainsurface/lobes_left.vtk" }
set atlas_names {  "parcels_368_right.vtk" "parcels_368_left.vtk" }
set output_names { "output/right_368" "output/left_368" }
set output_offsets { 1 1 }
set surface_points_ras 0
set distance_threshold 36.0
