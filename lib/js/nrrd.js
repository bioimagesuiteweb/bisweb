"use strict";
var assert = require('assert');

var lineSeparatorRE = /[ \f\t\v]*\r?\n/;
var NRRDMagicRE = /^NRRD\d{4}$/;
var lineRE = /^([^:]*)(:[ =])(.*)$/;
var dataFileListRE = /^LIST(?: (\d+))?$/;

// The minimal object this accepts is formed like this:
//   {data: SomeTypedArray, sizes: [...]}
// On the other hand, if data is not given it must have a form like this:
//   {buffer: SomeArrayBuffer, type: ..., endian: ..., sizes: [...]}
// Of course, if 'type' is an 8-bit type, endian is not needed, and if 'type' equals 'block', 'blockSize' should be set instead of 'endian'. In this case, no interpretation of buffer is done (at all, it is written serialized directly to the buffer).
// TODO: For now this only supports serializing "inline" files, or files for which you have already prepared the data.
module.exports.serialize = function (nrrdOrg) {
    var i, buffer, arr, totalLen = 1, nrrd = {}, prop, nativeType, nativeSize, bufferData, arrData, line, lines = [], header;
    
    // Copy nrrdOrg to nrrd to allow modifications without altering the original
    for(prop in nrrdOrg) {
        nrrd[prop] = nrrdOrg[prop];
    }
    
    // For saving files we allow inferring certain information if it is not explicitly given.
    // Also we normalize some fields to make our own lives easier.
    if (nrrd.sizes===undefined) { // 'sizes' should ALWAYS be given
        throw new Error("Sizes missing from NRRD file!");
    } else if (nrrd.dimension===undefined) {
        nrrd.dimension = nrrd.sizes.length;
    }
    if (nrrd.data instanceof Int8Array) {
        nativeType = "int8";
    } else if (nrrd.data instanceof Uint8Array) {
        nativeType = "uint8";
    } else if (nrrd.data instanceof Int16Array) {
        nativeType = "int16";
    } else if (nrrd.data instanceof Uint16Array) {
        nativeType = "uint16";
    } else if (nrrd.data instanceof Int32Array) {
        nativeType = "int32";
    } else if (nrrd.data instanceof Uint32Array) {
        nativeType = "uint32";
    //} else if (nrrd.data instanceof Int64Array) {
    //    nativeType = "int64";
    //} else if (nrrd.data instanceof Uint64Array) {
    //    nativeType = "uint64";
    } else if (nrrd.data instanceof Float32Array) {
        nativeType = "float";
    } else if (nrrd.data instanceof Float64Array) {
        nativeType = "double";
    }
    if (nrrd.type===undefined && nativeType!==undefined) {
        nrrd.type = nativeType;
    } else if (nrrd.type===undefined) {
        throw new Error("Type of data is not given and cannot be inferred!");
    } else if ((typeof nrrd.type) == "string" || nrrd.type instanceof String) {
        nrrd.type = parseNRRDType(nrrd.type);
    }
    if (nrrd.encoding===undefined) {
        nrrd.encoding = "raw";
    } else if ((typeof nrrd.encoding) == "string" || nrrd.encoding instanceof String) {
        nrrd.encoding = parseNRRDEncoding(nrrd.encoding);
    }
    if (nrrd.data && nrrd.type != 'block' && nrrd.type != 'int8' && nrrd.type != 'uint8' && nrrd.encoding != 'ascii') {
        nrrd.endian = systemEndianness;
    } else if (nrrd.type == 'block' || nrrd.type == 'int8' || nrrd.type == 'uint8' || nrrd.encoding == 'ascii') {
        nrrd.endian = undefined;
    } else if ((typeof nrrd.endian) == "string" || nrrd.endian instanceof String) {
        nrrd.endian = parseNRRDEndian(nrrd.endian);
    }
    
    // Try to infer spatial dimension
    var spaceDimension = undefined;
    if (nrrd.spaceDimension!==undefined) {
        spaceDimension = nrrd.spaceDimension;
    } else if (nrrd.space!==undefined) {
        switch(nrrd.space) {
        case "right-anterior-superior":
        case "RAS":
            spaceDimension = 3;
            break;
        case "left-anterior-superior":
        case "LAS":
            spaceDimension = 3;
            break;
        case "left-posterior-superior":
        case "LPS":
            spaceDimension = 3;
            break;
     	  case "right-anterior-superior-time":
     	  case "RAST":
     	      spaceDimension = 4;
     	      break;
        case "left-anterior-superior-time":
        case "LAST":
            spaceDimension = 4;
            break;
        case "left-posterior-superior-time":
        case "LPST":
            spaceDimension = 4;
            break;
        case "scanner-xyz":
            spaceDimension = 3;
            break;
        case "scanner-xyz-time":
            spaceDimension = 4;
            break;
        case "3D-right-handed":
            spaceDimension = 3;
            break;
        case "3D-left-handed":
            spaceDimension = 3;
            break;
        case "3D-right-handed-time":
            spaceDimension = 4;
            break;
        case "3D-left-handed-time":
            spaceDimension = 4;
            break;
        default:
            console.warn("Unrecognized space: " + nrrd.space);
        }
    }
    
    // Now check that we have a valid nrrd structure.
    checkNRRD(nrrd);

    // Determine number of elements and check that we have enough data (if possible)
    for(i=0; i<nrrd.sizes.length; i++) {
        if (nrrd.sizes[i]<=0) throw new Error("Sizes should be a list of positive (>0) integers!");
        totalLen *= nrrd.sizes[i];
    }
    if (nrrd.data) {
        if (nrrd.data.length < totalLen) {
            throw new Error("Missing data to serialize!");
        }
    } else if (nrrd.buffer) {
        if (nrrd.encoding == "raw") {
            if (nrrd.type=="block" && nrrd.blockSize!==undefined) {
                nativeSize = nrrd.blockSize;
            } else {
                nativeSize = getNRRDTypeSize(nrrd.type);
            }
            if (nrrd.buffer.byteLength < totalLen*nativeSize) {
                throw new Error("Missing data to serialize!");
            }
        }
    } else if (nrrd.dataFile) {
        // Okay, if you have your data ready, we'll just write a header.
    } else {
        throw new Error("Will not serialize an empty NRRD file!");
    }
    
    // Make sure we have the correct buffer in bufferData.
    if (nrrd.data) {
        switch(nrrd.encoding) {
        case 'raw':
            if (nrrd.type == nativeType && nrrd.endian == systemEndianness) {
                bufferData = nrrd.data.buffer.slice(nrrd.data.byteOffset, nrrd.data.byteOffset+nrrd.data.byteLength);
            } else if (nrrd.endian == systemEndianness) {
                bufferData = castTypedArray(nrrd.data, nrrd.type);
                bufferData = bufferData.buffer.slice(bufferData.byteOffset, bufferData.byteOffset+bufferData.byteLength);
            } else {
                bufferData = serializeToBuffer(nrrd.data, nrrd.type, nrrd.endian);
            }
            break;
        case 'ascii':
            if (nrrd.type == nativeType) {
                bufferData = serializeToTextBuffer(nrrd.data);
            } else {
                bufferData = serializeToTextBuffer(castTypedArray(nrrd.data, nrrd.type));
            }
            break;
        default:
            throw new Error("Unsupported NRRD encoding: " + nrrd.encoding);
        }
    } else if (nrrd.buffer) {
        bufferData = nrrd.buffer;
    }
    
    // Start header
    lines.push("NRRD0005"); // TODO: Adjust version based on features that are actually used and/or the version specified by the user (if any).
    lines.push("# Generated by nrrd-js");
    
    // Put in dimension and space dimension (the NRRD spec requires that these are present before any lists whose length depends on them)
    var firstProps = ['dimension', 'spaceDimension', 'space'];
    for(i=0; i<firstProps.length; i++) {
        prop = firstProps[i];
        if (nrrd[prop] === undefined) continue; // Skip things we explicitly set to undefined.
        line = serializeField(prop, nrrd[prop], nrrd.dimension, spaceDimension);
        if (line!==undefined) lines.push(line);
    }
    
    // Put in field specifications
    for(prop in nrrd) {
        if (nrrd[prop] === undefined) continue; // Skip things we explicitly set to undefined.
        if (firstProps.indexOf(prop)>=0) continue; // Skip the fields we already output.
        line = serializeField(prop, nrrd[prop], nrrd.dimension, spaceDimension);
        if (line!==undefined) lines.push(line);
    }
    
    // Put in keys (if any)
    if (nrrd.keys) for(prop in nrrd.keys) {
        if (prop.indexOf(":=")>=0) throw new Error("The combination ':=' is not allowed in an NRRD key!");
        lines.push(prop + ":=" + escapeValue(nrrd[prop]));
    }
    
    // Put in data file list (if any)
    if (nrrd.dataFile && nrrd.dataFile.length) {
        lines.push("data file: LIST");
        Array.prototype.push.apply(lines, nrrd.dataFile);
    } else if (nrrd.dataFile && nrrd.dataFile.files && 'subdim' in nrrd.dataFile) {
        lines.push("data file: LIST " + nrrd.dataFile.subdim);
        Array.prototype.push.apply(lines, nrrd.dataFile.files);
    }
    
    // Put in empty line and inline data (if we have inline data) and convert lines to buffer
    if (bufferData && !('dataFile' in nrrd)) {
        lines.push("");
        lines.push(""); // We actually need an extra blank line to make sure the previous is terminated.
        header = lines.join("\n");
        buffer = new ArrayBuffer(header.length + bufferData.byteLength);
        arr = new Uint8Array(buffer);
        for(i=0; i<header.length; i++) {
            arr[i] = header.charCodeAt(i);
        }
        arrData = new Uint8Array(bufferData);
        arr.set(arrData, header.length);
    } else {
        lines.push(""); // Blank line to at least terminate the last line.
        header = lines.join("\n");
        buffer = new ArrayBuffer(header.length);
        arr = new Uint8Array(buffer);
        for(i=0; i<header.length; i++) {
            arr[i] = header.charCodeAt(i);
        }
    }
    
    return buffer;
};

