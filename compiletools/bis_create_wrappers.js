#!/usr/bin/env node

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

'use strict';

require('../config/bis_checknodeversion');
const fs=require('fs');
const path=require('path');
let appinfo=require(path.join(__dirname,'../package.json'));

// --------------------------------------------------------------------------
// names, argtype, isptr, isstring

const js_types = {
    'bisImage' : [ 'image', 'number' ,true,false],
    'Matrix' : [ 'matrix' ,'number', true,false],
    'Vector' : [ 'vector' , 'number' ,true,false],
    'bisSurface'  : [ 'surface' ,'number',true,false],
    'bisTransformation' : [ 'transformation' ,'number', true,false],
    'bisLinearTransformation' : [ 'linearxform' ,'number',true,false],
    'bisGridTransformation'   : [ 'gridxform' ,'number',true,false],
    'bisComboTransformation'  : [ 'comboxform' ,'number',true,false],
    'String' : [ 'string' , 'string',false,true],
    'Int' : [ 'intval' , 'number',false,false],
    'Float' : [ 'floatval' , 'number',false,false],
    'debug' : [ 'debug' , 'number' , false,false],
    'ParamObj' : [ 'paramobj' , 'string', false ,false],
};



const python_types = {
    'bisImage' : [ 'image', 'ctypes.c_void_p' ,true,false],
    'Matrix' : [ 'matrix' ,'ctypes.c_void_p', true,false],
    'Vector' : [ 'vector' , 'ctypes.c_void_p' ,true,false],
    'bisSurface'  : [ 'surface' ,'ctypes.c_void_p',true,false],
    'bisTransformation' : [ 'transformation' ,'ctypes.c_void_p', true,false],
    'bisLinearTransformation' : [ 'linearxform' ,'ctypes.c_void_p',true,false],
    'bisGridTransformation'   : [ 'gridxform' ,'ctypes.c_void_p',true,false],
    'bisComboTransformation'  : [ 'comboxform' ,'ctypes.c_void_p',true,false],
    'String' : [ 'string' , 'ctypes.c_char_p',false,true],
    'Int' : [ 'intval' , 'ctypes.c_int', false,false],
    'Float' : [ 'floatval' , 'ctypes.c_float', false,false],
    'debug' : [ 'debug' , 'ctypes.c_int' , false,false],
    'ParamObj' : [ 'paramobj' , 'ctypes.c_char_p', false ,false],
};

// --------------------------------------------------------------------------
var getTime=function(nobracket=0) {
    //    http://stackoverflow.com/questions/7357734/how-do-i-get-the-time-of-day-in-javascript-node-js

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    if (nobracket===0)
        return  "[" + hour + ":" + min + ":" + sec +"]";
    return  hour + ":" + min + ":" + sec;
};

var getDate=function(sep="_") {
    //    http://stackoverflow.com/questions/7357734/how-do-i-get-the-time-of-day-in-javascript-node-js

    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return  year+sep+month+sep+day;
};
// --------------------------------------------------------------------------

