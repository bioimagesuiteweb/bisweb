% LICENSE
% 
% _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
% 
% BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
% 
% - you may not use this software except in compliance with the License.
% - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
% 
% __Unless required by applicable law or agreed to in writing, software
% distributed under the License is distributed on an "AS IS" BASIS,
% WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
% See the License for the specific language governing permissions and
% limitations under the License.__
% 
% ENDLICENSE

% -----------------------------------------------------
%
% Main Function
% 
% -----------------------------------------------------

function moduleOutput = bis_wasmutils()

  Module='libbiswasm';
  MExtension1='.dylib';
  MExtension2='.so';
  
  if filesep =='\'
    Module='biswasm';
    MExtension1='.dll';
    MExtension2='';
  end
  internal.name='xenios';
  internal.force_large_memory=0;

  moduleOutput.Module=Module;
  moduleOutput.loadlib=@initialize;
  moduleOutput.unload=@unload;
  moduleOutput.redirect_stdout=@redirect_stdout;
  moduleOutput.json_stringify=@json_stringify;
  moduleOutput.get_vector_code=@get_vector_magic_code;
  moduleOutput.get_matrix_code=@get_matrix_magic_code;
  moduleOutput.get_image_code=@get_image_magic_code;
  moduleOutput.get_grid_code=@get_grid_magic_code;
  moduleOutput.get_combo_code=@get_combo_magic_code;
  moduleOutput.get_collection_code=@get_collection_magic_code;
  moduleOutput.release_memory=@release_memory;
  moduleOutput.get_nifti_code=@get_nifti_code;
  moduleOutput.get_type_size=@get_type_size;
  moduleOutput.get_matlab_type_size=@get_matlab_type_size;
  moduleOutput.get_matlab_type=@get_matlab_type;
  moduleOutput.force_large_memory=@force_large_memory;

  % Data Object serialization
  moduleOutput.serialize_dataobject_bytearray=@serialize_dataobject_bytearray;
  moduleOutput.serialize_dataobject=@serialize_dataobject;

  % Serialize transformations
  moduleOutput.serialize_transformation=@serialize_transformation;
  moduleOutput.serialize_gridtransformation=@serialize_gridtransformation;
  moduleOutput.serialize_combotransformation=@serialize_combotransformation;
  
  % Data Object deserialization
  moduleOutput.deserialize_pointer=@deserialize_pointer;
  moduleOutput.deserialize_and_delete_pointer=@deserialize_and_delete_pointer;
  moduleOutput.deserialize_combotransformation_and_delete=@deserialize_combotransformation_and_delete;

  % Master calls
  moduleOutput.wrapper_serialize=@wrapper_serialize;
  moduleOutput.wrapper_deserialize_and_delete=@wrapper_deserialize_and_delete;
  
  code_uint8='uint8';
  code_int32='int32';
  code_float='single';


% -----------------------------------------------------
				% Initialize Library
  function libname = initialize(pathname)

    if ~exist('pathname')
      m=mfilename('fullpath');
      [filepath,name,ext] = fileparts(m);
      [filepath,name,ext] = fileparts(filepath);
      disp('Auto setting pathname');
      pathname=[ filepath filesep 'build' filesep 'native']
    end
      
    libname= strcat(pathname,strcat(filesep,Module));
    l1=strcat(libname,MExtension1);
    l2=strcat(libname,MExtension2);
    if ~exist(l1) && ~exist(l2)
      m=mfilename('fullpath');
      [filepath,name,ext] = fileparts(m);
      [filepath,name,ext] = fileparts(filepath);
      pathname=[ filepath filesep 'build' filesep 'win32' filesep 'Release' ];
      libname= strcat(pathname,strcat(filesep,Module));
      pathname= [ pathname filesep '..' ];
    end

    headerfile=strcat(pathname,strcat(filesep,'bis_matlab.h'));
  

    if ~libisloaded(Module)
      bislib=loadlibrary(libname,headerfile);
      a=calllib(Module,'test_wasm');
      disp(['__']);
      disp(['__ biswasm loading bisweb C++ library']);
      disp(['__ libname=',libname]);
      disp(['__ headerfile=',headerfile]);
      disp(['__ library test -- this should be 1700. return=',mat2str(a)]);
    else
      a=calllib(Module,'test_wasm');
      disp(['__']);
      disp(['__ bisweb C++ library already loaded -- this should be 1700. return=',mat2str(a)]);
    end
    
    disp(['__']);
    
    % Memory mode, 0 = None,1=Matlab only,2=C++ only,3 =both
    force_large_memory(0);


    
  end
  
