/*  LICENSE
 
 _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
 
 BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
 
 - you may not use this software except in compliance with the License.
 - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
 
 __Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.__
 
 ENDLICENSE */

#ifndef _bis_Simple_DataStruct_h
#define _bis_Simple_DataStruct_h

#include <string>
#include <map>
#include <iostream>
#include <math.h>

#include "bisUtil.h"
#include "bisDataTypes.h"
#include "bisMemoryManagement.h"
#include "bisDataObject.h"
#include <iostream>
#include <memory>

/** @file bisSimpleDataStructures.h
 *
 * This code provides functionality for serializing/deserializing and manipulating
 * images, matrices and vectors which are serialized from JS as unsigned char arrays
 * using the following syntax:
 *
 <PRE>
 int magic_type; // 20001=vector, 20002=matrix, 20003=image (up to 5d)
 int data_type;  // defined in bisDataTypes
  int header_size; // in bytes
  int data_length; // in bytes
  unsigned char* header[header_size]; //  defined separately for vector,matrix and image
  unsigned char* data[data_length];   //  raw data of type defined by data_type
</PRE>
*/



/** Utility functions for bisSimpleData structures */
namespace bisSimpleDataUtil {

  /** Cast Serialized pointers to various data types 
   * @param in_pointer input serialized pointer 
   * @param data size  size of the data to cast
   * @param name name of output array (for memory logging)
   * @returns a serialized pointer with the data cast to output_data_type (OT)
   */
  template<class OT> unsigned char* cast_raw_data(unsigned char* in_pointer,long& data_size,
                                                  std::string name="");
}


// --------------------- bisSimpleData -------------------------------------

/** bisSimpleData is the abstract base class for classses that stored and manipulate serialized data (vectors,matrices,images).
 * This data is often created externally (in JS or Python) and hence the class does not own the underlying data_array which 
 * was probably allocated in JS or Python
 */
template<class T> class bisSimpleData : public bisDataObject {
  
public:

  /** Constructor
   * @param name value to set the name of the object
   */
  bisSimpleData(std::string name);

  /** Destructor */
  virtual ~bisSimpleData();

  /** Populate this class by deserializing a raw pointer
   * @param pointer the raw data pointer
   * @param copy_pointer if > 0 then a copy is made as opposed to simply a pointer to the original data
   */
  virtual int linkIntoPointer(unsigned char* pointer,int copy_pointer=0);

  /**
   * Populate this class by deserializing a raw pointer. This calls linkIntoPointer with copy_pointer=1;
   * A COPY of the original data is MADE
   * @returns 1 if success 0 if failed */
  virtual int deSerialize(unsigned char* pointer);

  /** Serialize this object inside output pointer */
  virtual void serializeInPlace(unsigned char* output);
  
  /** Returns the actual data type code (see \link bisDataTypes \endlink). */
  int getDataType() { return this->data_type;}

  /** Fill the data array with a constant value
   * @param val the value to fill the data array with
   */
  void fill(T val);

  /** Get the length of the data array in elements (not bytes) 
   * @returns length of data array in elements
   */
  long getLength() { return this->data_length; }

  /** Get the data array
   * @returns a pointer to the data array
   */
  T* getData() { return data; }
  
    /** Get the raw array
   * @returns a pointer to the raw array (this includes the headers and the data)
   */
  unsigned char* getRawArray() { return raw_array; }

  /** Releases and returns the raw array */
  unsigned char* releaseAndReturnRawArray() { this->owns_pointer=0; return raw_array; }
  
  /** Release ownership so that it can be returned to JS 
   * this means that if the object owns the raw_array, this will NOT 
   * be del_eted when the destructor is called */
  void releaseOwnership() {  this->owns_pointer=0;  }


  /** Returns the raw size in bytes
   * @returns the size of the raw_array in bytes 
   */
  long getRawSize() { return this->header_size+this->data_size+16; }

  /** Get Range
   * @param range the function stores in this the minimum and the maximum value in the data array 
   */
  void getRange(double range[2]);
    
protected:

#ifndef DOXYGEN_SKIP  
  // Global Flags
  // size -> in bytes, length in type<T>
  int owns_pointer,  data_type, header_size;
  long data_length,data_size;
  int used_to_own_pointer;
  std::string raw_array_name;
#endif

  /** The raw serialized array */
  unsigned char * raw_array;


  /** A pointer to an element of this->raw_array where the header begins (raw_array[16]) */
  unsigned char* header;

  
  /** A pointer to an element of this->raw_array where the data (as opposed to the header) begins */
  T* data;

  /** allocate a n_e_w raw_array pointer */ 
  void allocate_data();

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisSimpleData(const bisSimpleData&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisSimpleData&);  

};

// -------------------------------------------------------------------------
// bisSimpleVector
// -------------------------------------------------------------------------

/** A class that manipulates 1-d vectors stored in serialized data format */
template<class T> class bisSimpleVector : public bisSimpleData<T>
{
public:

  /** Constructs a Vector
   * @param name value to set the name of the object
   */
  bisSimpleVector(std::string name="simplevector");

  /** Create vector.
   * @param rows number of elements for our vector
   * @returns 1 if success 
   */
  int allocate(int rows);
  
  /** Create vector and fill with zeros
   * @param rows number of elements for our vector
   * @returns 1 if success 
   */
  int zero(int rows);

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisSimpleVector(const bisSimpleVector&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisSimpleVector&);  

};

