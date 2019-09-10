
set lst { "right_2.vtk"  "left_2.vtk" }
set olst { "right_2.ply"  "left_2.ply" }

for { set j 0 } { $j <= 1 } { incr j } {

    set name [ lindex $lst $j  ]
    set r [ vtkPolyDataReader New ]
    $r SetFileName $name
    $r Update

    set w [ vtkPLYWriter New ]
    $w SetInput [ $r GetOutput ]
    $w SetFileName [ lindex $olst $j ]
    $w Write
    
}

exit