% -----------------------------------------------------
  function c=redirect_stdout(fname)
    c=calllib(Module,'redirect_stdout',fname);
  end

% Unload Library
  function res = unload()
    disp('____ unloading bisweb C++ library');
    unloadlibrary(Module);
    res=1;
  end

% -----------------------------------------------------  
% force_large_memory
  function res = force_large_memory(val)
    if nargin < 1
        val=3;
    end
    if (val == 1 || val ==3)
        internal.force_large_memory=1;
    else
         internal.force_large_memory=0;
    end
    
    if (val >=2)
       calllib(Module,'set_large_memory_mode',1);
    else
       calllib(Module,'set_large_memory_mode',0);
    end
    
    res=val;
  end


% -----------------------------------------------------  

  function out=json_stringify(obj)

    try
      if obj==0
	out='{ }';
	return;
      end
    catch ME
      % we actually have an object
    end
      
    
    fields=fieldnames(obj);

    out=sprintf('{ ');
    
    for i = 1:numel(fields)
      key=fields{i};
      val=obj.(fields{i});
      found=1;
      outv='';
      if (strcmp(class(val),'char'))
	if strcmp(val,'false')
	  outv= ['  "', key,'": false' ];
	elseif strcmp(val,'true')
	  outv= ['  "', key,'": true' ];
	else
	  outv= ['  "', key,'" : "', val,'"' ];
	end
      else
	outv=[ '  "',key,'" : ',mat2str(val)];
      end

      if i<numel(fields)
	out=sprintf('%s %s, ',out,outv);
      else
	out=sprintf('%s %s ',out,outv);
      end
    end

    out=sprintf('%s}',out);

  end
		     

% -----------------------------------------------------
				% Magic Codes
  function c=get_vector_magic_code()
    c=calllib(Module,'getVectorMagicCode');
  end
  
  function c=get_matrix_magic_code()
    c=calllib(Module,'getMatrixMagicCode');
  end
    
  function c=get_image_magic_code()
    c=calllib(Module,'getImageMagicCode');
  end

  function c=get_grid_magic_code()
    c=calllib(Module,'getGridTransformMagicCode');
  end

  function c=get_combo_magic_code()
    c=calllib(Module,'getComboTransformMagicCode');
  end

  function c= get_collection_magic_code()
    c=calllib(Module,'getCollectionMagicCode');
  end

% -----------------------------------------------------
    
  function c=release_memory(ptr)
    c=callib(Module,'jsdel_array',ptr);
  end



% -----------------------------------------------------  

  function out=get_nifti_code(dt)

    out=-1;
    n=class(dt);

    switch(n)
	  case 'uint8'
	    out=2;
	  case 'int16'
	    out=4;
	  case 'int32'
	    out=8;
	  case 'single'
	    out=16;
	  case 'double'
	    out=64;
	  case 'int8'
	    out=256;
	  case 'uint16'
	    out=512;
	  case 'uint32'
	    out=768;
    end

  end

% -----------------------------------------------------
  
  function out=get_matlab_type_size(n)

    out=1;

    switch(n)
	  case 'uint8'
	    out=1;
	  case 'int16'
	    out=2;
	  case 'int32'
	    out=4;
	  case 'single'
	    out=4;
	  case 'double'
	    out=8;
	  case 'int8'
	    out=1;
	  case 'uint16'
	    out=2;
	  case 'uint32'
	    out=4;
    end

  end

  function out=get_type_size(dt)

    n=class(dt);
    out=get_matlab_type_size(n);

  end
  
% -----------------------------------------------------
  function out=get_matlab_type(n)

    out='';

    switch(n)
    case  2
      out='uint8';
    case  4
      out='int16';
    case  8
      out='int32';
    case  16
      out='single';
    case  64
      out='double';
    case  256
      out='int8';
    case  512
      out='uint16';
    case  768
      out='uint32';
    end

  
  end

