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


#ifndef _bis_Simple_DataStruct_txx
#define _bis_Simple_DataStruct_txx

// Casting functions
// -----------------
namespace bisSimpleDataUtil {

#ifndef BISWASM  
  const long MAX_SIZE=2147483647;
#endif
  
  template<class OT,class IT> unsigned char* internal_cast_raw_data(unsigned char* in_pointer,BISLONG& data_size,
								    std::string name,bisObject* owner,OT* ,IT* ) {


    OT tmp_t=0;
    int ot_type=bisDataTypes::getTypeCode(tmp_t);
    
    int* begin_int=(int*)in_pointer;
    int header_size=begin_int[2];
    if (data_size<1)
      data_size=begin_int[3];

    BISLONG numelements=data_size/sizeof(IT);
    BISLONG output_data_size= numelements*sizeof(OT);

    //std::cout << "Casting data_size=" << data_size << " numelements=" << numelements << "new data_size=" << output_data_size << std::endl;
    
    unsigned char* out_pointer=bisMemoryManagement::allocate_memory(16+header_size+output_data_size,name,"casting",owner);

    OT* odata=(OT*)(out_pointer+16+header_size);
    IT* idata=(IT*)(in_pointer+16+header_size);

    // Copy and fix header to reflect output data type

    bisMemoryManagement::copy_memory(out_pointer,in_pointer,16+header_size);
    begin_int=(int*)out_pointer;
    begin_int[1]=ot_type;
    begin_int[3]=output_data_size;
#ifndef BISWASM
    if (output_data_size>=MAX_SIZE || bisMemoryManagement::largeMemory())
      begin_int[3]=(int)(-1*sizeof(OT));
#endif
    
    for (int i=0;i<numelements;i++)
      odata[i]=(OT)idata[i];

    data_size=output_data_size;
    
    return out_pointer;
  }

  template<class OT> unsigned char* cast_raw_data(unsigned char* in_pointer,BISLONG& data_size,std::string name,bisObject* owner=0) {
    
    int* begin_int=(int*)in_pointer;
    int data_type=begin_int[1];

    OT tmp=0;
    int target_type=bisDataTypes::getTypeCode(tmp);
    if (target_type==data_type)
      return in_pointer;
    
    switch (data_type)
      {
	bisvtkTemplateMacro( return internal_cast_raw_data(in_pointer,data_size,name,owner,
							   static_cast<OT*>(0), static_cast<BIS_TT*>(0)))
	  }
    return NULL;
  }


  /*  unsigned char* cast_raw_data_to_float(unsigned char* in_pointer,std::string name) {
    return cast_raw_data<float>(in_pointer,name);
  }
  
  unsigned char* cast_raw_data_to_short(unsigned char* in_pointer,std::string name) {
    return cast_raw_data<short>(in_pointer,name);
  }

  int get_pointer_data_type(unsigned char* pointer) {
  
    if (pointer==NULL)
      return -1;

    int* begin_int=(int*)pointer;
    return begin_int[1];
    }*/
}

// -------------------------------------------------------------------------
// --------------------- bisSimpleData -------------------------------------
// -------------------------------------------------------------------------

template<class T> bisSimpleData<T>::bisSimpleData(std::string n) : bisDataObject(n) {
  this->data=0;
  this->header=0;
  this->raw_array=0;
  this->data_length=0;
  this->data_size=0;
  this->header_size=0;
  this->owns_pointer=0;
  this->used_to_own_pointer=0;
  T tmp=0;
  this->data_type=bisDataTypes::getTypeCode(tmp);
  this->magic_type=1;
  this->class_name="bisSimpleData";
  this->raw_array_name=this->name+":raw";
}    

template<class T> bisSimpleData<T>::~bisSimpleData() {

  if (bisMemoryManagement::debugMemory() )
    std::cout << std::endl << "o+o+o deleting bisSimpleData" << std::endl;
  
  if (this->owns_pointer)
    bisMemoryManagement::release_memory(this->raw_array,"bisSimpleData::destructor");
  else if (this->raw_array!=0)
    bisMemoryManagement::not_releasing_memory(this->raw_array,"bisSimpleData::destructor",this->used_to_own_pointer);
    
}

  
template<class T> void bisSimpleData<T>::fill(T val) {
  for (int ia=0;ia<this->data_length;ia++)
    this->data[ia]=val;
}

   
template< class T> void bisSimpleData<T>::allocate_data() {

  if (this->owns_pointer)
    bisMemoryManagement::release_memory(this->raw_array,
					"bisSimpleData::allocate_data");
  else if (this->raw_array!=0)
    bisMemoryManagement::not_releasing_memory(this->raw_array,
					      "bisSimpleData::allocate_data");

  // On to output stuff
  // ------------------
  this->data_size=this->data_length*sizeof(T);
  this->raw_array=bisMemoryManagement::allocate_memory(16+this->data_size+this->header_size,
						       this->raw_array_name,"allocate_data",this);
  
  this->header=this->raw_array+16;
  this->data=(T*)(this->raw_array+16+header_size);
  this->owns_pointer=1;
  this->used_to_own_pointer=1;
  
  int* begin_int=(int*)this->raw_array;
  
  // Fill the header bytes
  begin_int[0]=this->magic_type;
  begin_int[1]=this->data_type;
  begin_int[2]=this->header_size;
  begin_int[3]=this->data_size;
#ifndef BISWASM
  if (this->data_size>=bisSimpleDataUtil::MAX_SIZE || bisMemoryManagement::largeMemory())
    begin_int[3]=(int)(-1*sizeof(T));
#endif
}

