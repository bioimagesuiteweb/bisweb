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

/* global _dirname */

"use strict";

let colors=require('colors/safe'),
    htmlreplace = require('gulp-html-replace'),
    concatCss = require('gulp-concat-css'),
    child_process = require('child_process'),
    fs=require("fs"),
    os=require("os"),
    path=require('path'),
    gulpzip = require('gulp-zip'),
    template=require('gulp-template'),
    del = require('del'),
    replace = require('gulp-replace'),
    gulp=require("gulp");



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
        };
        let error=function(e) {
            reject(e);
        };

        executeCommand(command,dir,done,error,extra);
    });
};

// -------------------------------------------------------------

var executeCommandList=function(cmdlist,indir,done=0) {

    if (done===0) {
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
    };
    execlist();
};


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

    let repljs=alljs;

    /*  
        Cache busting one day
        let t= new Date().getTime()
        
        for (let i=0;i<alljs.length;i++)
        repljs.push(`${alljs[i]}?v=${t}`);*/
    
    return gulp.src([ mainhtml ])
        .pipe(htmlreplace({
            'js': repljs,
            'css': bundlecss,
            'manifest' : '<link rel="manifest" href="./manifest.json">',
        })).pipe(gulp.dest(outdir));
};


var createCSSCommon=function(dependcss,out,outdir) {

    var bundlecss  = out;

    console.log(getTime(),colors.green('Concatenating ',dependcss.join(),' to ',out));
    gulp.src(dependcss)
        .pipe(concatCss(bundlecss))
        .pipe(replace('../../node_modules/jstree/dist/themes/default', 'images')) // jstree css fix
        .pipe(gulp.dest(outdir));
};




var createDateFile=function(datefile,hash='',version='') {

    let a=getDate("/");
    let b=getTime(1);
    let t= new Date().getTime();
    let output_text=` { "date" : "${a}", "time" : "${b}", "absolutetime" : ${t} , "hash" : "${hash}", "version": "${version}" }`;
    if (datefile.indexOf('json')<0) {
        output_text=`module.exports = ${output_text};`;
    }
    console.log(getTime()+" "+colors.cyan(`++++ Creating ${datefile} : ${output_text}\n+++++`));
    fs.writeFileSync(datefile,output_text+'\n');
};


// ------------------------------------------------
// Webpack
// ------------------------------------------------
var getWebpackCommand=function(source,internal,external,out,indir,minify,outdir,watch) {

    let extracmd="";
    let join="/";
    if (os.platform()==='win32') {
        outdir=outdir.replace(/\//g,'\\');
        source=source.replace(/\//g,'\\');
        join="\\";
    }

    if (internal) {
        if (os.platform()==='win32') {
            extracmd=`SET BISWEB_INTERNAL=${internal}& `;
        } else {
            extracmd=`export BISWEB_INTERNAL=${internal}; `;
        }
    }

    if (external) {
        if (os.platform()==='win32') {
            extracmd+=`SET BISWEB_EXTERNAL=${external}& `;
        } else {
            extracmd+=`export BISWEB_EXTERNAL=${external}; `;
        }
    }

    if (watch || out==='bisweb-sw.js' )
        minify=0;

    let tmpout=out;
    if (minify)
        tmpout=tmpout+'_full.js';
    
    if (os.platform()==='win32')
        extracmd+=`SET BISWEB_OUT=${out}&`;
    else
        extracmd+=`export BISWEB_OUT=${out}; `;
    
    
    
    let cmd=extracmd+' webpack-cli --entry '+source+' --output-filename '+tmpout+' --output-path '+outdir+' --config config'+join+'webpack.config_devel.js';

    if (watch!==0)
        cmd+=" --watch";
    
    if (minify) {
        let ijob=outdir+tmpout;
        let ojob=outdir+out;

        if (os.platform()==='win32') {

            //ijob=ijob.replace(/\//g,'\\');
            //ojob=ojob.replace(/\//g,'\\');
            cmd = cmd + ` & uglifyjs ${ijob} -c  -o ${ojob} & dir -p ${ijob} ${ojob}`;
        } else {
            cmd = cmd + ` ; uglifyjs ${ijob} -c  -o ${ojob} ; ls -lrth ${ijob} ${ojob}`;
        }
    }
    

    return cmd;
};


var runWebpack=function(joblist,internal,external,
                        indir,minify,outdir,watch=0) {

    let p = [ ];
    for (let i=0;i<joblist.length;i++) {
        let s=joblist[i];
        console.log('++++\nStarting webpack job=',i,s.name);
        let cmd=getWebpackCommand(s.path+s.name,internal,external,s.name,indir,minify,outdir,watch);
        p.push(executeCommandPromise(cmd,indir,i));
    }
    return Promise.all(p);
};

var createZIPFile = function(dozip,baseoutput,outdir,version,distdir) {

    console.log('dozip=',dozip);
    
    if (!dozip) {
        console.log(colors.magenta(getTime()+' Not creating webpage zip file'));
        return;
    }
    console.log('baseoutput=',baseoutput,outdir);
    let outfile=distdir+"/bisweb_"+getVersionTag(version)+".zip";
    del([ outfile]);
    console.log(getTime()+' Creating zip file '+outfile+'.');
    return gulp.src([outdir+"*",
                     outdir+"images/*",
                     outdir+"images/*/*",
                     outdir+"fonts/*",
                     outdir+"css/*",
                     outdir+"fonts/*",
                     outdir+"images/*",
                     outdir+"test/**/*",
                     outdir+"var/*",
                     `!${outdir}/package.json`,
                     `!${outdir}/*.map`
                    ],
                    {base:outdir}).pipe(gulpzip(outfile)).pipe(gulp.dest('.')).on('end', () => {
                        outfile=path.resolve(outfile);
                        let stats = fs.statSync(outfile);
                        let bytes = stats["size"];
                        let mbytes=Math.round(bytes/(1024*1024)*100)*0.01;
                        
                        console.log('____ zip file created in '+outfile+' (size='+mbytes+' MB )');

                    });

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

// -----------------------------------------------------------------------------------------
var createPackageInternal=function(dopackage=1,tools=[],indir=_dirname+"../",outdir="build",version=1.0,platform="linux",distdir="builddist",done=0) {


    let cmdlist = [];
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

        let eversion ="2.0.9";
        //        if (m==="linux")
        //          eversion="3.0.10";
        let cmdline='electron-packager '+outdir+' BioImageSuiteWeb --arch=x64 --electron-version '+eversion+' --out '+distdir+' --overwrite '+
            '--app-version '+version;
        
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


var createPackage=function(dopackage=1,tools=[],indir=_dirname+"../",outdir="build",version=1.0,platform="linux",distdir="builddist",done=null) {
    
    console.log('dopack=',dopackage,'indir=',indir,' outdir=',outdir,' version=',version,' platform=',platform,' distdir=',distdir);

    let fn0=function() {
        createPackageInternal(dopackage,tools,indir,outdir,version,platform,distdir,done);
    };

    if (dopackage>0) {
        executeCommand("npm update",indir+"/build/web",fn0);
    } else {
        dopackage=1;
        fn0();
    }
};

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
    jsDOC : jsDOC,
    doxygen : doxygen,
    createZIPFile : createZIPFile,
    createPackage : createPackage,
};


