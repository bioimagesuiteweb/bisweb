
puts stdout "parsing setup for fine allen atlas"

set surface_names { "right_224.vtk"  "left_224.vtk" }
set atlas_names {  "allen_right_224.vtk" "allen_left_224.vtk" }
set output_names { "output/right_allen_224" "output/left_allen_224" }
set output_offsets { 1 224 }
set surface_points_ras 1
set distance_threshold 36.0