// This expects an ArrayBuffer.
module.exports.parse = function (buffer) {
    var i, header, dataStart, ret = {data: undefined/* parsed data */, buffer: undefined/* raw buffer holding data */, keys: {}, version: undefined},
        lines, match, match2,
        buf8 = new Uint8Array(buffer);

    // A work-around for incompatibilities between Node's Buffer and ArrayBuffer.
    if (buf8.buffer !== buffer) buffer = buf8.buffer;

    // First find the separation between the header and the data (if there is one)
    // Note that we need to deal with with LF and CRLF as possible line endings.
    // Luckily this means the line always ends with LF, so we only need to consider
    // LFLF and LFCRLF as patterns for the separating empty line.
    i=2; // It is safe to start at position 2 (in fact, we could start even later), as the file HAS to start with a magic word.
    while(i<buf8.length) {
        if (buf8[i] == 10) { // We hit an LF
            if (buf8[i-1] == 10 || (buf8[i-1] == 13 && buf8[i-2] == 10)) { // Safe because we start at position 2 and never move backwards
                dataStart = i+1;
                break;
            } else {
                i++; // Move forward just once
            }
        } else if (buf8[i] == 13) { // We hit a CR
            i++; // Move forward just once
        } else {
            i += 2; // Move forward two places, 
        }
    }
    
    // Now split up the header and data
    if (dataStart === undefined) {
        header = String.fromCharCode.apply(null, buf8);
    } else {
        header = String.fromCharCode.apply(null, buf8.subarray(0,dataStart));
        ret.buffer = buffer.slice(dataStart);
    }
    
    // Split header into lines, remove comments (and blank lines) and check magic.
    // All remaining lines except the first should be field specifications or key/value pairs.
    // TODO: This explicitly removes any whitespace at the end of lines, however, I am not sure that this is actually desired behaviour for all kinds of lines.
    lines = header.split(lineSeparatorRE);
    lines = lines.filter(function (l) { return l.length>0 && l[0] != '#'; }); // Remove comment lines
    if (!NRRDMagicRE.test(lines[0])) {
        throw new Error("File is not an NRRD file!");
    }
    ret.version = parseInt(lines[0].substring(4, 8), 10);
    if (ret.version>5) {
        console.warn("Reading an unsupported version of the NRRD format; things may go haywire.");
    }

    // Parse lines
    for(i=1; i<lines.length; i++) {
        match = lineRE.exec(lines[i]);
        if (!match) {
            console.warn("Unrecognized line in NRRD header: " + lines[i]);
            continue;
        }
        if (match[2] == ': ') { // Field specification
            match[1] = mapNRRDToJavascript(match[1]);
            if ( match[1] == 'dataFile' &&
                 (match2 = dataFileListRE.exec(match[3]))) {
                // This should be the last field specification,
                // and the rest of the lines should contain file names.
                if (match2.length == 2 && match2[1]) { // subdim specification
                    ret[match[1]] = {
                        files: lines.slice(i+1),
                        subdim: parseNRRDInteger(match2[1])
                    };
                } else {
                    ret[match[1]] = lines.slice(i+1);
                }
                lines.length = i;
            } else {
                ret[match[1]] = parseField(match[1], match[3]);
            }
        } else if (match[2] == ':=') { // Key/value pair
            ret.keys[match[1]] = unescapeValue(match[3]);
        } else {
            throw new Error("Logic error in NRRD parser."); // This should never happen (unless the NRRD syntax is extended and the regexp is updated, but this section is not, or some other programmer error).
        }
    }

    // Make sure the file satisfies the requirements of the NRRD format
    checkNRRD(ret);
    
    // "Parse" data
    if ('dataFile' in ret) {
        console.warn("No support for external data yet!");
    } else {
        switch(ret.encoding) {
        case 'raw':
            ret.data = parseNRRDRawData(ret.buffer, ret.type, ret.sizes, {
                endian: ret.endian, blockSize: ret.blockSize
            });
            break;
        case 'ascii':
            ret.data = parseNRRDTextData(ret.buffer, ret.type, ret.sizes);
            break;
        default:
            console.warn("Unsupported NRRD encoding: " + ret.encoding);
        }
    }
    
    return ret;
};

