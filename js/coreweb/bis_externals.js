// In Browser or Electron

const obj={};
if (typeof (window.BISELECTRON) !== "undefined") {

    obj.fs= window.BISELECTRON.fs;
    obj.rimraf=window.BISELECTRON.rimraf;
    obj.zlib=window.BISELECTRON.zlib;
    obj.path=window.BISELECTRON.path;
    obj.os=window.BISELECTRON.os;
    obj.glob=window.BISELECTRON.glob;
    obj.child_process=window.BISELECTRON['child_process'];
    obj.colors=window.BISELECTRON['colors'];
    obj.environment='electron';
} else {
    obj.environment= "browser";
}

obj.FileSaver = require('FileSaver');
module.exports=obj;

