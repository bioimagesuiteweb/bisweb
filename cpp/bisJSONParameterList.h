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


#ifndef _bis_JSONParameterList_h
#define _bis_JSONParameterList_h

#include <vector>
#include <map>
#include <string>
#include "bisObject.h"

/**
 * Class that parses and stores key/value pairs from a json string 
 * To parse json it calls C code in jsmn ( from Serge A. Zaitsev
 * https://github.com/zserge/jsmn )
 */

class bisJSONParameterList : public bisObject {
  
 public:

  /** Constructor
   * @param name used to set class name 
   */
  bisJSONParameterList(std::string name="jsonplist");

  /** Destructor */
  virtual ~bisJSONParameterList();
  
  /** Parse a JSON String and create list
   * @param JSON_STRING input string
   */
  int parseJSONString(const char* JSON_STRING);

  /** Print current list
   * @param name describes the list of parameters
   * @param indent used before each line
   */
  void print(std::string name="",std::string indent="     ");

  /** Get parameter as int
   * @param name parameter name
   * @param defaultv value to return if parameter does not exist
   * @param index used to extract a component of a list (vector) for multivalued parameters
   * @returns parameter value
   */
  int   getIntValue(std::string name, int defaultv=0,int index=0);

  /** Get parameter as float
   * @param name parameter name
   * @param defaultv value to return if parameter does not exist
   * @param index used to extract a component of a list (vector) for multivalued parameters
   * @returns parameter value
   */
  float getFloatValue(std::string name, float defaultv=0.0,int index=0);

  /** Get parameter as string
   * @param name parameter name
   * @param defaultv value to return if parameter does not exist
   * @returns parameter value
   */
  std::string getValue(std::string name, std::string defaultv="");

  /** Get boolean parameter (true or false) as integer (1 or 0)
   * @param name parameter name
   * @param defaultv value to return if parameter does not exist
   * @returns parameter value as integer (0 or 1)
   */
  int   getBooleanValue(std::string name, int defaultv=0);

  /** set scalar parameter from int
   * @param name parameter name
   * @param val used to set the parameter
   */
  void  setIntValue(std::string name, int val);

  /** Set scalar parameter from float
   * @param name parameter name
   * @param v used to set the parameter
   */
  void  setFloatValue(std::string name, float v);

  /** set scalar parameter from string
   * @param name parameter name
   * @param v used to set the parameter
   */
  void  setValue(std::string name, std::string v);


  /** Get boolean parameter from integer (0 or 1)
   * @param name parameter name
   * @param v used to set the parameter
   */
  void  setBooleanValue(std::string name, int v);


  /** Get Number of components for a particular parameter
   * @param name the name of the parameter
   */
  int getNumComponents(std::string name);

  /** Returns the  number of parameters in the list */
  int getNumberOfParameters();

  
protected:

  /** Internal storage of parameter list */
  std::map<std::string,std::vector<std::string> >  parameterMap;

private:

  /** Copy constructor disabled to maintain shared/unique ptr safety */
  bisJSONParameterList(const bisJSONParameterList&);

  /** Assignment disabled to maintain shared/unique ptr safety */
  void operator=(const bisJSONParameterList&);  
  
};

#endif