function escapeValue(val) {
    return val.replace('\\', '\\\\').replace('\n', '\\n');
}

function unescapeValue(val) {
    return val.split('\\\\').map(
        function(s) { return s.replace('\\n', '\n'); }
        ).join('\\');
}

// Serializes NRRD fields
function serializeField(prop, value, dimension, spaceDimension) {
    var line;
    var propNRRD = mapJavascriptToNRRD(prop);
    switch(prop) {
    // nrrd-js stuff: skip
    case 'data':
    case 'buffer':
    case 'keys':
    case 'version':
        break;
    // Literal (uninterpreted) fields
    case 'content':
    case 'number':
    case 'sampleUnits':
    case 'space':
        line = propNRRD + ": " + value;
        break;
    // Integers (no infinity or whatever, just a plain integer, so the default serialization is good enough)
    case 'blockSize':
    case 'lineSkip':
    case 'byteSkip':
    case 'dimension':
    case 'spaceDimension':
        assert((typeof value) == "number" || value instanceof Number, "Field " + prop + " should at least contain a number!");
        line = propNRRD + ": " + value;
        break;
    // Floats (default serialization is good enough, as NaN contains nan, ignoring case, and similarly for Infinity inf)
    case 'min':
    case 'max':
    case 'oldMin':
    case 'oldMax':
        assert((typeof value) == "number" || value instanceof Number, "Field " + prop + " should contain a number!");
        line = propNRRD + ": " + value;
        break;
    // Vectors
    case 'spaceOrigin':
        assert(value.length === spaceDimension, "Field " + prop + " should be a list with length equal to the space dimension!");
        value.forEach(function (val) { assert((typeof val) == "number" || val instanceof Number, "Field " + prop + " should be a list of numbers!"); });
        line = propNRRD + ": (" + value.join(",") + ")";
        break;
    // Lists of strings
    case 'labels':
    case 'units':
    case 'spaceUnits':
        assert(value.length !== undefined && value.length == dimension, "Field " + prop + " should be a list with length equal to the dimension!");
        value.forEach(function (val) { assert((typeof val) == "string" || val instanceof String, "Field " + prop + " should be a list of numbers!"); });
        line = propNRRD + ": " + value.map(serializeNRRDQuotedString).join(" ");
        break;
    // Lists of integers
    case 'sizes':
        assert(value.length !== undefined && value.length == dimension, "Field " + prop + " should be a list with length equal to the dimension!");
        value.forEach(function (val) { assert((typeof val) == "number" || val instanceof Number, "Field " + prop + " should be a list of numbers!"); });
        line = propNRRD + ": " + value.join(" ");
        break;
    // Lists of floats
    case 'spacings':
    case 'thicknesses':
    case 'axisMins':
    case 'axisMaxs':
        assert(value.length !== undefined && value.length == dimension, "Field " + prop + " should be a list with length equal to the dimension!");
        value.forEach(function (val) { assert((typeof val) == "number" || val instanceof Number, "Field " + prop + " should be a list of numbers!"); });
        line = propNRRD + ": " + value.join(" ");
        break;
    // Lists of vectors (dimension sized)
    case 'spaceDirections':
        assert(value.length !== undefined && value.length === dimension, "Field " + prop + " should be a list with length equal to the dimension!");
        value.forEach(function (vec) {
          assert(vec === null || (vec.length !== undefined && vec.length === spaceDimension), "The elements of field " + prop + " should be lists with length equal to the space dimension!");
          if (vec !== null) vec.forEach(function (val) { assert((typeof val) == "number" || val instanceof Number, "The elements of field " + prop + " should be lists of numbers!"); });
        });
        line = propNRRD + ": " + value.map(function(vec) { return vec === null ? "none" : ("(" + vec.join(",") + ")"); }).join(" ");
        break;
    // Lists of vectors (space dimension sized)
    case 'measurementFrame':
        assert(value.length !== undefined && value.length === spaceDimension, "Field " + prop + " should be a list with length equal to the space dimension!");
        value.forEach(function (vec) {
          assert(vec === null || (vec.length !== undefined && vec.length === spaceDimension), "The elements of field " + prop + " should be lists with length equal to the space dimension!");
          if (vec !== null) vec.forEach(function (val) { assert((typeof val) == "number" || val instanceof Number, "The elements of field " + prop + " should be lists of numbers!"); });
        });
        line = propNRRD + ": " + value.map(function(vec) { return vec === null ? "none" : ("(" + vec.join(",") + ")"); }).join(" ");
        break;
    // One-of-a-kind fields
    case 'type':
        assert((typeof value) == "string" || value instanceof String, "Field " + prop + " should contain a string!");
        line = propNRRD + ": " + value;
        break;
    case 'encoding':
        assert((typeof value) == "string" || value instanceof String, "Field " + prop + " should contain a string!");
        line = propNRRD + ": " + value;
        break;
    case 'endian':
        assert((typeof value) == "string" || value instanceof String, "Field " + prop + " should contain a string!");
        line = propNRRD + ": " + value;
        break;
    case 'dataFile':
        if (value.length || (value.files && 'subdim' in value)) {
            // List of data files: skip for now
        } else {
            line = propNRRD + ": " + serializeNRRDDataFile(value);
        }
        break;
    case 'centers':
        assert(value.length !== undefined && value.length == dimension, "Field " + prop + " should be a list with length equal to the dimension!");
        line = propNRRD + ": " + value.map(serializeNRRDOptional).join(" ");
        break;
    case 'kinds':
        assert(value.length !== undefined && value.length == dimension, "Field " + prop + " should be a list with length equal to the dimension!");
        line = propNRRD + ": " + value.map(serializeNRRDOptional).join(" ");
        break;
    // Something unknown
    default:
        console.warn("Unrecognized NRRD field: " + prop + ", skipping.");
    }
    return line;
}

