# Diagnostic companion to mapparcelstosurface.tcl. It writes the temporary
# surfaces used for nearest-point queries so the JavaScript implementation can
# be checked independently of extraction and packing.

set script_dir [ file dirname [ file normalize [ info script ] ] ]
source [ file join $script_dir setup.tcl ]

for { set side 0 } { $side <= 1 } { incr side } {
    set input_name [ file join $script_dir [ lindex $surface_names $side ] ]
    set side_name [ lindex { right left } $side ]
    set output_name [ file join $script_dir output "${side_name}_smoothed_proxy.vtk" ]

    set reader [ vtkPolyDataReader New ]
    $reader SetFileName $input_name
    $reader Update

    set smoother [ vtkSmoothPolyDataFilter New ]
    $smoother SetInput [ $reader GetOutput ]
    $smoother SetNumberOfIterations 100
    $smoother SetRelaxationFactor 0.2
    $smoother Update

    set writer [ vtkPolyDataWriter New ]
    $writer SetInput [ $smoother GetOutput ]
    $writer SetFileName $output_name
    $writer SetFileTypeToASCII
    $writer Write
    puts stdout "Wrote $output_name"

    $writer Delete
    $smoother Delete
    $reader Delete
}

exit 0