template<class T> int bisSimpleData<T>::deSerialize(unsigned char* pointer)
{
  return this->linkIntoPointer(pointer,1);
}

template<class T> int bisSimpleData<T>::linkIntoPointer(unsigned char* pointer,int copy_pointer) {

  int* begin_int=(int*)pointer;
  int incoming_magic_type=begin_int[0];
  BISLONG dt_size=begin_int[3];

  if (dt_size<0) {
    std::cout << "____ C++ large image: original length=" << dt_size << ", B=" << begin_int[3] << std::endl;
    if (this->magic_type==bisDataTypes::s_image ||
        this->magic_type==bisDataTypes::s_matrix) {
      BISLONG len=1;
      int maxdim=4;
      if (this->magic_type==bisDataTypes::s_matrix)
        maxdim=1;
      for (int i=0;i<=maxdim;i++) {
        // std::cout << "Dim " << i << "=" << begin_int[4+i] << std::endl;
        len*=begin_int[4+i];
      }
      std::cout << "____      Len " << len << std::endl;
      dt_size=len*abs(begin_int[3]);
      std::cout << "____                 final byte length=" << dt_size << " vs " << dt_size/len << " bytes=" << abs(begin_int[3]) << std::endl;
    }
    
    if (dt_size<0) {
      std::cerr << "Bad data set " << dt_size  << std::endl;
      return 0;
    }
  }

  if (bisMemoryManagement::debugMemory() )
    std::cout << "Linking " << begin_int[0] << "," << begin_int[1] << " ," << begin_int[2] << "," << begin_int[3] << "-->" << dt_size << std::endl;
  
  if (this->magic_type!=incoming_magic_type)
    {
      std::cerr << "Invalid magic code " << this->magic_type << "vs " << incoming_magic_type  << std::endl;
      return 0;
    }
  
  // Clean up first
  if (this->owns_pointer)
    {
      bisMemoryManagement::release_memory(this->raw_array,"linkIntoPointer");
      this->owns_pointer=0;
      this->used_to_own_pointer=0;
    }
  
  T tmp=0;

  unsigned char* output_pointer=pointer;
  
  if (begin_int[1]!=bisDataTypes::getTypeCode(tmp))
    {
      if (bisMemoryManagement::debugMemory() )  
	std::cout << "***** linkIntoPointer " << this->name << ". Needs to cast as type code " <<  begin_int[1] << " != " << bisDataTypes::getTypeCode(tmp)  << std::endl;
      
      output_pointer=bisSimpleDataUtil::cast_raw_data<T>(pointer,dt_size,this->raw_array_name,this);
      this->owns_pointer=1;
      this->used_to_own_pointer=1;
      begin_int=(int*)output_pointer;
      begin_int[1]=bisDataTypes::getTypeCode(tmp);
      // Copy memory here somewhere
    }
  else if (copy_pointer)
    {
      if (bisMemoryManagement::debugMemory() )  
	std::cout << "***** linkIntoPointer " << this->name << ". Copying pointer as requested" << std::endl;

      BISLONG sz=begin_int[2]+dt_size;//begin_int[3];

      
      output_pointer=bisMemoryManagement::allocate_memory(16+sz,this->raw_array_name,"copying",this);
      bisMemoryManagement::copy_memory(output_pointer,pointer,sz+16);
      this->owns_pointer=1;
      this->used_to_own_pointer=0;
    }
  else if (bisMemoryManagement::debugMemory() )
    {
      std::cout << "***** linkIntoPointer " << this->name << " from location " << (BISLONG)pointer << ". Not taking ownership. dt_size=" << dt_size  << std::endl;
    }
  
  begin_int=(int*)output_pointer;
  this->data_type=begin_int[1];
  this->header_size=begin_int[2];
  this->data_size=dt_size;
  this->data_length=this->data_size/sizeof(T);

  if (bisMemoryManagement::debugMemory() )
    std::cout << "Final data size=" << this->data_size << ", datalength=" << this->data_length << std::endl;
  

  this->header=(output_pointer+16);
  this->data=(T*)(output_pointer+16+this->header_size);
  this->raw_array=output_pointer;
  return 1;
}


