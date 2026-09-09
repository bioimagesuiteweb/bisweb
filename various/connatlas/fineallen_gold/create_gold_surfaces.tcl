# Build the two labeled atlas surfaces with the legacy BioImage Suite/VTK code.
# Run this script with the `vtk` executable after sourcing setpaths.sh.

set script_dir [ file dirname [ file normalize [ info script ] ] ]
source [ file join $script_dir parameters.tcl ]

# Loading VTK alone registers the stock VTK commands, but not the BioImage
# Suite image readers and vtkpxSurfaceUtil. setpaths.sh defines BIOIMAGESUITE;
# its apps package initializes those compiled Tcl wrappers.
if { ![ info exists env(BIOIMAGESUITE) ] } {
    puts stderr "BIOIMAGESUITE is not set. Source the legacy build/setpaths.sh first."
    exit 1
}
lappend auto_path [ file join $env(BIOIMAGESUITE) apps ]
package require pxappscommon 1.0

set input_name [ file normalize [ file join $script_dir $input_image ] ]
set output_dir [ file join $script_dir output ]
file mkdir $output_dir

puts stdout "Input image: $input_name"
puts stdout "Gaussian sigma: $gaussian_xy $gaussian_xy $gaussian_z voxels"
puts stdout "Resample factor: $resample_factor"

set reader [ vtkpxAnalyzeImageSource New ]
if { [ $reader Load $input_name ] == 0 } {
    puts stderr "Failed to load $input_name"
    $reader Delete
    exit 1
}

set image [ $reader GetOutput ]
puts stdout "Dimensions: [ $image GetDimensions ]"
puts stdout "Spacing: [ $image GetSpacing ]"
puts stdout "Scalar range: [ [ [ $image GetPointData ] GetScalars ] GetRange ]"

set utility [ vtkpxSurfaceUtil New ]

foreach spec $hemisphere_specs {
    set hemisphere [ lindex $spec 0 ]
    set first_label [ lindex $spec 1 ]
    set last_label [ lindex $spec 2 ]

    puts stdout "\nExtracting $hemisphere labels $first_label through $last_label"

    set surface [ vtkPolyData New ]
    set ok [ $utility ObjectMapToPolyData $image $surface \
                 $first_label $last_label \
                 $gaussian_xy $gaussian_z $resample_factor ]

    if { $ok == 0 } {
        puts stderr "Surface extraction failed for $hemisphere"
        $surface Delete
        $utility Delete
        $reader Delete
        exit 1
    }

    set output_name [ file join $output_dir "${hemisphere}_atlas.vtk" ]
    set writer [ vtkPolyDataWriter New ]
    $writer SetInput $surface
    $writer SetFileName $output_name
    $writer SetFileTypeToASCII
    $writer Write

    puts stdout "Wrote $output_name"
    puts stdout "  points: [ $surface GetNumberOfPoints ]"
    puts stdout "  cells:  [ $surface GetNumberOfCells ]"
    puts stdout "  bounds: [ $surface GetBounds ]"
    puts stdout "  raw label range: [ [ [ $surface GetPointData ] GetScalars ] GetRange ]"

    $writer Delete
    $surface Delete
}

$utility Delete
$reader Delete

puts stdout "\nLegacy extraction complete."
exit 0
