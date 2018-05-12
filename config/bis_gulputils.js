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

"use strict";

let colors=require('colors/safe'),
    htmlreplace = require('gulp-html-replace'),
    concatCss = require('gulp-concat-css'),
    child_process = require('child_process'),
    fs=require("fs"),
    os=require("os"),
    path=require('path'),
    jshint = require('gulp-jshint'),
    gulpzip = require('gulp-zip'),
    template=require('gulp-template'),
    del = require('del'),
    gulp=require("gulp"),
    pwaconfig=require('../web/pwa/pwa_config.js');

//console.log(pwaconfig);


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

var getDate2=function() {
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    let day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    let hour= date.getHours();
    let min=date.getMinutes();
    if (min < 10) {
        min = "0" + min;
    }
    if (hour < 10) {
        hour = "0" + hour;
    }
    
    let dt=month+"/"+day+"/"+year+" "+hour+":"+min;

    return dt;
}

var getVersionTag=function(version) {
    return version+"_"+getDate();
};

var executeCommand=function(command,dir,done=0,error=0,extra=0) {
    dir = dir || __dirname;
    console.log(getTime()+" "+colors.green(dir+">")+colors.cyan(command+'\n'));

    if (done===0) {
	let out="";
	try {
	    out=child_process.execSync(command, { cwd : dir });
	} catch(e) {
	    out='error '+e;
	}
	return out;
    }

    while (extra>3)
        extra=extra-4;
        
    let colorfn=colors.yellow;
    if (extra===1)
        colorfn=colors.magenta;
    if (extra===2)
        colorfn=colors.gray;
    if (extra===3)
        colorfn=colors.green;
    
    try { 
	let proc=child_process.exec(command, { cwd : dir });
	proc.stdout.on('data', function(data) { process.stdout.write(colorfn(data.trim()+'\n'));});
	proc.stderr.on('data', function(data) { process.stdout.write(colors.red(data+'\n'));});
	proc.on('exit', function() { console.log(''); done();});
    } catch(e) {
	console.log(' error '+e);
        if (error)
            error(e);
    }
};


var executeCommandPromise=function(command,dir,extra="") {

    return new Promise( (resolve,reject) => {
        let done=function() {
            resolve();
        }
        let error=function(e) {
            reject(e);
        }

        executeCommand(command,dir,done,error,extra);
    });
}

// -------------------------------------------------------------

var executeCommandList=function(cmdlist,indir,done=0) {

    if (done===0) {
	console.log('here ...');
	for (let i=0;i<cmdlist.length;i++) {
	    executeCommand(cmdlist[i],indir,0,0,i);
	}
	return;
    }

    let i=0;
    var execlist=function() {
	if (i==cmdlist.length) {
	    done();
	} else {
	    executeCommand(cmdlist[i],indir,execlist,0,i);
	    ++i;
	}
    }
    execlist();
}


var createHTML=function(toolname,outdir,libjs,commoncss) {

    if (toolname==="bisjs")
	return;
    
    var mainhtml   = path.normalize(path.join(__dirname,'../web/'+toolname+'.html'));
    var bundlecss  = commoncss;

    console.log(getTime()+colors.green(' Building HTML '+mainhtml));
    var alljs;
    if (libjs!=='') {
        if (toolname!=="index") {
	    alljs=[ 'webcomponents-lite.js', 'jquery.min.js', 'bootstrap.min.js', 'libbiswasm_wasm.js', libjs  ];
        } else {
	    alljs=[ 'jquery.min.js', 'bootstrap.min.js', libjs  ];
            bundlecss=[ "./bootstrap_dark_edited.css" ];
        }
    } else {
	alljs = [ 'jquery.min.js', 'bootstrap.min.js' ];
    }

    return gulp.src([ mainhtml ])
    	.pipe(htmlreplace({
	    'js': alljs,
	    'css': bundlecss,
            'manifest' : pwaconfig.manifest,
            'serviceworker' : pwaconfig.serviceworker
	})).pipe(gulp.dest(outdir));
};


var createCSSCommon=function(dependcss,out,outdir) {

    var bundlecss  = out;
    console.log(getTime(),colors.green('Concatenating ',dependcss.join(),' to ',out));
    gulp.src(dependcss)
	.pipe(concatCss(bundlecss))
	.pipe(gulp.dest(outdir));
};

var createDateFile=function(datefile) {

    let a=getDate("/");
    let b=getTime(1);
    let t= new Date().getTime()
    let output_text=` { "date" : "${a}", "time" : "${b}", "absolutetime" : ${t} }`;
    if (datefile.indexOf('json')<0) {
        output_text=`module.exports = ${output_text};`;
    }
    console.log(getTime()+" "+colors.cyan(`++++ Creating ${datefile} : ${output_text}`));
    fs.writeFileSync(datefile,output_text+'\n');
};


