
puts stdout "parsing setup for 368 atlas"

set surface_names { "../brainsurface/big_combo_right_2.vtk"  "../brainsurface/big_combo_left_2.vtk" }
set atlas_names { "parcels_368_right.vtk" "parcels_368_left.vtk" }
set output_names { "right_368" "left_368" }
set output_offsets { 1 1 }
set surface_points_ras 0
set distance_threshold 60.0
