
set lst { "right_3.vtk"  "left_3.vtk" }
set atln { "parcels_right.vtk" "parcels_left.vtk" }
set offsets { 1  133 }

for { set j 0 } { $j <= 1 } { incr j } {

    set name [ lindex $lst $j  ]
    set aname [ lindex $atln $j ]
    set offset [ lindex $offsets $j ]

    set r [ vtkPolyDataReader New ]
    $r SetFileName $name
    $r Update
    
    set at [ vtkPolyDataReader New ]
    $at SetFileName $aname
    $at Update
    
    set sur [ $r GetOutput ]
    set atl [ $at GetOutput ]
    
    puts stdout "$name Points = [ $sur GetNumberOfPoints ] , [ $sur GetNumberOfCells ]"
    puts stdout "$aname Points = [ $atl GetNumberOfPoints ] , [ $atl GetNumberOfCells ]"
    
    set dat [ vtkShortArray New ]
    $dat SetNumberOfTuples [ $sur GetNumberOfPoints ]
    
    set idat [ [ $atl GetPointData ] GetScalars ]
    puts stdout "idat=$idat"
    puts stdout "Range = [ $idat GetRange ] offset=$offset"
    set np [ $sur GetNumberOfPoints ]     
    
    for { set i 0 } { $i < $np } { incr i } { 

        set pt [ $sur GetPoint $i ]
        set index [ $atl FindPoint [ lindex $pt 0 ] [ lindex $pt 1 ] [ lindex $pt 2 ]  ]
        set val [ expr [ $idat GetComponent $index 0 ] + $offset ]
        $dat SetComponent $i 0 $val
    }

    $dat Modified
    puts stdout "Output Range = [ $dat GetRange ]"
    
    [ $sur GetPointData ] SetScalars $dat

    
    set n2 "index_${name}.json"
    
    set fout [ open $n2 w ]
    puts -nonewline $fout "\{\n\t \"points\" : \[ "
    for { set i 0 } { $i < $np } { incr i } {
        set pt [ $sur GetPoint $i ]
        if { $i > 0 } {
            puts -nonewline $fout ","
        }
        puts -nonewline $fout " [ expr 180.0 - [ lindex $pt 0]],[ expr 216.0 - [ lindex $pt 1] ],[ lindex $pt 2]"
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



}


exit
