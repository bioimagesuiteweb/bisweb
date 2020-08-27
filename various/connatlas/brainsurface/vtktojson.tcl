
puts stdout "\n\n"

set argc [ llength $argv ]

if { $argc < 1 } {
    exit(0);
}

set fname  [ lindex $argv 0 ]


set r [ vtkPolyDataReader New ]
$r SetFileName $fname
$r Update


set sur [ $r GetOutput ]

puts stdout "Surface: $fname Points = [ $sur GetNumberOfPoints ] , [ $sur GetNumberOfCells ]"

set outname "[ file rootname ${fname}].json"
puts stdout "Saving in ${outname}"

    
set fout [ open $outname w ]
puts -nonewline $fout "\{\n\t \"points\" : \[ "

set np [ $sur GetNumberOfPoints ]
for { set i 0 } { $i < $np } { incr i } {
    set pt [ $sur GetPoint $i ]
    if { $i > 0 } {
        puts -nonewline $fout ","
    }
    puts -nonewline $fout "[ lindex $pt 0],[ lindex $pt 1],[ lindex $pt 2]"
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
puts $fout "\t\]"
puts $fout "\}"
close $fout

exit