// Parses and normalizes NRRD fields, assumes the field names are already lower case.
function parseField(identifier, descriptor) {
    switch(identifier) {
    // Literal (uninterpreted) fields
    case 'content':
    case 'number':
    case 'sampleUnits':
        break;
    // Integers
    case 'dimension':
    case 'blockSize':
    case 'lineSkip':
    case 'byteSkip':
    case 'spaceDimension':
        descriptor = parseNRRDInteger(descriptor);
        break;
    // Floats
    case 'min':
    case 'max':
    case 'oldMin':
    case 'oldMax':
        descriptor = parseNRRDFloat(descriptor);
        break;
    // Vectors
    case 'spaceOrigin':
        descriptor = parseNRRDVector(descriptor);
        break;
    // Lists of strings
    case 'labels':
    case 'units':
    case 'spaceUnits':
        descriptor = parseNRRDWhitespaceSeparatedList(descriptor, parseNRRDQuotedString);
        break;
    // Lists of integers
    case 'sizes':
        descriptor = parseNRRDWhitespaceSeparatedList(descriptor, parseNRRDInteger);
        break;
    // Lists of floats
    case 'spacings':
    case 'thicknesses':
    case 'axisMins':
    case 'axisMaxs':
        descriptor = parseNRRDWhitespaceSeparatedList(descriptor, parseNRRDFloat);
        break;
    // Lists of vectors
    case 'spaceDirections':
    case 'measurementFrame':
        descriptor = parseNRRDWhitespaceSeparatedList(descriptor, parseNRRDVector);
        break;
    // One-of-a-kind fields
    case 'type':
        descriptor = parseNRRDType(descriptor);
        break;
    case 'encoding':
        descriptor = parseNRRDEncoding(descriptor);
        break;
    case 'endian':
        descriptor = parseNRRDEndian(descriptor);
        break;
    case 'dataFile':
        descriptor = parseNRRDDataFile(descriptor);
        break;
    case 'centers':
        descriptor = parseNRRDWhitespaceSeparatedList(descriptor, parseNRRDCenter);
        break;
    case 'kinds':
        descriptor = parseNRRDWhitespaceSeparatedList(descriptor, parseNRRDKind);
        break;
    case 'space':
        descriptor = parseNRRDSpace(descriptor);
        break;
    // Something unknown
    default:
        console.warn("Unrecognized NRRD field: " + identifier);
    }
    return descriptor;
}

