# Configuration consumed by ../brainsurface/mapparcelstosurface.tcl.

puts stdout "Parsing setup for the fine Allen gold-standard atlas"

source "parameters.tcl"

set surface_names {
    "output/right_atlas.vtk"
    "output/left_atlas.vtk"
}

# Use the extracted surfaces themselves as the label sources. This preserves
# the historical mouse-atlas pipeline, including its smoothed-point nearest
# lookup, while avoiding a second set of source meshes.
set atlas_names {
    "output/right_atlas.vtk"
    "output/left_atlas.vtk"
}

set output_names {
    "output/right_gold"
    "output/left_gold"
}

set output_offsets {}
foreach spec $hemisphere_specs {
    lappend output_offsets [ lindex $spec 3 ]
}

set surface_points_ras 1
set distance_threshold 36.0
