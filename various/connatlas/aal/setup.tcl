
puts stdout "parsing setup for AAL atlas"

set surface_names { "../brainsurface/lobes_right.vtk"  "../brainsurface/lobes_left.vtk" }
set atlas_names { "parcels_aal_right.vtk" "parcels_aal_left.vtk" }
set output_names { "output/right_aal" "output/left_aal" }
set output_offsets { 1 1 }
set surface_points_ras 1
set distance_threshold 12.0