// This only includes names whose lower case form is different from the Javascript form.
var mapNRRDToJavascriptStatic = {
    'block size': 'blockSize',
    'blocksize': 'blockSize',
    'old min': 'oldMin',
    'oldmin': 'oldMin',
    'old max': 'oldMax',
    'oldmax': 'oldMax',
    'data file': 'dataFile',
    'datafile': 'dataFile',
    'line skip': 'lineSkip',
    'lineskip': 'lineSkip',
    'byte skip': 'byteSkip',
    'byteskip': 'byteSkip',
    'sample units': 'sampleUnits',
    'sampleunits': 'sampleUnits',
    'axis mins': 'axisMins',
    'axis maxs': 'axisMaxs',
    'centers': 'centers', // Not different, just included so it is clear why centerings maps to centers
    'centerings': 'centers',
    'space dimension': 'spaceDimension',
    'space units': 'spaceUnits',
    'space origin': 'spaceOrigin',
    'space directions': 'spaceDirections',
    'measurement frame': 'measurementFrame'
};
var mapJavascriptToNRRDStatic = function() {
  var id, m = {};
  for(id in mapNRRDToJavascriptStatic) {
    m[mapNRRDToJavascriptStatic[id]] = id;
  }
  return m;
}();
function mapNRRDToJavascript(id) {
    // In any case, use the lower case version of the id
    id = id.toLowerCase();
    // Filter out any fields for which we have an explicit Javascript name
    if (id in mapNRRDToJavascriptStatic) return mapNRRDToJavascriptStatic[id];
    // Otherwise, just return the (lower case) id
    return id;
}
function mapJavascriptToNRRD(id) {
    // Filter out any fields for which we have an explicit NRRD name
    if (id in mapJavascriptToNRRDStatic) return mapJavascriptToNRRDStatic[id];
    // Otherwise, just return the id
    return id;
}

function parseNRRDInteger(str) {
    var val = parseInt(str, 10);
    if (Number.isNaN(val)) throw new Error("Malformed NRRD integer: " + str);
    return val;
}

function parseNRRDFloat(str) {
    str = str.toLowerCase();
    if (str.indexOf('nan')>=0) return NaN;
    if (str.indexOf('-inf')>=0) return -Infinity;
    if (str.indexOf('inf')>=0) return Infinity;
    var val = parseFloat(str);
    if (Number.isNaN(val)) throw new Error("Malformed NRRD float: " + str);
    return val;
}

function parseNRRDVector(str) {
    if (str == "none") return null;
    if (str.length<2 || str[0]!=="(" || str[str.length-1]!==")") throw new Error("Malformed NRRD vector: " + str);
    return str.slice(1, -1).split(",").map(parseNRRDFloat);
}

function parseNRRDQuotedString(str) {
    if (str.length<2 || str[0]!='"' || str[str.length-1]!='"') {
        throw new Error("Invalid NRRD quoted string: " + str);
    }
    return str.slice(1, -1).replace('\\"', '"');
}

function serializeNRRDQuotedString(str) {
    return '"' + str.replace('"', '\\"') + '"';
}

var whitespaceListSeparator = /[ \t]+/; // Note that this excludes other types of whitespace on purpose!
function parseNRRDWhitespaceSeparatedList(str, parseElement) {
    return str.split(whitespaceListSeparator).map(parseElement);
}

function parseNRRDType(descriptor) {
    switch(descriptor.toLowerCase()) {
    case "signed char":
    case "int8":
    case "int8_t":
        return 'int8';
    case "uchar":
    case "unsigned char":
    case "uint8":
    case "uint8_t":
        return 'uint8';
    case "short":
    case "short int":
    case "signed short":
    case "signed short int":
    case "int16":
    case "int16_t":
        return 'int16';
    case "ushort":
    case "unsigned short":
    case "unsigned short int":
    case "uint16":
    case "uint16_t":
        return 'uint16';
    case "int":
    case "signed int":
    case "int32":
    case "int32_t":
        return 'int32';
    case "uint":
    case "unsigned int":
    case "uint32":
    case "uint32_t":
        return 'uint32';
    case "longlong":
    case "long long":
    case "long long int":
    case "signed long long":
    case "signed long long int":
    case "int64":
    case "int64_t":
        return 'int64';
    case "ulonglong":
    case "unsigned long long":
    case "unsigned long long int":
    case "uint64":
    case "uint64_t":
        return 'uint64';
    case "float":
        return 'float';
    case "double":
        return 'double';
    case "block":
        return 'block';
    default:
        console.warn("Unrecognized NRRD type: " + descriptor);
        return descriptor;
    }
}

function parseNRRDEncoding(encoding) {
    switch(encoding.toLowerCase()) {
    case "raw":
        return "raw";
    case "txt":
    case "text":
    case "ascii":
        return "ascii";
    case "hex":
        return "hex";
    case "gz":
    case "gzip":
        return "gzip";
    case "bz2":
    case "bzip2":
        return "bzip2";
    default:
        console.warn("Unrecognized NRRD encoding: " + encoding);
        return encoding;
    }
}

function parseNRRDSpace(space) {
    switch(space.toLowerCase()) {
    case "right-anterior-superior":
    case "ras":
        return "right-anterior-superior";
    case "left-anterior-superior":
    case "las":
        return "left-anterior-superior";
    case "left-posterior-superior":
    case "lps":
        return "left-posterior-superior";
 	  case "right-anterior-superior-time":
 	  case "rast":
        return "right-anterior-superior-time";
    case "left-anterior-superior-time":
    case "last":
        return "left-anterior-superior-time";
    case "left-posterior-superior-time":
    case "lpst":
        return "left-posterior-superior-time";
    case "scanner-xyz":
        return "scanner-xyz";
    case "scanner-xyz-time":
        return "scanner-xyz-time";
    case "3d-right-handed":
        return "3D-right-handed";
    case "3d-left-handed":
        return "3D-left-handed";
    case "3d-right-handed-time":
        return "3D-right-handed-time";
    case "3d-left-handed-time":
        return "3D-left-handed-time";
    default:
        console.warn("Unrecognized space: " + space);
        return space;
    }
}

