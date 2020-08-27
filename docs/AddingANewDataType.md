This document contains [developer documentation](README.md) for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). 

---

# Adding a New Data Object Type in BisWeb (JavaScript/Python/C++) 

## List of Steps

We will use the Surface class as an example. Basically there are 3-4 steps for
each language

1. Create an implementation for the data object type
2. Register it with the serialization/deserialization layers
3. Add code to data object factories to create an object of this type.
4. In JS and Python: Modify the wrapper generation code to account for this type.

### C++ 

1. Implement the C++ version in src/cpp (see bisSurface.h,
   bisSurface.cpp). The class must derive (directly or indirectly) from
   bisDataObject. It must implement the four abstract methods in this namely:
   
        virtual unsigned char* serialize();
        virtual void serializeInPlace(unsigned char* output)=0;
        virtual int deSerialize(unsigned char* pointer)=0;
        virtual long getRawSize()=0;
      
2. Declare a magic code (for serialization/deserialization purposes in
   bisDataTypes.h). This must be unique
   
        /** Magic number for collection object=20006 for serialization */
        const int s_surface=20007;

    Also add a function in bisExportedFunction.cpp that defines the magic type (and
    its corresponding declartion in bisExportedFunction.h)
   
        BISEXPORT int getSurfaceMagicCode();
        int getSurfaceMagicCode() { return bisDataTypes::s_surface; }

4. Modify bisDataObjectFactory::desrializeSimpleDataObjectTemplate (in
   bisDataObjectFactory) to create a an object of this type
   
   
        if (magic_type==bisDataTypes::s_surface)   {
          std::shared_ptr<bisSurface> obj(new bisSurface(name));
          if (obj->deSerialize(pointer))
             return obj;
        }


### JS

1. Create a class in js/dataobjects to implement this. In this case, this is
   the file `bisweb_surface.js`. This should implement the following functions
   (at a bare minimum) (see `bisweb_dataobject.js`)
   
        getObject
        getDescription()
        computeHash()
        getMemorySize()
        load()
        save()
        serializeToDictionary()
        parseFromDictionary()
        serializeWASM()
        getWASMNumberOfBytes();
        deserializeWASM()
        compareWithOther()
        
2. Add and export a function in `core/bis_wasmutils.js` to return the magic code

        var get_surface_magic_code=function(Module) { return Module._getSurfaceMagicCode(); };
        
   Also add code in `core/bis_wrapperutils.js` deserializeAndDeleteObject to deserialize this
   object e.g.
   
        if (datatype==='bisSurface' || datatype==='surface' || datatype==='Surface') {
          let output=new BisWebSurface();
          output.deserializeWasmAndDelete(Module,ptr);
          return output;
        }

3. Add code in `dataobjects/bisweb_dataobjectcollection.js` to instantiate an
   object of this class (in functions parseObject and loadObject)
   
4. Modify the wrapper generator script `compiletools/bis_create_wrappers.js`
   to create info about the name 'bisSurface' (used in the C++ code headers)
   to denote this class. (This also applies to python)
   
   
### Python

1. Create a class bisSurface (for now in
   `biswebpython/core/bis_objects.py`). This should implement at a mimimum:
       getRawSize()
       serializeWasm()
       deserializeWasm()
       load()
       save()
       getDescription()
       

2. Modify the file `biswebpython/core/bis_wasmutils.py` to:

    * add a function getSurfaceMagicCode()
    * modify the getNameFromMagicCode() function to handle surfaces
    * modify the deserialize_object() function to handle surfaces

3. Modify the function `loadSingleInput` in `biswebpython/core/bis_basemodule.py` to load
   surfaces
    
   Also modify the function `processTestResult` in
   `biswebpython/core/bis_commandline.py` to compare surfaces
   
4. Modify the wrapper generator script `compiletools/bis_create_wrappers.js`
   to create info about the name 'bisSurface' (used in the C++ code headers)
   to denote this class. (This also applies to JS)
   

   
       
   





        