// -------------------------------------------------------------------------
// bisSimpleMatrix
// -------------------------------------------------------------------------
/** A class that manipulates 2d matrices stored in serialized data format */
template<class T> class bisSimpleMatrix : public bisSimpleData<T>
{
public:
  
  /** Constructs a Vector
   * @param name value to set the name of the object
   */
  bisSimpleMatrix(std::string name="simplematrix");

  /** Populate this class by deserializing a raw pointer
   * @param pointer the raw data pointer
   * @param copy_pointer if > 0 then a copy is made as opposed to simply a pointer to the original data
   */
  virtual int linkIntoPointer(unsigned char* pointer,int copy_pointer=0);

  /** Create a matrix.
   * @param numrows number of rows
   * @param numcols number of columns
   * @returns 1 if success 
   */
  int allocate(int numrows,int numcols);

  /** Create a matrix and fills with zero
   * @param numrows number of rows
   * @param numcols number of columns
   * @returns 1 if success 
   */
  int zero(int numrows,int numcols);

  /** Create a square identity matrix
   * @param numrows number of rows (= number of columns)
   * @returns 1 if success 
   */
  int eye(int numrows);

  /** returns number of rows 
   * @returns number of rows
   */
  int getNumRows() {  return this->numrows; }

  /** returns number of columns
   * @returns number of columns
   */
  int getNumCols() {  return this->numcols; }

  /** export matrix (if 4x4)
   * @param inp the 4x4 matrix to store our contents in
   */
  void exportMatrix(bisUtil::mat44 inp);

  /** import 4x4 matrix
   * @param out the 4x4 matrix to copy from
   */
  void importMatrix(bisUtil::mat44 out);
  
protected:
  
#ifndef DOXYGEN_SKIP  
  int numrows,numcols;
#endif
  
private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisSimpleMatrix(const bisSimpleMatrix&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisSimpleMatrix&);  

};

// -------------------------------------------------------------------------
// bisSimpleImage
// -------------------------------------------------------------------------

/** A class that manipulates 5-d images (x,y,z,frame,component) stored in serialized data format */

template<class T> class bisSimpleImage : public bisSimpleData<T>
{
public:

  /** Constructs an image
   * @param name value to set the name of the object
   */
  bisSimpleImage(std::string name="simpleimage");

  /** Populate this class by deserializing a raw pointer
   * @param pointer the raw data pointer
   * @param copy_pointer if > 0 then a copy is made as opposed to simply a pointer to the original data
   * @returns 1 if success 0 if failed
   */
  virtual int linkIntoPointer(unsigned char* pointer,int copy_pointer=0);


  /** Create an image with the specified dimensions and spacing 
   * @param dimensions the dimensions of the image (5d: x,y,z,frame,component)
   * @param spacing the spacing of the image (5d: x,y,z,frame,component)
   * @returns 1 if success
   */
  int allocate(int dimensions[5],float spacing[5]);

  /** Create an image with the specified dimensions and spacing if 
   * either the current image has different dimensions and spacing or
   * the current image does not own the pointer
   * @param dimensions the dimensions of the image (5d: x,y,z,frame,component)
   * @param spacing the spacing of the image (5d: x,y,z,frame,component)
   * @returns 1 if doing n_e_w allocation or 0 if same image is kept (isdifferent?)
   */
  int allocateIfDifferent(int dimensions[5],float spacing[5]);

  /** Create a n_e_w empty image with the same specs as the input
   * @param orig image to get dimensions and spacing from
   */
  int copyStructure(bisSimpleImage* orig);

  /** returns the dimensions
   * @param dimensions the dimensions (all 5)
   */
  void getDimensions(int dimensions[5]);      

    /** returns the  spacing
   * @param spacing the spacing (all 5)
   */
  void getSpacing(float spacing[5]);
      
  /** returns the image dimensions (x,y,z)
   * @param dimensions the dimensions (just 3)
   */
  void getImageDimensions(int dimensions[3]);


  /** returns the image spacing (x,y,z)
   * @param spacing the spacing (just 3)
   */
  void getImageSpacing(float spacing[3]);

  /** get the image data, this is really an alias to getData to help port JS code 
   *  @returns a pointer to the image voxel data
   */
  T* getImageData() {    return this->getData(); }
  

  /** Next two functions probably should move into bisSimpleImage
   * CopyImage
   * input -input image
   * @return copy
   */
  bisSimpleImage<T>* copyImage(std::string name="copy");

  /** get pointer to start of frame 
   * input - input image
   * frame - the frame number (checked for range) 
   * @returns pointer to raw data starting at frame
   */
  T* getPointerAtStartOfFrame(int frame=0);


protected:

#ifndef DOXYGEN_SKIP    
  int dimensions[5];
  float spacing[5];
#endif

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisSimpleImage(const bisSimpleImage&);
  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisSimpleImage&);  
};

// ------------------ Utility Functions ----------------------

/** A shortcut for float vectors */
typedef bisSimpleVector<float> bisSimpleFloatVector;

/** A shortcut for float matrices */
typedef bisSimpleMatrix<float> bisSimpleFloatMatrix;

/** A shortcut for float images */
typedef bisSimpleImage<float>  bisSimpleFloatImage;


#ifndef BIS_MANUAL_INSTANTIATION
#include "bisSimpleDataStructures.txx"
#endif




#endif