function parseNRRDEndian(endian) {
    switch(endian.toLowerCase()) {
    case 'little':
        return 'little';
    case 'big':
        return 'big';
    default:
        console.warn("Unrecognized NRRD endianness: " + endian);
        return endian;
    }
}

// Note that this function will never encounter the LIST data file specification format, as this is handled elsewhere.
var dataFileFormatRE = / (-?\d+) (-?\d+) (-?\d+)(?: (\d+))?$/;
function parseNRRDDataFile(dataFile) {
    var match = dataFileFormatRE.exec(dataFile);
    if (match) { // We have a format specification
        if (match.length == 5 && match[4]) { // subdim specification
            return {
                format: dataFile.substring(0, match.index),
                min: parseNRRDInteger(match[1]),
                max: parseNRRDInteger(match[2]),
                step: parseNRRDInteger(match[3]),
                subdim: parseNRRDInteger(match[4])
            };
        } else {
            return {
                format: dataFile.substring(0, match.index),
                min: parseNRRDInteger(match[1]),
                max: parseNRRDInteger(match[2]),
                step: parseNRRDInteger(match[3])
            };
        }
    } else { // Just a file
        return dataFile;
    }
}

function serializeNRRDDataFile(dataFile) {
    if ((typeof dataFile) == "string" || dataFile instanceof String) {
        return dataFile;
    } else if ('format' in dataFile && 'min' in dataFile && 'max' in dataFile && 'step' in dataFile) {
        if ('subdim' in dataFile) {
            return dataFile.format + " " + dataFile.min + " " + dataFile.max + " " + dataFile.step + " " + dataFile.subdim;
        } else {
            return dataFile.format + " " + dataFile.min + " " + dataFile.max + " " + dataFile.step;
        }
    } else {
        throw new Error("Unrecognized data file format!");
    }
}

function parseNRRDCenter(center) {
    switch(center.toLowerCase()) {
    case "cell":
        return "cell";
    case "node":
        return "node";
    case "???":
    case "none":
        return null;
    default:
        console.warn("Unrecognized NRRD center: " + center);
        return center;
    }
}

var NRRDKinds = {
    "domain": "domain",
    "space": "space",
    "time": "time",
    "list": "list",
    "point": "point",
    "vector": "vector",
    "covariant-vector": "covariant-vector",
    "normal": "normal",
    "stub": "stub",
    "scalar": "scalar",
    "complex": "complex",
    "2-vector": "2-vector",
    "3-color": "3-color",
    "rgb-color": "RGB-color",
    "hsv-color": "HSV-color",
    "xyz-color": "XYZ-color",
    "4-color": "4-color",
    "rgba-color": "RGBA-color",
    "3-vector": "3-vector",
    "3-gradient": "3-gradient",
    "3-normal": "3-normal",
    "4-vector": "4-vector",
    "quaternion": "quaternion",
    "2d-symmetric-matrix": "2D-symmetric-matrix",
    "2d-masked-symmetric-matrix": "2D-masked-symmetric-matrix",
    "2d-matrix": "2D-matrix",
    "2d-masked-matrix": "2D-masked-matrix",
    "3d-symmetric-matrix": "3D-symmetric-matrix",
    "3d-masked-symmetric-matrix": "3D-masked-symmetric-matrix",
    "3d-matrix": "3D-matrix",
    "3d-masked-matrix": "3D-masked-matrix",
    "???": null,
    "none": null
};
function parseNRRDKind(kind) {
    var kindLC = kind.toLowerCase();
    if (kindLC in NRRDKinds) return NRRDKinds[kindLC];
    console.warn("Unrecognized NRRD kind: " + kind);
    return kind;
}

function serializeNRRDOptional(a) {
    return a===null ? "???" : a;
}

var systemEndianness = (function() {
    var buf = new ArrayBuffer(4),
        intArr = new Uint32Array(buf),
        byteArr = new Uint8Array(buf);
    intArr[0] = 0x01020304;
    if (byteArr[0]==1 && byteArr[1]==2 && byteArr[2]==3 && byteArr[3]==4) {
        return 'big';
    } else if (byteArr[0]==4 && byteArr[1]==3 && byteArr[2]==2 && byteArr[3]==1) {
        return 'little';
    }
    console.warn("Unrecognized system endianness!");
    return undefined;
})();

