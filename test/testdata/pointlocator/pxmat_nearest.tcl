#!/bin/sh
# the next line restarts using wish \
    exec vtk "$0" "$@"


#BIOIMAGESUITE_LICENSE  ---------------------------------------------------------------------------------
#BIOIMAGESUITE_LICENSE  This file is part of the BioImage Suite Software Package.
#BIOIMAGESUITE_LICENSE  
#BIOIMAGESUITE_LICENSE  X. Papademetris, M. Jackowski, N. Rajeevan, R.T. Constable, and L.H
#BIOIMAGESUITE_LICENSE  Staib. BioImage Suite: An integrated medical image analysis suite, Section
#BIOIMAGESUITE_LICENSE  of Bioimaging Sciences, Dept. of Diagnostic Radiology, Yale School of
#BIOIMAGESUITE_LICENSE  Medicine, http://www.bioimagesuite.org.
#BIOIMAGESUITE_LICENSE  
#BIOIMAGESUITE_LICENSE  All rights reserved. This file may not be edited/copied/redistributed
#BIOIMAGESUITE_LICENSE  without the explicit permission of the authors.
#BIOIMAGESUITE_LICENSE  
#BIOIMAGESUITE_LICENSE  -----------------------------------------------------------------------------------


if { $argc < 2 } {
    puts stdout "\n\n"
    puts stdout "$argv0 input_surface output.txt"

    puts stdout "   First argument is the input surface"
    puts stdout "   Second argument is the output text file"
}

set f [ file join [ file dirname [ info script ]] pxappscommon.tcl ]
if { [ file exists $f  ] } {
    puts stdout "$f exists"
    lappend auto_path [ file dirname [ info script ]];
} else {
    puts stdout "$f does not exist -- sourcing from bioimagesuite32"
    lappend auto_path /usr/local/bioimagesuite32/apps
}
package require pxappscommon


set input    [ lindex $argv 0 ]
set outname   [ lindex $argv 1 ]

set reader [ vtkPolyDataReader New ]
$reader SetFileName $input
$reader Update

set np [ [ $reader  GetOutput ] GetNumberOfPoints ]
puts stdout "Read $input, numpoints=$np"
if { $np < 10 } {
    puts stderr "Failed to read surface from $input"
    exit
}

set sur [ $reader GetOutput ]

set threshold 20.0
set pts  {  { 77 132 12.2} {  54.3 120 145 } {  55.1 144 137 }  { 100 100 100 } { 200 200 200 } {112 132.5 151 }  { 96.5 125 151 } }

set npts [ llength $pts ]

set locator [ vtkPointLocator New ]
$locator SetDataSet $sur
$locator SetDivisions 20 20 20
$locator BuildLocator

set fout [ open $outname w ]

puts $fout  "\{\n \"points\" : \["

for { set i 0 } { $i < $npts } { incr i } { 

    set pt [ lindex $pts $i ]
    puts stdout "\n -----------------------------------"
    puts stdout "Looking at point $pt\n"

    puts $fout "    \{\n       \"location\" : \[ [ lindex $pt 0 ], [ lindex $pt 1 ], [ lindex $pt 2 ] \],"
    
    set ind [ $locator FindClosestPoint [ lindex $pt 0 ] [ lindex $pt 1 ] [ lindex $pt 2 ]]
    set p [ $sur GetPoint $ind ]
    puts stdout "Nearest $pt = $p ($ind) "

    puts $fout "       \"nearest\" : \[ [ lindex $p 0 ], [ lindex $p 1 ], [ lindex $p 2 ], $ind \],"

    set pt [ lindex $pts $i ]
    set idlist [ vtkIdList New ]
    set q [ $locator FindPointsWithinRadius $threshold [ lindex $pt 0 ]  [ lindex $pt 1 ] [ lindex $pt 2 ] $idlist ]
    set n [ $idlist GetNumberOfIds ]
    puts stdout "   Num points = $n"
    puts $fout "       \"numneighbors\" : $n ,"
    puts -nonewline $fout "       \"neighbors\" : \[ "
    

    for { set j 0 } { $j < $n } { incr j } {
        set ind2 [ $idlist GetId $j ]
        set p2 [ $sur GetPoint $ind2 ]
        puts stdout "   Nearest $pt, [ expr $j+1 ] = $p2 ($ind2) "

        if { $j > 0 } {
            puts -nonewline $fout ","
        }
        puts -nonewline $fout "\[ [ lindex $p2 0 ], [ lindex $p2 1 ] , [ lindex $p2 2 ], $ind2 \]"
    }
    if { $i < [ expr $npts -1 ] } {
        puts $fout "]\n    \},"
    } else {
        puts $fout "]\n    \}"
    }
}

puts $fout "  \],\n \"threshold\" : ${threshold}\n\}"
close $fout

exit

