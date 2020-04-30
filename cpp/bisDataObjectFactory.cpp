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

#include "bisDataObjectFactory.h"
#include "bisDataTypes.h"
#include "bisDataObject.h"
#include "bisMatrixTransformation.h"
#include "bisGridTransformation.h"
#include "bisComboTransformation.h"
#include "bisTransformationCollection.h"
#include "bisSimpleDataStructures.h"
#include "bisSurface.h"

namespace bisDataObjectFactory {

  template<class T> std::shared_ptr<T> deserializeTransformationTemplate(unsigned char* pointer,std::string name)  {

    std::shared_ptr<T> obj(new T(name));
    if (!obj->deSerialize(pointer))
      {
	std::shared_ptr<T> tmp(0);
	return tmp;
      }
    return obj;
  }

  
  std::shared_ptr<bisAbstractTransformation> deserializeTransformation(unsigned char* pointer,std::string name)
  {
    int* begin_header=(int*)pointer;
    int magic_type=begin_header[0];

    if (magic_type==bisDataTypes::s_gridtransform)
      return deserializeTransformationTemplate<bisGridTransformation>(pointer,name);

    if (magic_type==bisDataTypes::s_combotransform)
      return deserializeTransformationTemplate<bisComboTransformation>(pointer,name);

    if (magic_type==bisDataTypes::s_collection)
      return deserializeTransformationTemplate<bisTransformationCollection>(pointer,name);
    
    return deserializeTransformationTemplate<bisMatrixTransformation>(pointer,name);
  }

  template<class T> std::shared_ptr<bisDataObject> deserializeSimpleDataObjectTemplate(unsigned char* pointer, std::string name,T*)
  {

    int* begin_header=(int*)pointer;
    int magic_type=begin_header[0];

    if (magic_type==bisDataTypes::s_matrix)
      {
	std::shared_ptr<bisSimpleMatrix<T> > obj(new bisSimpleMatrix<T>(name));
	if (obj->deSerialize(pointer))
	  return obj;
      }

    if (magic_type==bisDataTypes::s_vector)
      {
	std::shared_ptr<bisSimpleVector<T> > obj(new bisSimpleVector<T>(name));
	if (obj->deSerialize(pointer))
	  return obj;
      }

    if (magic_type==bisDataTypes::s_image)
      {
	std::shared_ptr<bisSimpleImage<T> > obj(new bisSimpleImage<T>(name));
	if (obj->deSerialize(pointer))
	  return obj;
      }

    if (magic_type==bisDataTypes::s_surface)
      {
	std::shared_ptr<bisSurface> obj(new bisSurface(name));
	if (obj->deSerialize(pointer))
	  return obj;
      }


    std::shared_ptr<bisDataObject> tmp(0);
    return tmp;

  }
  

std::shared_ptr<bisDataObject> deserializeObject(unsigned char* pointer,std::string name)
  {
    int* begin_header=(int*)pointer;
    int magic_type=begin_header[0];
    int data_type=begin_header[1];

    if (magic_type==bisDataTypes::s_vector ||
	magic_type==bisDataTypes::s_matrix ||
	magic_type==bisDataTypes::s_image ||
        magic_type==bisDataTypes::s_surface)
      {
	switch (data_type)
	  {
	    bisvtkTemplateMacro( return deserializeSimpleDataObjectTemplate(pointer,name,static_cast<BIS_TT*>(0)));
	  }
      }

    // Else try transformation
    return deserializeTransformation(pointer,name);
  }

}