function parseNRRDRawData(buffer, type, sizes, options) {
    var i, arr, view, totalLen = 1, endianFlag;
    for(i=0; i<sizes.length; i++) {
        if (sizes[i]<=0) throw new Error("Sizes should be a list of positive (>0) integers!");
        totalLen *= sizes[i];
    }
    if (type == 'block') {
        // Don't do anything special, just return the slice containing all blocks.
        return buffer.slice(0,totalLen*options.blockSize);
    } else if (type == 'int8' || type == 'uint8' || options.endian == systemEndianness) {
        switch(type) {
        case "int8":
            checkSize(1);
            return new Int8Array(buffer.slice(0,totalLen));
        case "uint8":
            checkSize(1);
            return new Uint8Array(buffer.slice(0,totalLen));
        case "int16":
            checkSize(2);
            return new Int16Array(buffer.slice(0,totalLen*2));
        case "uint16":
            checkSize(2);
            return new Uint16Array(buffer.slice(0,totalLen*2));
        case "int32":
            checkSize(4);
            return new Int32Array(buffer.slice(0,totalLen*4));
        case "uint32":
            checkSize(4);
            return new Uint32Array(buffer.slice(0,totalLen*4));
        //case "int64":
        //    checkSize(8);
        //    return new Int64Array(buffer.slice(0,totalLen*8));
        //case "uint64":
        //    checkSize(8);
        //    return new Uint64Array(buffer.slice(0,totalLen*8));
        case "float":
            checkSize(4);
            return new Float32Array(buffer.slice(0,totalLen*4));
        case "double":
            checkSize(8);
            return new Float64Array(buffer.slice(0,totalLen*8));
        default:
            console.warn("Unsupported NRRD type: " + type + ", returning raw buffer.");
            return undefined;
        }
    } else {
        switch(options.endian) {
        case 'big':
            endianFlag = false;
            break;
        case 'little':
            endianFlag = true;
            break;
        default:
            console.warn("Unsupported endianness in NRRD file: " + options.endian);
            return undefined;
        }
        view = new DataView(buffer);
        switch(type) {
        case "int8": // Note that here we do not need to check the size of the buffer, as the DataView.get methods should throw an exception if we read beyond the buffer.
            arr = new Int8Array(totalLen);
            for(i=0; i<totalLen; i++) {
                arr[i] = view.getInt8(i);
            }
            return arr;
        case "uint8":
            arr = new Uint8Array(totalLen);
            for(i=0; i<totalLen; i++) {
                arr[i] = view.getUint8(i);
            }
            return arr;
        case "int16":
            arr = new Int16Array(totalLen);
            for(i=0; i<totalLen; i++) {
                arr[i] = view.getInt16(i*2);
            }
            return arr;
        case "uint16":
            arr = new Uint16Array(totalLen);
            for(i=0; i<totalLen; i++) {
                arr[i] = view.getUint16(i*2);
            }
            return arr;
        case "int32":
            arr = new Int32Array(totalLen);
            for(i=0; i<totalLen; i++) {
                arr[i] = view.getInt32(i*4);
            }
            return arr;
        case "uint32":
            arr = new Uint32Array(totalLen);
            for(i=0; i<totalLen; i++) {
                arr[i] = view.getUint32(i*4);
            }
            return arr;
        //case "int64":
        //    arr = new Int64Array(totalLen);
        //    for(i=0; i<totalLen; i++) {
        //        arr[i] = view.getInt64(i*8);
        //    }
        //    return arr;
        //case "uint64":
        //    arr = new Uint64Array(totalLen);
        //    for(i=0; i<totalLen; i++) {
        //        arr[i] = view.getUint64(i*8);
        //    }
        //    return arr;
        case "float":
            arr = new Float32Array(totalLen);
            for(i=0; i<totalLen; i++) {
                arr[i] = view.getFloat32(i*4);
            }
            return arr;
        case "double":
            arr = new Float64Array(totalLen);
            for(i=0; i<totalLen; i++) {
                arr[i] = view.getFloat64(i*8);
            }
            return arr;
        default:
            console.warn("Unsupported NRRD type: " + type + ", returning raw buffer.");
            return undefined;
        }
    }
    function checkSize(sizeOfType) {
        if (buffer.byteLength<totalLen*sizeOfType) throw new Error("NRRD file does not contain enough data!");
    }
}

var whitespaceDataValueListSeparatorRE = /[ \t\n\r\v\f]+/;
function parseNRRDTextData(buffer, type, sizes) {
    var i, buf8, str, strList, totalLen = 1;
    for(i=0; i<sizes.length; i++) {
        if (sizes[i]<=0) throw new Error("Sizes should be a list of positive (>0) integers!");
        totalLen *= sizes[i];
    }
    buf8 = new Uint8Array(buffer);
    str = String.fromCharCode.apply(null, buf8);
    strList = str.split(whitespaceDataValueListSeparatorRE);
    if (strList.length<totalLen) {
        throw new Error("Not enough data in NRRD file!");
    } else if (strList.length>totalLen) {
        if (strList[0] === '') strList = strList.slice(1); // Strictly speaking the spec doesn't (explicitly) allow whitespace in front of the first number, but let's be lenient.
        strList = strList.slice(0, totalLen);
    }
    switch(type) {
    case "int8":
        return new Int8Array(strList.map(parseNRRDInteger));
    case "uint8":
        return new Uint8Array(strList.map(parseNRRDInteger));
    case "int16":
        return new Int16Array(strList.map(parseNRRDInteger));
    case "uint16":
        return new Uint16Array(strList.map(parseNRRDInteger));
    case "int32":
        return new Int32Array(strList.map(parseNRRDInteger));
    case "uint32":
        return new Uint32Array(strList.map(parseNRRDInteger));
    //case "int64":
    //    return new Int64Array(strList.map(parseNRRDInteger));
    //case "uint64":
    //    return new Uint64Array(strList.map(parseNRRDInteger));
    case "float":
        return new Float32Array(strList.map(parseNRRDFloat));
    case "double":
        return new Float64Array(strList.map(parseNRRDFloat));
    default:
        console.warn("Unsupported NRRD type: " + type + ".");
        return undefined;
    }
}

// This ALWAYS returns an integer, or throws an exception.
function getNRRDTypeSize(type) {
    switch(type) {
    case "int8":
        return 1;
    case "uint8":
        return 1;
    case "int16":
        return 2;
    case "uint16":
        return 2;
    case "int32":
        return 4;
    case "uint32":
        return 4;
    case "int64":
        return 8;
    case "uint64":
        return 8;
    case "float":
        return 4;
    case "double":
        return 8;
    default:
        throw new Error("Do not know the size of NRRD type: " + type);
    }
}

