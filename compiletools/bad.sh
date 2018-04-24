#!/bin/bash

echo ""
echo ""
echo "Checking for bad stuff in cpp code"
echo ""
echo "    ------------------------------------------------"

echo "    Looking for new"
echo ""
grep new cpp/*.h cpp/*.cpp cpp/*.txx | grep -v shared | grep -v uniq
echo "    ------------------------------------------------"

echo "    Looking for delete"
echo ""
grep delete cpp/*.h cpp/*.cpp cpp/*.txx | grep -v shared | grep -v uniq
echo "    ------------------------------------------------"

echo "    Looking for \n"
echo ""
grep "\\\n" cpp/*.h cpp/*.cpp cpp/*.txx
echo "    ------------------------------------------------"

echo "    Looking for print"
echo ""
grep "printf" cpp/*.h cpp/*.cpp cpp/*.txx
echo "    ------------------------------------------------"

echo "    Looking for stdio"
echo ""
grep "stdio" cpp/*.h cpp/*.cpp cpp/*.txx
echo "    ------------------------------------------------"

echo "    Looking for string.h"
echo ""
grep "string.h" cpp/*.h cpp/*.cpp cpp/*.txx
echo "    ------------------------------------------------"

echo "    Looking for releaseOwnership"
echo ""
grep "releaseOwnership" cpp/*.h cpp/*.cpp cpp/*.txx
echo "    ------------------------------------------------"

echo "    Looking for commented out tests"
echo ""
grep "\*\/" test/*.js | grep -v describe | grep -v jshint
echo "    ------------------------------------------------"

echo "    Looking for direct calls to Module functions"
echo ""
grep "Module._" js/*/*.js test/*.js 
grep "ccall" js/*/*.js test/*.js 
echo "    ------------------------------------------------"


echo ""
echo ""
echo ""
