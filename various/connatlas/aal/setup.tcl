
puts stdout "parsing setup for AAL atlas"

set surface_names { "../brainsurface/big_combo_right_2.vtk"  "../brainsurface/big_combo_left_2.vtk" }
set atlas_names { "parcels_aal_right.vtk" "parcels_aal_left.vtk" }
set output_names { "right_aal" "left_aal" }
set output_offsets { 1 1 }
set surface_points_ras 1
set distance_threshold 6.0