template<class T> void bisSimpleData<T>::serializeInPlace(unsigned char* output)
{
  int begin_int[4];
  begin_int[0]=this->magic_type;
  begin_int[1]=this->data_type;
  begin_int[2]=this->header_size;
  begin_int[3]=this->data_size;
#ifndef BISWASM
  if (this->data_size >= bisSimpleDataUtil::MAX_SIZE || bisMemoryManagement::largeMemory())
    begin_int[3]=(int)(-1*sizeof(T));
#endif
  
  unsigned char* begin_ptr=(unsigned char*)(&begin_int[0]);
  
  
  bisMemoryManagement::copy_memory(output,begin_ptr,4*4);
  bisMemoryManagement::copy_memory(output+16,this->header,this->header_size);
  bisMemoryManagement::copy_memory(output+16+this->header_size,(unsigned char*)this->data,this->data_size);
  


}

template<class T> void bisSimpleData<T>::getRange(double range[2])
{
  if (this->data_length==0)
    {
      range[0]=-1.0;
      range[1]=-2.0;
    }
  else
    {
      range[0]=this->data[0];
      range[1]=this->data[0];
      for (int i=1;i<this->data_length;i++)
	{
	  if (range[1]<data[i])
	    range[1]=data[i];
	  else if (range[0]>data[i])
	    range[0]=data[i];
	}
    }
}

// -------------------------------------------------------------------------
// bisSimpleVector
// -------------------------------------------------------------------------
template<class T> bisSimpleVector<T>::bisSimpleVector(std::string n):bisSimpleData<T>(n) {
  this->magic_type=bisDataTypes::s_vector;
  this->class_name="bisSimpleVector";
}

template<class T> int bisSimpleVector<T>::allocate(int rows)
{
  this->data_length=rows;
  this->header_size=0;
  this->allocate_data();
  return 1;
}

template<class T> int bisSimpleVector<T>::zero(int rows) {

  this->allocate(rows);
  this->fill((T)0);
  return 1;
}

// -------------------------------------------------------------------------
// bisSimpleMatrix
// -------------------------------------------------------------------------
  
template<class T> bisSimpleMatrix<T>::bisSimpleMatrix(std::string n):bisSimpleData<T>(n) {

  this->magic_type=bisDataTypes::s_matrix;
  this->class_name="bisSimpleMatrix";
}

template<class T> int bisSimpleMatrix<T>::linkIntoPointer(unsigned char* pointer,int copy_pointer)
{
  int ok=bisSimpleData<T>::linkIntoPointer(pointer,copy_pointer);
  if (ok)
    {
      int* i_head=(int*)(this->header);
      this->numrows=i_head[0];
      this->numcols=i_head[1];
      /*      std::cout << "Linked: ";
      for (int i=0;i<this->numrows*this->numcols;i++)
	std::cout << this->data[i] << " ";
        std::cout << std::endl;*/
  }
  return ok;
}

template<class T> int bisSimpleMatrix<T>::allocate(int numrows,int numcols)
{
  this->numrows=numrows;
  this->numcols=numcols;
  this->data_length=this->numrows*this->numcols;
  this->header_size=8;
  this->allocate_data();
  int* int_head=(int*)(this->header);
  int_head[0]=this->numrows;
  int_head[1]=this->numcols;
  return 1;
}

template<class T> int bisSimpleMatrix<T>::zero(int rows,int cols) {
  this->allocate(rows,cols);
  this->fill((T)0);
  return 1;
}

template<class T> int bisSimpleMatrix<T>::eye(int rows) {

  this->allocate(rows,rows);
  this->fill((T)0);
  for (int i=0;i<this->numrows;i++)
    this->data[i*this->numrows+i]=(T)1;
  
  return 1;
}


template<class T> void bisSimpleMatrix<T>::importMatrix(bisUtil::mat44 inp)
{
  if (this->numrows!=4 || this->numcols!=4)
    this->allocate(4,4);

  for (int i=0;i<=3;i++) 
    for (int j=0;j<=3;j++) 
      this->data[i*4+j]=inp[i][j];
}

template<class T> void bisSimpleMatrix<T>::exportMatrix(bisUtil::mat44 inp)
{
  for (int i=0;i<=3;i++) 
    for (int j=0;j<=3;j++) 
      inp[i][j]=this->data[i*4+j];
}