var scan_header_file = function(onames) {

    let outdefs=[];
    let outcmt=[];
    let outorig= [];
    for (let f=0;f<onames.length;f++) {
        let tname=onames[f];
        console.log('+++++ Reading '+tname);
        let text = fs.readFileSync(tname,'utf-8');
        const lines=text.split("\n");
        
        for (let i=0;i<lines.length;i++) {
            
            let txt=lines[i].trim();
            if (txt.indexOf("// BIS:")>=0) {

                let line=txt;
                let begin=line.indexOf("{");
                let end=line.lastIndexOf("}");

                let str=line.substr(begin+1,end-begin-2).trim();
                outorig.push(str);
                let out=str.trim().replace(/ /g,'').replace(/\[/g,'').replace(/]/g,'').replace(/'/g,'');
                outdefs.push(out);

                let ip=i;
                let found=false;
                while (found===false && ip>i-30 && i>0) {
                    if (lines[ip].indexOf('/**')>0) {
                        found=true;
                    } else {
                        ip=ip-1;
                    }
                }
                
                if (found) {
                    let cmtext='';
                    for (let k=ip;k<i;k++)
                        cmtext+='  '+lines[k].trim()+'\n';
                    outcmt.push(cmtext);
                } else {
                    outcmt.push(' ');
                    console.log('----- C++ comments not found for ',txt);
                }
            }
        }
    }
    console.log('+++++');

    return {
        orig :  outorig,
        outdefs : outdefs ,
        outcmt  : outcmt
    };
};

// --------------------------------------------------------------------------
var create_module_header = function (wrapper_mode) {

    wrapper_mode = wrapper_mode || 'js';

    if (wrapper_mode==="js") {

        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;
        let day  = date.getDate();
        day = (day < 10 ? "0" : "") + day;
        let dt=month+"/"+day+"/"+year;
        
        return `
              
"use strict";

const wasmutil=require('bis_wasmutils');
const wrapperutil=require('bis_wrapperutils');


let Module=0;
let ModulePromise=0;

var initialize=function(binary=null) {

    if (ModulePromise===0) {
        // this calls set_module ...
        ModulePromise=wrapperutil.initialize_wasm(binary);
        ModulePromise.then( (mod) => {
            Module=mod;
            let d="";
            if (mod.bisdate)
                d="(" + mod.bisdate +")";
            d=d+" (memory size="+Module['wasmMemory'].buffer.byteLength/(1024*1024)+" MB)";
            if (Module._uses_gpl())
                console.log('++++ Web Assembly code loaded '+d+', (has GPL plugin. See https://github.com/bioimagesuiteweb/gplcppcode)');
            else
                console.log('++++ Web Assembly code '+d);
        });
    }
    return ModulePromise;
};

var reinitialize=function() {

    if (Module!==0) {
        Module._delete_all_memory();
        Module=0;
        ModulePromise=0;
    }
    return initialize();
}

var get_module=function() {
    return Module;
};


var get_date=function() {
    return "${dt}";     
};
        
`;
    }

    if (wrapper_mode==='python') {

        return `
import math
import os
import platform 
import sys
import numpy as np
import ctypes 
import struct
import json
import biswebpython.core.bis_wasmutils as wasmutil

def initialize_module():

  dirname=os.path.dirname(os.path.abspath(__file__));
  if os.name == 'nt':
      libname=dirname+'\\\\biswasm.dll';
  elif platform.system() == 'Darwin':
      libname=dirname+'/libbiswasm.dylib';
  else:
      libname=dirname+'/libbiswasm.so';

  print('____ Loading library from ',libname);
  wasmutil.load_library(libname);

`;
    }

    return '';
};

// --------------------------------------------------------------------------
var create_module_footer = function()  {
    return `
module.exports=outputobj;
// One day ES6
//export default outputobject;
`;
};
// --------------------------------------------------------------------------
var create_export_object = function(funlist,mode) {

    if (mode==='js') {
        let outtext='';
        outtext+='\n  //-------------------------------------------------------------\n';
        outtext+='\n  const outputobj = { \n';
        outtext+="    initialize : initialize,\n";
        outtext+="    reinitialize : reinitialize,\n";
        outtext+="    get_module : get_module,\n";
        outtext+="    get_date   : get_date,\n";
        for (let i=0;i<funlist.length;i++) {
            outtext+="    "+funlist[i]+' : '+funlist[i];
            if (i<funlist.length-1)
                outtext+=",";
            outtext+='\n';
        }

        outtext+='  };\n';
        return outtext;
    }

    let outtext=`
% -----------------------------------------------------
%
% Main Function
% 
% -----------------------------------------------------

function moduleOutput = biswrapper(bwasm)

    if ~exist('bwasm')
       bwasm=bis_wasmutils();
       [filepath,name,ext] = fileparts(mfilename('fullpath'));
       bwasm.loadlib(filepath);
    end

`;

    outtext+='    biswasm=bwasm;\n';
    for (let i=0;i<funlist.length;i++) {
        outtext+="    moduleOutput."+funlist[i]+'=@'+funlist[i]+';\n';
    }
    outtext+="    moduleOutput.unload=@unload;\n";
    outtext+="    moduleOutput.getbiswasm=@getbiswasm;\n\n";

    outtext+=`
    
   function b = getbiswasm()

      b=biswasm;

   end

   function b = unload()

      b=biswasm.unload();

   end
`;
    
    
    return outtext;
};

// --------------------------------------------------------------------------
var create_function_comment_block=function(outcmt,descline,returnitem,wrapper_mode) {

    wrapper_mode = wrapper_mode || 'js';
    let begintext="  //";
    let ccomment=outcmt;
    if (wrapper_mode==="python" || wrapper_mode==='matlab') {
        if (wrapper_mode==="matlab")
            begintext="  %";
        else
            begintext="#";
        ccomment="";
        let lst=outcmt.split("\n");
        for (let i=0;i<lst.length;i++) {
            ccomment+=begintext+lst[i].trim()+"\n";
        }
    }
    return `
${begintext}--------------------------------------------------------------
${begintext} C++:
${ccomment}${begintext} - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
${begintext} JS: {${descline}}
${begintext}      returns a ${returnitem}
${begintext} - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
`;
    

};

// -----------------------------------------------
// Parse List
// -----------------------------------------------

var parse_function_argument_list=function(lst,var_types,wrapper_mode) {

    
    wrapper_mode = wrapper_mode || 'js';
    let names=[ ];
    let hasdebug=false,hasparam=false;
    let extrachecking=0;
    for (let j=2;j<lst.length;j++) {
        //let k=j-1;
        let shortname=lst[j];
        if (shortname.indexOf('{') < 0) {
            let ind=lst[j].indexOf("_opt");
            let opt=false;
            if (ind>0) {
                shortname=lst[j].substr(0,ind);
                opt=true;
            }

            let varname=var_types[shortname][0] || false;
            if (varname===false) {
                console.log('Unknown '+shortname);
                process.exit(1);
            }
            
            //        let isobj = false;
            
            if (varname==='paramobj')
                hasparam=true;
            
            if (varname==='debug')
                hasdebug=true;
            
            let oname = varname;
            if (varname!=='paramobj' && varname!=='debug')
                oname+=`${j-1}`;
            
            let argname=oname;
            if (var_types[shortname][2])
                argname+='_ptr';
            else if (varname=='paramobj')
                argname='jsonstring';
            else if (var_types[shortname][3]===true && wrapper_mode==="python")
                argname+="_binstr";
            
            names.push({
                variablename : oname,
                bistype : shortname,
                argname : argname,
                optional  : opt,
                argtype : var_types[shortname][1],
                isptr : var_types[shortname][2],
                isstring : var_types[shortname][3],
            });
        } else {
            extrachecking=JSON.parse(shortname);
        }
            
    }

    let isreturnpointer=var_types[lst[1]][2];
    let isreturnstring=var_types[lst[1]][3];
    let returntype=var_types[lst[1]][1];
    
    return { names : names,
             hasdebug : hasdebug,
             isreturnpointer : isreturnpointer,
             isreturnstring  : isreturnstring,
             returntype : returntype,
             extra : extrachecking,
             hasparam : hasparam };
    
};

// --------------------------------------------------------------------------

var create_function_definition=function(fn_name,names,hasdebug,wrapper_mode) {
    
    wrapper_mode = wrapper_mode || 'js';
    let outtext=`  var ${fn_name} = function(`;
    if (wrapper_mode==='python')
        outtext=`def ${fn_name}(`;
    else if (wrapper_mode==='matlab')
        outtext=`  function output = ${fn_name}(`;
    
    for (let j=0;j<names.length;j++) {
        if (j>0)
            outtext+=',';
        outtext+=`${names[j].variablename}`;
    }
    
    let ftext="=false";
    if (wrapper_mode==='python')
        ftext="=False";
    else if (wrapper_mode==="matlab")
        ftext="";
    
    if (hasdebug===false) {
        if (names.length>0)
            outtext+=',debug'+ftext;
        else
            outtext+='debug'+ftext;
    } else {
        if (wrapper_mode==='python')
            outtext+='=0';
    }

    if (wrapper_mode==='matlab') {
        outtext+=')\n\n';
    }  else if (wrapper_mode==='python') {
        outtext+='):\n\n';
        outtext+='    Module=wasmutil.Module();\n\n';
    } else  {
        outtext+=') { \n\n';
    }


    
    return outtext;
};

// --------------------------------------------------------------------------
// Orientation checking etc.
// --------------------------------------------------------------------------

var create_parameter_checking_code=function(extrachecks,names,wrapper_mode) {

    let outstr='';

    if (wrapper_mode=='js') {
        let flag=extrachecks.checkorientation || '';
        if (flag === 'all' || flag.indexOf('js')>=0) {
            outstr=`   if (${names[1].variablename}!==0) {  
        if (${names[0].variablename}.hasSameOrientation(${names[1].variablename},'${names[0].variablename}','${names[1].variablename}',true)===false)
              return false; 
    }

`;
        }
    }  else if (wrapper_mode==='python') {

        let flag=extrachecks.checkorientation || '';
        if (flag === 'all' || flag.indexOf('python')>=0) {
            outstr=`    if (${names[1].variablename} != 0 and ${names[1].variablename} != None ):\n`;
            outstr+=`        if (${names[0].variablename}.hasSameOrientation(${names[1].variablename},'${names[0].variablename}','${names[1].variablename}',True)==False):
           return False;

`;
        }
    } else {

        let flag=extrachecks.checkorientation || '';
        if (flag === 'all' || flag.indexOf('matlab')>=0) {
            let name1=names[0].variablename;
            let name2=names[1].variablename;
            
            outstr=`
    if (${name1}.getOrientation() ~= ${name2}.getOrientation())
       disp(['ERROR Image Orientation mismatch',${name1}.getOrientation(),'  vs ',${name2}.getOrientation()]);
       return
    end

`;
        }
    }

    return outstr;

};
// --------------------------------------------------------------------------
// JavaScript stuff
// --------------------------------------------------------------------------
var create_pointers_js = function(names) {
    
    let outtext='',found=false;
    for (let k=0;k<names.length;k++) {

        let elem=names[k];

        if (elem.isptr===true) {
            let ptrname=elem.argname;
            found=true;
            if (elem.optional===true) {
                outtext+=`    let ${ptrname}=0;\n`;
                outtext+=`    if (${elem.variablename}!==0) \n      `;
            } else {
                outtext+='    let ';
            }
            outtext+=`${ptrname}=wrapperutil.serializeObject(Module,${elem.variablename},'${elem.bistype}');\n`;
        }
    }
    if (found)
        return '\n    // Serialize objects\n'+outtext;
    return outtext;
};

// --------------------------------------------------------------------------
var handle_output_pointer_js=function(outputtype,firstelement) {


    if (outputtype==='bisImage' && firstelement.bistype==="bisImage")
        return `
    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'${outputtype}',${firstelement.variablename});
    
`;

    return `
    // Deserialize Output
    const output=wrapperutil.deserializeAndDeleteObject(Module,wasm_output,'${outputtype}');
`;
};

// --------------------------------------------------------------------------
var create_wasm_function_call_js=function(function_name_in,names,hasparam,isreturnpointer,isreturnstring) {

    let outtext='\n    // Call WASM\n';
    outtext+="    if (debug || debug==='true') console.log('++++\\n++++ Calling WASM Function:"+function_name_in;
    if (hasparam)
        outtext+=" with '+jsonstring+'\\n++++');\n";
    else
        outtext+="\\n++++');\n";

    let outname='wasm_output';
    if (!isreturnpointer && !isreturnstring)
        outname='output';
    
    outtext+="    const "+outname+"=Module.ccall('"+function_name_in+"','number',\n       [";

    for (let k=0;k<names.length;k++) {
        if (k!==0)
            outtext+=', ';
        outtext+=`'${names[k].argtype}'`;
    }
    outtext+='],\n       [ ';

    for (let k=0;k<names.length;k++) {
        if (k!==0)
            outtext+=', ';
        outtext+=names[k].argname;
    }

    
    
    outtext+=']);\n';

    return outtext;

};

// --------------------------------------------------------------------------
var cleanup_pointers_js=function(names) {


    let found=false;
    let outtext="";
    for (let k=0;k<names.length;k++) {
        
        if (names[k].isptr===true) {
            if (names[k].optional===true)
                outtext+='    if ('+names[k].argname+' !==0  && '+  names[k].argname + ' !== '+ names[k].variablename+')\n      ';
            else
                outtext+='    if ('+names[k].argname +' !== '+names[k].variablename+')\n      ';
            outtext+='wasmutil.release_memory(Module,'+names[k].argname+');\n';
            found=true;
        }
    }
    if (found)
        outtext='\n    // Cleanup\n'+outtext;
    return outtext;
};
// --------------------------------------------------------------------------
// Python stuff
// --------------------------------------------------------------------------

var create_pointers_python = function(names) {
    
    let outtext='',found=false;
    for (let k=0;k<names.length;k++) {

        let elem=names[k];
        let ptrname=elem.argname;
        
        if (elem.isstring===true) {
            outtext+=`    ${ptrname}=str.encode(${elem.variablename});\n`;
            found=true;
        } else if (elem.isptr===true) {

            found=true;
            if (elem.optional===true) {
                outtext+=`    ${ptrname}=0\n`;
                outtext+=`    if ${elem.variablename}!=0 and ${elem.variablename}!=None: \n      `;
            } else {
                outtext+='    ';
            }
            outtext+=`${ptrname}=wasmutil.wrapper_serialize(${elem.variablename});\n`;
        }
    }
    if (found)
        return '\n    # Serialize objects and encode strings\n'+outtext;
    return outtext;
};

// --------------------------------------------------------------------------
var handle_output_pointer_python=function(outputtype,firstelement) {

    if (outputtype==='bisImage' && firstelement.bistype==="bisImage")
        return `
    # Deserialize Output
    output=wasmutil.wrapper_deserialize_and_delete(wasm_output,'${outputtype}',${firstelement.variablename});
    
`;

    return `
    # Deserialize Output
    output=wasmutil.wrapper_deserialize_and_delete(wasm_output,'${outputtype}');
    
`;
    
};
// --------------------------------------------------------------------------
var create_wasm_function_call_python=function(function_name_in,names,hasparam,isreturnpointer,isreturnstring,returntype) {

    let outtext='\n    # Call WASM\n';
    if (hasparam)
        outtext+="    if debug:\n        print('++++ Calling WASM Function:"+function_name_in+" with ',jsonstring,'\\n++++');\n\n";
    else
        outtext+="    if debug:\n        print('++++ Calling WASM Function:"+function_name_in+"\\n++++');\n\n";

    outtext+="    Module."+function_name_in+".argtypes=[";
    for (let k=0;k<names.length;k++) {
        if (k!==0)
            outtext+=', ';
        outtext+=names[k].argtype;
    }
    outtext+='];\n';

    let outname='';
    
    if (isreturnpointer || isreturnstring) {
        outname='wasm_output';
        outtext+="    Module."+function_name_in+".restype=ctypes.POINTER(ctypes.c_ubyte);\n\n";
    } else {
        outname='output';
        outtext+="    Module."+function_name_in+".restype="+returntype+";\n\n";
    }
    
    outtext+="    "+outname+"=Module."+function_name_in+'(';


    for (let k=0;k<names.length;k++) {
        if (k!==0)
            outtext+=', ';
        outtext+=names[k].argname;
    }
    
    outtext+=');\n';

    return outtext;

};

// --------------------------------------------------------------------------
// Matlab stuff
// --------------------------------------------------------------------------

var create_pointers_matlab = function(names) {
    
    let outtext='',found=false;
    for (let k=0;k<names.length;k++) {

        let elem=names[k];
        let ptrname=elem.argname;
        
        if (elem.isptr===true) {

            found=true;
            if (elem.optional===true) {
                outtext+=`    ${ptrname}=0;\n`;
                outtext+=`    if ${elem.variablename}~=0\n      `;
            } else {
                outtext+='    ';
            }
            outtext+=`${ptrname}=biswasm.wrapper_serialize(${elem.variablename},'${elem.bistype}');\n`;

            if (elem.optional===true) {
                outtext+='    else\n';
                outtext+=`      ${ptrname}=libpointer();\n`;
                outtext+='    end\n';
            }
        }
    }
    if (found)
        return '\n    % Serialize objects\n'+outtext;
    return outtext;
};

// --------------------------------------------------------------------------
var handle_output_pointer_matlab=function(outputtype,firstelement) {

    if (outputtype==='bisImage' && firstelement.bistype==="bisImage")
    return `
    % Deserialize Output
    output=biswasm.wrapper_deserialize_and_delete(wasm_output,'${outputtype}',${firstelement.variablename});
`;

    return `
    % Deserialize Output
    output=biswasm.wrapper_deserialize_and_delete(wasm_output,'${outputtype}');

 `;

};
// --------------------------------------------------------------------------
var create_wasm_function_call_matlab=function(function_name_in,names,hasparam,isreturnpointer,isreturnstring) {

    let outtext='\n    % Call WASM\n';
    if (hasparam)
        outtext+="    if debug>0\n        fprintf('++++ Calling WASM Function:"+function_name_in+" with %s\\n',jsonstring);\n";
    else
        outtext+="    if debug>0\n        fprintf('++++ Calling WASM Function:"+function_name_in+"\\n');\n";
    outtext+="    end\n";

    let outname='output';
    if (isreturnpointer || isreturnstring) {
        outname='wasm_output';
    } 
    
    outtext+=`    ${outname}=calllib(biswasm.Module,'${function_name_in}'`;


    for (let k=0;k<names.length;k++) {
        outtext+=','+names[k].argname;
    }
    
    outtext+=');\n';

    return outtext;
};


// --------------------------------------------------------------------------
// Main Function
// --------------------------------------------------------------------------
var create_function=function(descline,outcmt,orig,funlist,wrapper_mode) {

    wrapper_mode = wrapper_mode || 'js';
    let lst=descline.split(',');

    let fn_name=lst[0];
    funlist.push(fn_name);
    
    let output_type=lst[1];
    let params=0;

    if (wrapper_mode==='js')
        params=parse_function_argument_list(lst,js_types,'js');
    else if (wrapper_mode==='python')
        params=parse_function_argument_list(lst,python_types,'python');
    else
        params=parse_function_argument_list(lst,js_types,'matlab');
    let names=params.names;    

    console.log(`+++++ Adding ${wrapper_mode} function ${fn_name} (${descline})`);
    let outtext=create_function_comment_block(outcmt,orig,output_type,wrapper_mode);
    outtext+=create_function_definition(fn_name,names,params.hasdebug,wrapper_mode);
    

    if (params.extra!==0) {
        outtext+=create_parameter_checking_code(params.extra,names,wrapper_mode);
    }
    
    if (wrapper_mode=='js') {
        outtext+='    if (debug!==true && debug!=="true" && debug!==1 && debug!==2) debug=0; else if (debug!==2) debug=1;\n';
        if (params.hasparam==true)
            outtext+='    const jsonstring=JSON.stringify(paramobj || { } );\n';
        outtext+=create_pointers_js(names);
        outtext+=create_wasm_function_call_js(fn_name,names,params.hasparam,params.isreturnpointer,params.isreturnstring);
        if (params.isreturnpointer || params.isreturnstring) {
            outtext+=handle_output_pointer_js(output_type,names[0]);
        }           
        outtext+=cleanup_pointers_js(names);
        outtext+='\n    // Return\n    return output;\n  };\n';
    }  else if (wrapper_mode==='python') {
        outtext+='    if debug!=True and debug!=1 and debug!=2:\n        debug=0;\n    elif debug!=2:\n        debug=1;\n\n';
        if (params.hasparam==true) {
            outtext+='    jsonstring_0=json.dumps(paramobj);\n';
            outtext+='    jsonstring=str.encode(json.dumps(paramobj));\n';
        }

        outtext+=create_pointers_python(names);
        outtext+=create_wasm_function_call_python(fn_name,names,params.hasparam,params.isreturnpointer,params.isreturnstring,params.returntype);
        if (params.isreturnpointer || params.isreturnstring) {
            outtext+=handle_output_pointer_python(output_type,names[0]);
        } 
        outtext+='    # Return\n    return output;\n\n';
    }  else {
        outtext+='    if debug~=1 && debug~=2\n        debug=0;\n    end\n';
        if (params.hasparam==true)
            outtext+='    jsonstring=biswasm.json_stringify(paramobj);\n';
        
        outtext+=create_pointers_matlab(names);
        outtext+=create_wasm_function_call_matlab(fn_name,names,params.hasparam,params.isreturnpointer,params.isreturnstring,params.returntype);
        if (params.isreturnpointer || params.isreturnstring) {
            outtext+=handle_output_pointer_matlab(output_type,names[0]);
        }
        outtext+='\n  end\n';
    }
    return outtext;
};

// --------------------------------------------------------------------------
var create_wrappers=function(outfilename,onames,wrapper_mode) {

    wrapper_mode = wrapper_mode || 'js';
    console.log('+++++ bis_create_wrappers for language='+wrapper_mode);
    console.log('+++++\n+++++ beginnning to parse : '+onames.join(' ')+'\n+++++');
    
    let outobj=scan_header_file(onames);
    let fun_list = [];
    
    
    let output_complete_text=create_module_header(wrapper_mode);
    for (let i=0;i< outobj.outdefs.length;i++) {
        output_complete_text+=create_function(outobj.outdefs[i],outobj.outcmt[i],outobj.orig[i],fun_list,wrapper_mode);
    }

    if (wrapper_mode==='js') {
        output_complete_text+=create_export_object(fun_list,'js');
        output_complete_text+=create_module_footer();
    } else if (wrapper_mode==='python') {
        output_complete_text+='\ninitialize_module();\n';
    } else if (wrapper_mode==='matlab') {
        output_complete_text=create_export_object(fun_list,'matlab')+output_complete_text+'\n\nend';
    }
    fs.writeFileSync(program.output,output_complete_text);
    console.log(`+++++\n+++++ Saved ${wrapper_mode} output in ${program.output}\n`);
    return program.output;
};

// --------------------------------------------------------------------------
const program=require('commander');
var help = function() {
    console.log('\nThis program creates the JS wrappers for the WebAssmebly code\n');
};

program.version('1.0.0')
    .option('-o, --output  <s>','output js (or python) filename')
    .option('-p, --python', 'Python Mode')
    .option('--bisdate <s>', 'create bisdate file')
    .option('-m, --matlab', 'Matlab Mode')
    .option('-e, --extra [s]', 'Extra Path to copy output to')
    .option('-i, --input <s>', 'Input header files to parse')
    .on('--help',function() {
        help();
    })
    .parse(process.argv);


if (program.output.length<2 || program.input.length<2) {
    help();
    process.exit(0);
}

const glob_var = {
    output : program.output,
    inputnames : program.input.split(",")
};

let isjs=false;
glob_var.wrapper_mode='js';
var ext=glob_var.output.split('.').pop();
if (program.python || ext==="py") {
    glob_var.wrapper_mode='python';
    if (ext!=="py")
        glob_var.output=glob_var.output+".py";
} else if (program.matlab || ext=="m") {
    glob_var.wrapper_mode='matlab';
    if (ext!=="m")
        glob_var.output=glob_var.output+".m";
} else {
    isjs=true;
    if (ext!=="js") 
        glob_var.output=glob_var.output+".js";
}

let out=create_wrappers(glob_var.output,glob_var.inputnames,glob_var.wrapper_mode);

try {    
    if ( (program.extra || null) !==null && isjs===true ) {
        let text2 = fs.readFileSync(out,'utf-8');
        let opath=path.resolve(program.extra,path.basename(out));
        fs.writeFileSync(opath,text2);
        console.log('+++++ Output also copied to ',opath,'\n');
    }
} catch(e) {
    console.log('----- Not copying extra');
}

if ( (program.bisdate || null ) !==null) {
    let a=getDate("/");
    let b=getTime(1);
    let t= new Date().getTime();
    let output_text=` { "date" : "${a}", "time" : "${b}", "absolutetime" : ${t} , "version": "${appinfo.version}" }`;
    output_text=`module.exports = ${output_text};`;
    fs.writeFileSync(program.bisdate,output_text+'\n');
    console.log('++++ Created date file='+program.bisdate+' ('+output_text+')');
}

    

process.exit(0);