function checkNRRD(ret) {
    // Always necessary fields
    if (ret.dimension===undefined) {
        throw new Error("Dimension missing from NRRD file!");
    } else if (ret.type===undefined) {
        throw new Error("Type missing from NRRD file!");
    } else if (ret.encoding===undefined) {
        throw new Error("Encoding missing from NRRD file!");
    } else if (ret.sizes===undefined) {
        throw new Error("Sizes missing from NRRD file!");
    }
    
    // Sometimes necessary fields
    if (ret.type != 'block' && ret.type != 'int8' && ret.type != 'uint8' &&
          ret.encoding != 'ascii' && ret.endian === undefined) {
        throw new Error("Endianness missing from NRRD file!");
    } else if (ret.type == 'block' && ret.blockSize === undefined) {
        throw new Error("Missing block size in NRRD file!");
    }
    
    // Check dimension and per-axis field lengths
    if (ret.dimension === 0) {
        throw new Error("Zero-dimensional NRRD file?");
    } else if (ret.dimension != ret.sizes.length) {
        throw new Error("Length of 'sizes' is different from 'dimension' in an NRRD file!");
    } else if (ret.spacings && ret.dimension != ret.spacings.length) {
        throw new Error("Length of 'spacings' is different from 'dimension' in an NRRD file!");
    } else if (ret.thicknesses && ret.dimension != ret.thicknesses.length) {
        throw new Error("Length of 'thicknesses' is different from 'dimension' in an NRRD file!");
    } else if (ret.axisMins && ret.dimension != ret.axisMins.length) {
        throw new Error("Length of 'axis mins' is different from 'dimension' in an NRRD file!");
    } else if (ret.axisMaxs && ret.dimension != ret.axisMaxs.length) {
        throw new Error("Length of 'axis maxs' is different from 'dimension' in an NRRD file!");
    } else if (ret.centers && ret.dimension != ret.centers.length) {
        throw new Error("Length of 'centers' is different from 'dimension' in an NRRD file!");
    } else if (ret.labels && ret.dimension != ret.labels.length) {
        throw new Error("Length of 'labels' is different from 'dimension' in an NRRD file!");
    } else if (ret.units && ret.dimension != ret.units.length) {
        throw new Error("Length of 'units' is different from 'dimension' in an NRRD file!");
    } else if (ret.kinds && ret.dimension != ret.kinds.length) {
        throw new Error("Length of 'kinds' is different from 'dimension' in an NRRD file!");
    }
    
    // TODO: Check space/orientation fields.
    
    // We should either have inline data or external data
    if ((ret.data === undefined || ret.data.length === 0) && (ret.buffer === undefined || ret.buffer.byteLength === 0) && ret.dataFile === undefined) {
        throw new Error("NRRD file has neither inline or external data!");
    }
}

function castTypedArray(data, type) {
    switch(type) {
    case "int8":
        return new Int8Array(data);
    case "uint8":
        return new Uint8Array(data);
    case "int16":
        return new Int16Array(data);
    case "uint16":
        return new Uint16Array(data);
    case "int32":
        return new Int32Array(data);
    case "uint32":
        return new Uint32Array(data);
    //case "int64":
    //    return new Int64Array(data);
    //case "uint64":
    //    return new Uint64Array(data);
    case "float":
        return new Float32Array(data);
    case "double":
        return new Float64Array(data);
    default:
        throw new Error("Cannot cast to NRRD type: " + type);
    }
}

function serializeToBuffer(data, type, endian) {
    var i, endianFlag, view, nativeSize = getNRRDTypeSize(type), buffer = new ArrayBuffer(data.length*nativeSize);
    switch(endian) {
    case 'big':
        endianFlag = false;
        break;
    case 'little':
        endianFlag = true;
        break;
    default:
        console.warn("Unsupported endianness in NRRD file: " + endian);
        return undefined;
    }
    view = new DataView(buffer);
    switch(type) {
    case "int8": // Note that here we do not need to check the size of the buffer, as the DataView.get methods should throw an exception if we read beyond the buffer.
        for(i=0; i<data.length; i++) {
            view.setInt8(i, data[i], endianFlag);
        }
        return buffer;
    case "uint8":
        for(i=0; i<data.length; i++) {
            view.setUint8(i, data[i], endianFlag);
        }
        return buffer;
    case "int16":
        for(i=0; i<data.length; i++) {
            view.setInt16(i*2, data[i], endianFlag);
        }
        return buffer;
    case "uint16":
        for(i=0; i<data.length; i++) {
            view.setUint16(i*2, data[i], endianFlag);
        }
        return buffer;
    case "int32":
        for(i=0; i<data.length; i++) {
            view.setInt32(i*4, data[i], endianFlag);
        }
        return buffer;
    case "uint32":
        for(i=0; i<data.length; i++) {
            view.setUint32(i*4, data[i], endianFlag);
        }
        return buffer;
    //case "int64":
    //    for(i=0; i<data.length; i++) {
    //        view.setInt64(i*8, data[i], endianFlag);
    //    }
    //    return buffer;
    //case "uint64":
    //    for(i=0; i<data.length; i++) {
    //        view.setUint64(i*8, data[i], endianFlag);
    //    }
    //    return buffer;
    case "float":
        for(i=0; i<data.length; i++) {
            view.setFloat32(i*4, data[i], endianFlag);
        }
        return buffer;
    case "double":
        for(i=0; i<data.length; i++) {
            view.setFloat64(i*8, data[i], endianFlag);
        }
        return buffer;
    default:
        console.warn("Cannot serialize NRRD type: " + type + ".");
        return undefined;
    }
}

function serializeToTextBuffer(data) {
    var i, strs = new Array(data.length), str, buffer, arr;
    for(i=0; i<data.length; i++) {
        strs[i] = '' + data[i];
    }
    str = strs.join(" ");
    buffer = new ArrayBuffer(str.length);
    arr = new Uint8Array(buffer);
    for(i=0; i<arr.length; i++) {
        arr[i] = str.charCodeAt(i);
    }
    return buffer;
}