% -----------------------------------------------------
  
  function out=serialize_dataobject_bytearray(mat,spa,debug,forceimage)

    if nargin < 2
      spa=[1.0,1.0,1.0,1.0,1.0 ];
    end

    if nargin < 3
      debug=0;
    end

    if nargin < 4
        forceimage=0;
    end

    shp=size(mat);
    l1=length(shp);

    
    if l1<1 || l1>5
      error('Bad Matrix Shape',shp,l);
      return;
    end

    
    if l1==2 && ( shp(1)==1 || shp(2)==1)
      if debug>0
          disp('it is really a vector')
          disp(shp);
      end
      mat=reshape(mat,1,prod(shp));
      shp= [ shp(1)*shp(2),1,1,1,1 ];
      l1=1;
    end
      
    if debug > 0
      disp(['shape and length=']);
      disp([shp,l1])
    end

    if l1<5
      d=[1,1,1,1,1];
      shp=cat(2,shp,d(1:(5-l1)));
    end

    l2=length(spa);
    if l2<5
      d=[1,1,1,1,1];
      spa=cat(2,spa,d(1:(5-l2)));
    end

    dimensions=zeros(1,5,code_int32);
    dimensions(1:5)=shp(1:5);

    spacing=zeros(1,5,code_float);
    spacing(1:5)=spa(1:5);

    itemsize=get_type_size(mat);
    
    top_header=zeros(1,4,code_int32);
    mode=1;
    totallength=1;

    if l1==1 && forceimage == 0
      top_header(1)=get_vector_magic_code();
      top_header(2)=get_nifti_code(mat);
      top_header(3)=0;
      top_header(4)=itemsize*dimensions(1);
      totallength=dimensions(1)*itemsize;
      mode=1;
    elseif l1==2 && forceimage == 0
      top_header(1)=get_matrix_magic_code();
      top_header(2)=get_nifti_code(mat);
      top_header(3)=8;
      top_header(4)=itemsize*dimensions(1)*dimensions(2);
      dimensions=[dimensions(1),dimensions(2) ];
      totallength=dimensions(1)*dimensions(2)*itemsize;
      if totallength > 2147483648 || internal.force_large_memory>0
         disp(['==== MATLAB serializing large memory: ',mat2str(dimensions)]);
         top_header(4)=-itemsize;
      end    
      mode=2;
    else
      top_header(1)=get_image_magic_code();
      size(mat);
      top_header(2)=get_nifti_code(mat);
      top_header(3)=40;
      totallength=prod(dimensions)*itemsize;
      top_header(4)=prod(dimensions)*itemsize;

      if totallength > 2147483647 || internal.force_large_memory>0
         disp(['==== MATLAB serializing large memory: ',mat2str(dimensions)]);
         top_header(4)=-itemsize;
      end    
      mode=3;
    end

    

%    disp('---------------------------------------\nheader');
%    disp(dimensions);
%    disp(top_header)
%    disp('mode');
%    disp(mode);
    
    head_b=typecast(top_header,code_uint8);

    % Transpose if matrix
    if mode==2
      m2=reshape(transpose(mat),1,prod(dimensions));
    else
      m2=reshape(mat,1,prod(dimensions));
    end
    
    data_b=typecast(m2,code_uint8);

    if mode==1
      out=cat(2,head_b,data_b);
    elseif mode==2
      dim_b=typecast(dimensions,code_uint8);
      out=cat(2,head_b,dim_b,data_b);
    else
      dim_b=typecast(dimensions,code_uint8);
      spa_b=typecast(spacing,code_uint8);
      out=cat(2,head_b,dim_b,spa_b,data_b);
    end

  end

  % -----------------------------------------------------
  
  function out=serialize_dataobject(mat,spa,debug,forceimage)

    if nargin < 2
      spa=[1.0,1.0,1.0,1.0,1.0 ];
    end

    if nargin < 3
        forceimage=0;
    end

    if nargin < 3
      debug=0;
    end

    ptr=serialize_dataobject_bytearray(mat,spa,debug,forceimage);
    out=libpointer('voidPtr',ptr);
  end
  
    

  % -----------------------------------------------------
  function out=deserialize_pointer(ptr,offset,other)

    hasother=1;

    if nargin < 2
      offset=0;
    end

    if nargin < 3
      hasother=0;
    end

    
    reshape(ptr,16+offset,1);
    top_header=typecast(ptr.Value(1+offset:16+offset),code_int32);
    typename=get_matlab_type(top_header(2));
    headersize=top_header(3);
    data_bytelength=top_header(4);
    if (data_bytelength<0)
      disp('==== MATLAB large image deserialize');
      % Xenios to add
      reshape(ptr,36+offset,1);
      dim=typecast(ptr.Value(17+offset:36+offset),code_int32);
      switch(top_header(1))
        case get_matrix_magic_code()
            data_bytelength=-data_bytelength*dim(2)*dim(1);
        case get_image_magic_code()
            data_bytelength=-data_bytelength*dim(1)*dim(2)*dim(3)*dim(4)*dim(5);
      end
      disp(['====        fixed bytelength=',mat2str(data_bytelength),' th=',mat2str(top_header(4)),' dm=',mat2str(dim)]);
    end
    typesize=get_matlab_type_size(typename);
    data_length=data_bytelength/typesize;

    total_length=16+headersize+data_bytelength;