// ------------------------------------------------
// Webpack
// ------------------------------------------------
var getWebpackCommand=function(source,internal,out,indir,minify,outdir,watch) {

   let extracmd=""
    if (internal) {
        if (os.platform()==='win32')
            extracmd=`SET BISWEB_INTERNAL=${internal}& `;
        else
            extracmd=`export BISWEB_INTERNAL=${internal}; `;
    }

    if (os.platform()==='win32')
        extracmd+=`SET BISWEB_OUT=${out}&`;
    else
        extracmd+=`export BISWEB_OUT=${out}; `;
    
    
    
    let cmd=extracmd+' webpack-cli --entry '+source+' --output-filename '+out+' --output-path '+outdir+' ';

    if (minify>0) {
	cmd=cmd+'--config config/webpack.config_uglify.js';
    } else {
	if (minify<0)
	    cmd=cmd+'--config config/webpack.config.js';
	else
	    cmd=cmd+'--config config/webpack.config_devel.js';
	if (watch!==0)
	    cmd+=" --watch";
    }

    return cmd;
};


var runWebpack=function(joblist,internal,
                        indir,minify,outdir,watch=0) {

    let p = [ ];
    for (let i=0;i<joblist.length;i++) {
        let s=joblist[i];
        console.log('Starting webpack job=',i,s.name);
        let cmd=getWebpackCommand(s.path+s.name,internal,s.name,indir,minify,outdir,watch);
        p.push(executeCommandPromise(cmd,indir,i));
    }
    return Promise.all(p);
};


var jsHint = function(scripts) {
    
    for (let i=0;i<scripts.length;i++) {
        gulp.src(scripts[i])
            .pipe(jshint({ sub:true, 
                           node:true,
                           unused:true,
                           undef:true,
                           globalstrict:true,
                           esversion:6,
                           "globals": {
                               "console": true,
                               "require": true,
                               "module" : true,
                           },
                         }))
            .pipe(jshint.reporter('default'));
    }
};

var createZIPFile = function(dozip,baseoutput,outdir,version,distdir) {

    console.log('dozip=',dozip);
    
    if (!dozip) {
        console.log(colors.magenta(getTime()+' Not creating webpage zip file'));
        return;
    }
    console.log('baseoutput=',baseoutput,outdir);
    const outfile=distdir+"/bisweb_"+getVersionTag(version)+".zip";
    del([ outfile]);
    console.log(getTime()+' Creating zip file '+outfile+'.');
    return gulp.src([outdir+"*",
                     outdir+"images/*",
                     outdir+"fonts/*",
                     outdir+"css/*",
                     outdir+"fonts/*",
                     outdir+"images/*",
                     outdir+"test/**/*",
                     outdir+"var/*"],
                    {base:outdir}).pipe(gulpzip(outfile)).pipe(gulp.dest('.'));

};

// -----------------------------------------------------------------------------------------
// Packaging stuff
// -----------------------------------------------------------------------------------------
var inno=function(tools, version, indir , distdir ) {
    let obj=tools;
    
    var i_odir    = path.resolve(indir, distdir);
    var i_icon    = path.resolve(indir, 'web/images/bioimagesuite.png.ico');
    var i_license = path.resolve(indir, 'build/web/LICENSE');
    var i_indir   = path.resolve(indir, distdir+'/BioImageSuiteWeb-win32-x64');
    var i_date    = getDate();


    console.log('i_indir=',i_indir);
    
    var i_tools = "";
    var keys=Object.keys(obj);
    var max=keys.length;
    for (var i=0;i<max;i++) {
        var elem=obj[keys[i]];
        var title=elem.title;
        var url=elem.url;
        i_tools+='Name: "{group}\\Tools\\'+title+'"; Filename: "{app}\\BioImageSuiteWeb.exe"; Parameters: "'+url+'"';
        if (i<(max-1))
            i_tools+='\n';
    }
    
    console.log(colors.yellow(getTime()+' Creating electron inno setup file '+distdir+'/biselectron.iss for BioImageSuite Web '+i_date));
    return gulp.src('./config/biselectron.iss')
        .pipe(template({outputdir : i_odir,
                        iconfile : i_icon,
                        licensefile : i_license,
                        version : version,
                        date : i_date,
                        tools : i_tools,
                        indir : i_indir}))
        .pipe(gulp.dest(distdir));
};

