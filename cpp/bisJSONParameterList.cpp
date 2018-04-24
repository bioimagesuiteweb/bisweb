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

#include "bisJSONParameterList.h"
#include "b_jsmn.h"
#include <iostream>
#include "sstream"
#include "bisUtil.h"
#include <string.h>



typedef std::map<std::string, std::vector<std::string> >::iterator paramIterator;

bisJSONParameterList::bisJSONParameterList(std::string n) : bisObject(n) {

  this->class_name="bisJSONParameterList";
}

bisJSONParameterList::~bisJSONParameterList()
{
  parameterMap.clear();
}
  
// Parse JSON String
int bisJSONParameterList::parseJSONString(const char* JSON_STRING)
{
  this->parameterMap.clear();

  //  std::cout << "Parsing " << JSON_STRING << std::endl;
  
  jsmn_parser p;
  jsmntok_t t[128]; /* We expect no more than 128 tokens */
  
  jsmn_init(&p);
  int r = jsmn_parse(&p, JSON_STRING, strlen(JSON_STRING), t, sizeof(t)/sizeof(t[0]));
  if (r < 0)
    {
      std::cerr << "Failed to parse JSON: " << r << std::endl;
      return 0;
    }
  
  /* Assume the top-level element is an object */
  if (r < 1 || t[0].type != JSMN_OBJECT) {
    std::cerr << "Object Expected: " << r << std::endl;
    return 0;
  }
  
  /* Loop over all keys of the root object */
  for (int i = 1; i < r; i+=2) {
    std::string key=std::string(JSON_STRING,t[i].start,t[i].end-t[i].start);
    //    int len=t[i].size;
    std::string val="";
    
    if (t[i+1].type!=2)
      {
	val=std::string(JSON_STRING,t[i+1].start,t[i+1].end-t[i+1].start);
	std::vector<std::string> lst; lst.push_back(val);
	this->parameterMap[key]=lst;
      }
    else
      {
	int len=t[i+1].size;
	int k=2;
	std::vector<std::string> lst;
	val="";
	while (k<len+2) {
	  std::string v2=std::string(JSON_STRING,t[i+k].start,t[i+k].end-t[i+k].start);
	  lst.push_back(v2);
	  k++;
	}
	i=i+k-2;
	this->parameterMap[key]=lst;
      }
  }
  
  return 1;
}

// Print
void bisJSONParameterList::print(std::string name,std::string indent)
{
  std::map<std::string, std::vector<std::string> >::iterator it;
  std::vector<std::string>::iterator it2;

  std::cout << indent << "_______________________________" << std::endl;
  if (name=="")
    std::cout << indent << " Printing JSON Parameter List" << std::endl;
  else
    std::cout << indent << name << std::endl;
  std::cout << indent << "_______________________________" << std::endl;
    
    for ( it = this->parameterMap.begin(); it != this->parameterMap.end(); it++ ) {
      std::string key=it->first;
      std::vector<std::string> values=it->second;
      std::cout << indent << " \"" << key << "\"=[ ";
      for ( it2 = values.begin(); it2 != values.end(); it2++ ) {
	if (it2 !=values.begin())
	  std::cout << ", ";
	std::cout << "\"" << *it2 << "\" ";
	
      }
      std::cout << " ]  ( sz="<< values.size() << ")" << std::endl;
    }
  std::cout << indent << "_______________________________" << std::endl;
}

// GetValue with default
int bisJSONParameterList::getIntValue(std::string name, int defaultv,int index)
{
  paramIterator search = this->parameterMap.find(name);
  if(search == this->parameterMap.end()) {
    return defaultv;
  }

  int len=search->second.size();
  if (index<0 || index>=len)
    return defaultv;
  
  return atoi(search->second[index].c_str());
  
}

float bisJSONParameterList::getFloatValue(std::string name, float defaultv,int index)
{
  paramIterator search = this->parameterMap.find(name);
  if(search == this->parameterMap.end())
    return defaultv;;

  int len=search->second.size();
  if (index<0 || index>=len)
    return defaultv;
  return (float) atof(search->second[index].c_str());


}

std::string bisJSONParameterList::getValue(std::string name, std::string defaultv)
{
  paramIterator search = this->parameterMap.find(name);
  if(search != this->parameterMap.end())
    return search->second[0];
  
  return defaultv;
}


int bisJSONParameterList::getBooleanValue(std::string name, int defaultv)
{
  paramIterator search = this->parameterMap.find(name);
  if(search ==this->parameterMap.end())
    return defaultv;

  if (search->second[0]=="true")
    return 1;

  return 0;

}

// Description:
int bisJSONParameterList::getNumComponents(std::string name)
{
  paramIterator search = this->parameterMap.find(name);
  if(search == this->parameterMap.end())
    return 0;

  return search->second.size();


}

// Number of Parameters
int bisJSONParameterList::getNumberOfParameters()
{
  return this->parameterMap.size();
}

// ----------------------------------------------------------------------------------
void bisJSONParameterList::setIntValue(std::string name, int val)
{
  std::stringstream output;
  output << val;
  std::vector<std::string> lst;
  lst.push_back(output.str());
  this->parameterMap[name]=lst;
}
    
void bisJSONParameterList::setFloatValue(std::string name, float v)
{
  std::stringstream output;
  output << v;
  std::vector<std::string> lst;
  lst.push_back(output.str());
  this->parameterMap[name]=lst;
}

void bisJSONParameterList::setValue(std::string name, std::string v)
{
  std::stringstream output;
  output << v;
  std::vector<std::string> lst;
  lst.push_back(output.str());
  this->parameterMap[name]=lst;
}

void bisJSONParameterList::setBooleanValue(std::string name, int v)
{
  std::stringstream output;
  if (v>0)
    output << "true";
  else
    output << "false";
  std::vector<std::string> lst;
  lst.push_back(output.str());
  this->parameterMap[name]=lst;
}


