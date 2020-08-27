
puts stdout "\n\n"

source "setup.tcl"

puts stdout "Read surface_names      =${surface_names}"
puts stdout "     atlas_names        =${atlas_names}"
puts stdout "     output_names       =${output_names}"
puts stdout "     output_offsets     =${output_offsets}"
puts stdout "     surface_points_ras =${surface_points_ras}"
puts stdout "     distance_threshold =${distance_threshold}"

set dthr2 [ expr $distance_threshold * $distance_threshold ]

for { set j 0 } { $j <= 1 } { incr j } {

    set name [ lindex ${surface_names} $j ]
    set oname [ lindex ${output_names} $j ]
    set aname [ lindex ${atlas_names} $j ]
    set offset [ lindex ${output_offsets} $j ]

    set r [ vtkPolyDataReader New ]
    $r SetFileName $name
    $r Update

    set n [ [ $r GetOutput ] GetNumberOfPoints ]

#    puts stdout "Cleaning $name"
#    set cl [ vtkCleanPolyData New ]
#    $cl SetInput [ $r GetOutput ]
#    $cl Update
    
    set at [ vtkPolyDataReader New ]
    $at SetFileName $aname
    $at Update
    
    set sur [ $r  GetOutput ]
    set atl [ $at GetOutput ]

    set filter [ vtkSmoothPolyDataFilter New ]
    $filter SetInput $sur
    $filter SetNumberOfIterations 100
    $filter SetRelaxationFactor 0.2
    $filter Update


    puts stdout "\n-------------------------------\n Reading step [ expr $j+1] /2 "
    puts stdout "MultiRes Surface: $name Points = [ $sur GetNumberOfPoints ] , [ $sur GetNumberOfCells ]   (orig=$n)"
    puts stdout "Atlas           : $aname Points = [ $atl GetNumberOfPoints ] , [ $atl GetNumberOfCells ]\n"
    
    set dat [ vtkShortArray New ]
    $dat SetNumberOfTuples [ $sur GetNumberOfPoints ]
    
    set idat [ [ $atl GetPointData ] GetScalars ]
    puts stdout "Atlas Range : [ $idat GetRange ] offset=$offset"
    set np [ $sur GetNumberOfPoints ]     
    set numbad 0
    for { set i 0 } { $i < $np } { incr i } { 

        set pt [ [ $filter GetOutput ] GetPoint $i ]
        if { $surface_points_ras > 0 } {
            set lps_pt $pt 
        } else {
            set lps_pt [ list [ expr 180.0 - [ lindex $pt 0 ] ] [ expr 216.0 - [  lindex $pt 1 ] ] [ lindex $pt 2 ] ]
        }
        if { $i ==0 || $i == int($np/3) } { puts stdout "Mapping $pt --> $lps_pt"  }
        # Map LPS to RAS
        set index [ $atl FindPoint [ lindex $lps_pt 0 ]  [  lindex $lps_pt 1 ]  [ lindex $lps_pt 2 ] ]
        if { $i ==0 || $i == int($np/3) } { puts stdout "\t Index = $index" }
        
        set atl_pt [ [ $atl GetPoints ] GetPoint $index ]
        if { $i ==0 } { puts stdout "\t Atlas Point = $atl_pt" }

        
        set dist2 0.0
        for { set c 0 } { $c <=2 } { incr c } {
            set d [ expr [ lindex $lps_pt $c ] - [  lindex $atl_pt $c ] ]
            set dist2 [ expr $dist2 + $d*$d ]
        }

        if { $i ==0 } { puts stdout "\t Distance2 = $dist2 (thr=$dthr2)" }

        
        if { $dist2 < $dthr2 } {
            set val [ expr [ $idat GetComponent $index 0 ] + $offset ]
            $dat SetComponent $i 0 $val
        } else {
            $dat SetComponent $i 0 0
            incr numbad
        }
    }

    $dat Modified
    puts stdout "Output Range = [ $dat GetRange ], numbad=$numbad, numpoints = $np"
    
    [ $sur GetPointData ] SetScalars $dat

    
    set n2 "${oname}.json"
    puts stdout "Saving in ${n2}"
    
    set fout [ open $n2 w ]
    puts -nonewline $fout "\{\n\t \"points\" : \[ "
    for { set i 0 } { $i < $np } { incr i } {
        set pt [ $sur GetPoint $i ]
        if { $i > 0 } {
            puts -nonewline $fout ","
        }
        puts -nonewline $fout "[ lindex $pt 0],[ lindex $pt 1],[ lindex $pt 2]"
    }

    puts $fout "\],"
    puts -nonewline $fout "\t \"indices\" : \[ "
    for { set i 0 } { $i < $np } { incr i } {
        if { $i > 0 } {
            puts -nonewline $fout ","
        }
        puts -nonewline $fout "[ expr int([ $dat GetComponent $i 0 ])]"
    }
    puts $fout "\],"
    set dat [ [ $sur GetPolys ] GetData ]
    puts -nonewline $fout "\t \"triangles\" : \[ "
    set nc [ $sur GetNumberOfCells ]
    set index 0
    for { set i 0 } { $i < $nc } { incr i } {
        if { $i > 0 } {
            puts -nonewline $fout ","
        }
        incr index
        puts -nonewline $fout "[ expr int([ $dat GetComponent $index 0 ])],"
        incr index
        puts -nonewline $fout "[ expr int([ $dat GetComponent $index 0 ])],"
        incr index
        puts -nonewline $fout "[ expr int([$dat GetComponent $index 0 ])]"
        incr index
    }
    puts $fout "\]"
    
    puts $fout "\}"
    close $fout

    set n3 "${oname}.vtk"

    set w [ vtkPolyDataWriter New ]
    $w SetInput $sur
    $w SetFileName $n3
    $w Write
    $w Delete

}


exit