// -------------------------------------------------------------------------
// bisSimpleImage
// -------------------------------------------------------------------------

template<class T> bisSimpleImage<T>::bisSimpleImage(std::string n) : bisSimpleData<T>(n) {
  this->magic_type=bisDataTypes::s_image;
  this->class_name="bisSimpleImage";
}

template<class T> int bisSimpleImage<T>::linkIntoPointer(unsigned char* pointer,int copy_pointer) {

  int ok=bisSimpleData<T>::linkIntoPointer(pointer,copy_pointer);
  if (ok)
    {
      int* i_head=(int*)(this->header);
      float* f_head=(float*)(this->header+20);
      
      for(int ia=0;ia<=4;ia++) {
	this->dimensions[ia]=i_head[ia];
	this->spacing[ia]=f_head[ia];
      }
    }
  return ok;
}

// ------------------- ------------------------ -------------------------------------------

template<class T> int bisSimpleImage<T>::allocate(int dimensions[5],float spacing[5]) {
  
  this->data_length=1;
  for (int ia=0;ia<=4;ia++)
    {
      this->dimensions[ia]=dimensions[ia];
      this->spacing[ia]=spacing[ia];
      this->data_length*=this->dimensions[ia];
    }
  // 8*5
  this->header_size=40;
  this->allocate_data();
  
  /*  int* begin_int=(int*)this->raw_array;
//    for (int i=0;i<=3;i++)
  //st	  d::cout << " Header " << i << " -> " << begin_int[i]  << std::endl;*/

  
  int* int_head=(int*)(this->header);
  float* float_head=(float*)(this->header+20);
  
  for(int ia=0;ia<=4;ia++) {
    int_head[ia]=this->dimensions[ia];
    float_head[ia]=this->spacing[ia];
  }
  return 1;
}

// ------------------- ------------------------ -------------------------------------------
template<class T> int bisSimpleImage<T>::allocateIfDifferent(int in_dimensions[5],float in_spacing[5])
{
  if (!this->owns_pointer)
    return this->allocate(in_dimensions,in_spacing);


  int sum=0.0; float fsum=0.0;
  for (int ia=0;ia<=4;ia++)
    {
      sum+=abs(this->dimensions[ia]-in_dimensions[ia]);
      fsum+=float(fabs(this->spacing[ia]-in_spacing[ia]));
    }

  if (sum==0 && fsum<0.00001f)
    return 0;

  return this->allocate(in_dimensions,in_spacing);
}
// ------------------- ------------------------ -------------------------------------------

template<class T> int bisSimpleImage<T>::copyStructure(bisSimpleImage* orig) {

  //  std::cout << "Begin copying structure..." << std::endl;
  this->allocate(orig->dimensions,orig->spacing);
  //  std::cout << "Done copying structure..." << std::endl;

  return 1;
}

template<class T> void bisSimpleImage<T>::getDimensions(int dimensions[5]) {
  for (int ia=0;ia<=4;ia++)
    dimensions[ia]=this->dimensions[ia];
}

template<class T> void bisSimpleImage<T>::getSpacing(float spacing[5]) {
  for (int ia=0;ia<=4;ia++)
    spacing[ia]=this->spacing[ia];
}

template<class T> void bisSimpleImage<T>::getImageDimensions(int dimensions[3]) {
  for (int ia=0;ia<=2;ia++)
    dimensions[ia]=this->dimensions[ia];
}

template<class T> void bisSimpleImage<T>::getImageSpacing(float spacing[3]) {
  for (int ia=0;ia<=2;ia++)
    spacing[ia]=this->spacing[ia];
}


/** CopyImage -- new memory is allocated here */
template<class T> bisSimpleImage<T>* bisSimpleImage<T>::copyImage(std::string name) {

  bisSimpleImage<T> *output_image=new bisSimpleImage<T>(name.c_str());
  output_image->copyStructure(this);
  // Copy intensities from input to output
  T *outP=output_image->getData();
  T *inpP=this->getData();
  int nvox=output_image->getLength();
  for (int i=0;i<nvox;i++)
    outP[i]=inpP[i];
  
  return output_image;
}
  

/** get pointer to start of frame */
template<class T> T* bisSimpleImage<T>::getPointerAtStartOfFrame(int frame) {
    
  int actualframe=bisUtil::irange(frame,0,this->dimensions[3]*this->dimensions[4]-1);
  T* inp=this->getData();
  int offset=this->dimensions[0]*this->dimensions[1]*this->dimensions[2]*actualframe;
  return &inp[offset];
}

// --------------------------------------------------------------------------------

#endif