%    disp('--------------------------------------')
%    disp([' top_header=',mat2str(top_header),' offset=',mat2str(offset), ' total=',mat2str(total_length) ]);
    reshape(ptr,total_length+offset,1);
    rawdata=ptr.Value;

    switch(top_header(1))
      case get_matrix_magic_code()
	dimensions=typecast(rawdata(17+offset:24+offset,:),code_int32);
	data=typecast(rawdata(25+offset:total_length+offset,1:1),typename);
	out=transpose(reshape(data,dimensions(2),dimensions(1)));
      case get_vector_magic_code()
	out=typecast(rawdata(17+offset:total_length+offset,1:1),typename);
      case get_image_magic_code()
	      
	dimensions=typecast(rawdata(17+offset:36+offset,:),code_int32);
    	tmp=typecast(rawdata(57+offset:total_length+offset,1:1),typename);
	img=reshape(tmp,dimensions(1),dimensions(2),dimensions(3),dimensions(4),dimensions(5));
	sp=typecast(rawdata(37+offset:56+offset,:),code_float);
        
        if hasother > 0
          affine=other.getAffine();
        else
          affine=eye(4);
          affine(1,1)=sp(1);
          affine(2,2)=sp(2);
          affine(3,3)=sp(3);
        end
        out=bis_image();
        out.create(img,sp,affine);
        
      case get_grid_magic_code()
        out={ };
        out.usebspline=typecast(rawdata(17+offset:20+offset,:),code_int32);
        dimensions=typecast(rawdata(21+offset:32+offset,:),code_int32);
        out.spacing=typecast(rawdata(33+offset:44+offset,:),code_float);
        out.origin=typecast(rawdata(45+offset:56+offset,:),code_float);
        tmp=typecast(rawdata(57+offset:total_length+offset,1:1),typename);
        out.data=(reshape(tmp,dimensions(1)*dimensions(2)*dimensions(3),3));
        out.dimensions=dimensions;
    end
      
  end

  % -----------------------------------------------------
  % Grid Transform is serialized separately
  % -----------------------------------------------------
    

  function out=serialize_gridtransformation(grid,asbytes,debug)

    if nargin < 2
      asbytes=0;
    end

    if nargin < 3
      debug=0;
    end

    i_head=zeros(1,8,code_int32);
    f_head=zeros(1,6,code_float);

    itemsize=get_type_size(grid.data);
    
    i_head(1)=get_grid_magic_code();
    i_head(2)=get_nifti_code(grid.data);
    i_head(3)=40;
    i_head(4)=itemsize*grid.dimensions(1)*grid.dimensions(2)*grid.dimensions(3)*3;
    i_head(5)=grid.usebspline;
    
    for i=1:3
      i_head(5+i)=grid.dimensions(i);
      f_head(i)=grid.spacing(i);
      f_head(i+3)=grid.origin(i);
    end

    head_b=typecast(i_head,code_uint8);
    fhead_b=typecast(f_head,code_uint8);

    m2=reshape((grid.data),1,prod(grid.dimensions)*3);
    data_b=typecast(single(m2),code_uint8);
    
    out=cat(2,head_b,fhead_b,data_b);

    if asbytes==0
      print('grid to bytes');
      out=libpointer('voidPtr',out);
    end

  end
  
  % -----------------------------------------------------
  % Combo Transform is harder so do this separately
  % -----------------------------------------------------
    
  function out=serialize_combotransformation(combo,debug)

    if nargin < 2
      debug=0;
    end

    data=serialize_dataobject_bytearray(single(combo.linear));

    if (debug>0)
        disp([' length of data=',mat2str(size(data)) ]);
    end
    
    for i=1:combo.numgrids
      g=serialize_gridtransformation(combo.grids{i},1);
      if (debug>0)
        disp([' length of g=',mat2str(size(g)) ]);
      end
      data=cat(2,data,g);
      if (debug>0)
        disp([' length of data=',mat2str(size(data)) ]);
      end
    end

    i_head=zeros(1,5,code_int32);
    i_head(1)=get_combo_magic_code();
    i_head(2)=16;
    i_head(3)=4;
    i_head(4)=length(data);
    i_head(5)=combo.numgrids;

    head_b=typecast(i_head,code_uint8);

    if (debug>0)
        disp([' length of head_b=',mat2str(size(head_b)) ]);
    end
    data=cat(2,head_b,data);

    if (debug>0)
        disp([' length of data=',mat2str(size(data)) ]);
    end
    
    out=libpointer('voidPtr',data);
  end



  function out=serialize_transformation(xform,debug)

    try
      a=size(xform);
      if a(1)==4 && a(2)==4
	      out=serialize_dataobject(xform);
	      return;
      end
    catch ME
    end

    try
      a=xform.usebspline;
      if a==0 || a==1
	        out=serialize_combotransformation(xform);
	        return;
      end
    catch ME
    end

    out=serialize_gridtransformation(xform);
  end
  % ----------------------------------------------------------------------------------------------------------------

  function out=deserialize_and_delete_pointer(ptr,other)
    out=deserialize_pointer(ptr,0,other);
    calllib(Module,'jsdel_array',ptr);
  end


  function out=deserialize_combotransformation_and_delete(ptr,offset)

    if nargin < 2
      offset=0;
    end

    reshape(ptr,20,1);
    top_header=typecast(ptr.Value(1+offset:20+offset),code_int32);
    typename=get_matlab_type(top_header(2));
    headersize=top_header(3);
    data_bytelength=top_header(4);
    typesize=get_matlab_type_size(typename);
    data_length=data_bytelength/typesize;
    numgrids=top_header(5);

    
    if (get_combo_magic_code()~=top_header(1) || numgrids<1)
      error('Bad ptr to deserialize combo transformation from');
      out=0;
      return;
    end

    out= { };
    out.numgrids=numgrids;
    offset=offset+20;
    out.linear=deserialize_pointer(ptr,offset);
    offset=offset+16+8+4*4*4;

    out.grids= { };
    
    for grid = 1 : numgrids

      g=deserialize_pointer(ptr,offset);
      out.grids{grid} = g;
      sz=4*3*g.dimensions(1)*g.dimensions(2)*g.dimensions(3)+56;
      offset=offset+sz;
    end

    % now delete
    calllib(Module,'jsdel_array',ptr);
    
  end

  function out=deserialize_and_delete_string(ptr)

    reshape(ptr,16,1);
    top_header=typecast(ptr.Value(1:16),code_int32);

    if top_header(1) ~= get_vector_magic_code()
      error('Bad String to deserialize');
      return;
    end
    
    typename=get_matlab_type(top_header(2));
    headersize=top_header(3);
    data_bytelength=top_header(4);

    typesize=get_matlab_type_size(typename);
    data_length=data_bytelength/typesize;

    total_length=16+headersize+data_bytelength;
    
    reshape(ptr,total_length,1);
    rawdata=ptr.Value;
    out_bin=typecast(rawdata(17:total_length,1:1),typename);
    out=char(transpose(out_bin));
    calllib(Module,'jsdel_array',ptr);
  end

		%  -----------------------------------------------------------
		% Called by wrapper code
  		%  -----------------------------------------------------------

  function out =wrapper_serialize(obj,datatype)

    switch(datatype)
      case 'bisImage'         
            spa=obj.getSpacing();
            out=serialize_dataobject(obj.getImageData(),transpose(spa),0,1);
      case 'bisTransformation'
	        out=serialize_transformation(obj);
      case 'bisComboTransformation'
	        out=serialize_combotransformation(obj);
      case 'bisGridTransformation'
	        out=serialize_gridtransformation(obj);
      otherwise
	        out=serialize_dataobject(obj);
    end

  end

  function out =wrapper_deserialize_and_delete(ptr,datatype,other)    

    if nargin<3
        other=0;
    end

    switch(datatype)
      case 'bisComboTransformation'
	    out=deserialize_combotransformation_and_delete(ptr);
      case 'String'
	    out=deserialize_and_delete_string(ptr);
      otherwise
	    out=deserialize_and_delete_pointer(ptr,other);
    end
    
  end
  
end