var appdmg=function(indir,distdir,version) {

    var oname=distdir+'/biselectron.json';
    console.log(colors.yellow(getTime()+ ' Creating mac installer input '+oname));

    var obj= {
        title : "BioImageSuiteWeb",
        icon  : path.resolve(indir , 'web/images/bioimagesuite.icns'),
        "background-color" : "#dddddd",
        window : {
            position : {
                x : 200,
                y : 200,
            },
            size : {
                width : 600,
                height : 300
            }
        },
        contents : [ {
            x: 448,
            y: 100,
            type: "link",
            path: "/Applications"
        },  {
            x: 192,
            y: 100,
            type: "file",
            path: path.resolve(indir,distdir+'/BioImageSuiteWeb-darwin-x64/BioImageSuiteWeb.app'),
        }]
    };
    var txt=JSON.stringify(obj);
    fs.writeFileSync(oname,txt);
};   


// -----------------------------------------------------------------------------------------
var createPackageInternal=function(dopackage=1,tools=[],indir=_dirname+"../",outdir="build",version=1.0,platform="linux",distdir="builddist",done=0) {


    let cmdlist = [];
    let eversion ="2.0.0";
    let cmdline='electron-packager '+outdir+' BioImageSuiteWeb --arch=x64 --electron-version '+eversion+' --out '+distdir+' --overwrite '+
        '--app-version '+version;
    let zipopts='-ry';
    if (os.platform()==='win32')
        zipopts='-r';
    
    var errorf=function() { };
    console.log(colors.cyan(getTime()+' (electron '+version+') for: '+platform));
    for (var ia=0;ia<platform.length;ia++) {
        var n=platform[ia];
        var m=n,suffix=".zip";
        if (m==="darwin") {
            m="macos";
            suffix=".app.zip";
        }
        var basefile=distdir+"/bisweb_"+m+"_"+getVersionTag(version);
        var zipfile=path.normalize(path.resolve(basefile+suffix));

        try {
            fs.unlink(zipfile,errorf);
        } catch(e) { errorf('error '+e); }

        let absdistdir=path.normalize(path.resolve(distdir));
        var zipindir='BioImageSuiteWeb-'+n+'-x64';
        if (n==="linux") {
            cmdlist.push(cmdline+' --platform=linux');
            if (dopackage>1) {
                cmdlist.push('cd '+absdistdir+'; zip '+zipopts+' '+zipfile+' '+zipindir);
            }
        } else if (n==="win32") {
            cmdlist.push(cmdline+' --platform=win32 --icon web/images/bioimagesuite.png.ico');
            if (dopackage>1)  {
                if (os.platform()!=='win32') {
                    cmdlist.push('zip '+zipopts+' '+zipfile+' '+zipindir);
                } else {
                    inno(tools,version,indir,distdir);
                    cmdlist.push('c:\\unix\\innosetup5\\ISCC.exe '+distdir+'/biselectron.iss');
                }
            }
        } else if (n==="darwin") {
            cmdlist.push(cmdline+' --platform=darwin --icon web/images/bioimagesuite.icns');
            if (dopackage>1)  {
                cmdlist.push('cd '+absdistdir+'; zip '+zipopts+' '+zipfile+' '+zipindir);
            }
        }
    }

    console.log('cmdlist=',cmdlist.join('\n\t'));
    executeCommandList(cmdlist,indir,done);
    
};


var createPackage=function(dopackage=1,tools=[],indir=_dirname+"../",outdir="build",version=1.0,platform="linux",distdir="builddist",done) {
    
    console.log('dopack=',dopackage,'indir=',indir,' outdir=',outdir,' version=',version,' platform=',platform,' distdir=',distdir);

    if (!dopackage) {
        console.log(colors.magenta(getTime()+' Not packaging for electron'));
        return;
    }

    let fn0=function() {
        createPackageInternal(dopackage,tools,indir,outdir,version,platform,distdir,done);
    };

    executeCommand("npm update",indir+"/build/web",fn0);
}

var jsDOC=function(indir,conffile,done) {

    console.log(typeof(done));
    var cmd='jsdoc -c '+conffile+' --verbose';
    executeCommandList([ cmd ],indir,done);
};

var doxygen=function(indir,conffile,done) {

    var cmd='doxygen  '+conffile;
    return executeCommand(cmd,indir,done);
};

// -----------------------------------------------------------------------------------------
// Export line
// -----------------------------------------------------------------------------------------

module.exports = {
    getTime: getTime,
    getData: getDate,
    getVersionTag : getVersionTag,
    executeCommand : executeCommand,
    executeCommandPromise : executeCommandPromise,
    executeCommandList : executeCommandList,
    createHTML : createHTML,
    createDateFile : createDateFile,
    createCSSCommon  : createCSSCommon,
    runWebpack : runWebpack,
    jsHint : jsHint,
    jsDOC : jsDOC,
    doxygen : doxygen,
    createZIPFile : createZIPFile,
    createPackage : createPackage,
};

    
