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
    fs=require("fs"),
    os=require("os"),
    path=require('path'),
    gulp=require("gulp");

// On demand;
let htmlreplace=null,
    replace=null,
    concatCss = null,
    child_process=null;



var getFileSize=function(outfile) {

    try {
        let stats = fs.statSync(outfile);
        
        let mb=Math.round(10.0*stats.size/(1024*1024))*0.1;
        let s=`${mb}`;
        let ind=s.lastIndexOf(".");
        
        //        console.log('Raw file size of ',outfile,'=',stats.size,mb,s,'ind =',ind);
        if (ind>=0)
            return s.substr(0,ind+2);
        return s;
    } catch(e) {
        console.log('Error=',e);
        return -1;
    }
};

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

    if (child_process===null)
        child_process = require('child_process');
    
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
        proc.stdout.on('data', function(data) {
            process.stdout.write(colorfn(data));
        });
        proc.stderr.on('data', function(data) {
            process.stdout.write(colors.red(data));
        });
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

var executeCommandList=function(cmdlist,indir,done=0,extra=0) {
    
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
            executeCommand(cmdlist[i],indir,execlist,extra,i);
            ++i;
        }
    };
    execlist();
};


var createHTML=function(toolname,outdir,libjs,commoncss,gpl=true) {

    if (htmlreplace===null)
        htmlreplace = require('gulp-html-replace');


    return new Promise( (resolve) => {
        
        if (toolname==="bisjs") {
            resolve();
            return;
        }
    
        let mainhtml   = path.normalize(path.join(__dirname,'../web/'+toolname+'.html'));
        let bundlecss  = commoncss;

        let alljs;
        if (libjs!=='') {
            if (toolname!=="index") {
                if (gpl) 
                    alljs=[ 'webcomponents-lite.js', 'jquery.min.js', 'three.min.js', 'bootstrap.min.js', 'libbiswasm_wasm.js', libjs  ];
                else
                    alljs=[ 'webcomponents-lite.js', 'jquery.min.js', 'three.min.js', 'bootstrap.min.js', 'libbiswasm_nongpl_wasm.js', libjs  ];
            } else {
                alljs=[ 'jquery.min.js', 'bootstrap.min.js', libjs  ];
            }
        } else {
            alljs = [ 'jquery.min.js', 'bootstrap.min.js' ];
        }

        console.log(getTime()+colors.green('\tBuilding HTML '+mainhtml +' '+alljs));

        let repljs=alljs;
        
        return gulp.src([ mainhtml ])
            .pipe(htmlreplace({
                'js': repljs,
                'css': bundlecss,
                'manifest' : '<link rel="manifest" href="./manifest.json">',
            })).pipe(gulp.dest(outdir)).on('end', () => {
                resolve();
            });
    });
};


var createCSSCommon=function(dependcss,out,outdir) {

    if (replace===null)
        replace = require('gulp-replace');
    if (concatCss===null)
        concatCss = require('gulp-concat-css');

    
    let bundlecss  = out;
    
    return new Promise( (resolve) => {
        console.log(getTime()+colors.green('\tBuilding CSS', out,', from ',dependcss.join()));
        gulp.src(dependcss)
            .pipe(concatCss(bundlecss))
            .pipe(replace('../../node_modules/jstree/dist/themes/default', 'images')) // jstree css fix
            .pipe(gulp.dest(outdir)).on('end', () => { resolve(); });
    });
};




var createDateFile=function(datefile,hash='',version='') {

    let a=getDate("/");
    let b=getTime(1);
    let t= new Date().getTime();
    let output_text=` { "date" : "${a}", "time" : "${b}", "absolutetime" : ${t} , "hash" : "${hash}", "version": "${version}" }`;
    if (datefile.indexOf('json')<0) {
        output_text=`module.exports = ${output_text};`;
    }
    //console.log(getTime()+" "+colors.cyan(`++++ Creating ${datefile} : ${output_text}\n+++++`));
    fs.writeFileSync(datefile,output_text+'\n');
};


// ------------------------------------------------
// Webpack
// ------------------------------------------------
var getWebpackCommand=function(source,internal,external,out,indir,minify,outdir,debug,watch) {

    let join="/";
    if (os.platform()==='win32') {
        outdir=outdir.replace(/\//g,'\\');
        source=source.replace(/\//g,'\\');
        join="\\";
    }


    if (watch || out==='bisweb-sw.js' )
        minify=0;

    let tmpout=out;
    if (minify)
        tmpout=tmpout+'_full.js';
    
    let cmd='webpack-cli --entry '+source+' --output-filename '+tmpout+' --output-path '+outdir+' --config config'+join+'webpack.config_devel.js';
    if (!debug)
        cmd+=' --sort-modules-by size ';

    if (debug)
        cmd+=' --verbose --display-modules --display-origins';
    else
        cmd+=' --display-max-modules 20';
    
    if (tmpout.indexOf('bislib')>=0)
        cmd+=' --bisinternal '+internal+' --bisexternal '+external;
    
    if (watch!==0)
        cmd+=" --watch";

    let cmdlist = [ cmd ];
    let ojob=outdir+out;
    
    if (minify) {
        let ijob=outdir+tmpout;
        let cmd2=`uglifyjs ${ijob} -c  -o ${ojob}`;
        if (debug)
            cmd2+=' --verbose';
        cmdlist.push(cmd2);
        
        if (os.platform()==='win32') {
            cmdlist.push(`dir ${ijob} ${ojob}`);
        } else {
            cmdlist.push(`ls -lrth ${ijob} ${ojob}`);
        }
    } else {
        if (os.platform()==='win32') {
            cmdlist.push(`dir ${ojob}`);
        } else {
            cmdlist.push(`ls -lrth ${ojob}`);
        }
    }
    

    return cmdlist;
};


var runWebpack=function(joblist,internal,external,
                        indir,minify,outdir,debug,watch=0) {

    let p = [ ];
    for (let i=0;i<joblist.length;i++) {
        let s=joblist[i];
        console.log(getTime()+" "+colors.red('++++ Starting webpack job=',i,s.name));
        let cmdlist=getWebpackCommand(s.path+s.name,internal,external,s.name,indir,minify,outdir,debug,watch);
        p.push(new Promise( (resolve) => {
            executeCommandList(cmdlist,indir,resolve,i);
        }));
    }
    return Promise.all(p);
};

var createZIPFile = function(baseoutput,outdir,version,distdir,done) {
    
    const gulpzip = require('gulp-zip'),
          del = require('del');

    let outfile=distdir+"/bisweb_"+getVersionTag(version)+".zip";
    console.log(getTime()+' indir='+path.resolve(outdir));

    del([ outfile]);
    console.log(getTime()+' Creating zip file '+outfile+'.');
    gulp.src([outdir+"*",
              outdir+"images/*",
              outdir+"images/*/*",
              outdir+"fonts/*",
              outdir+"css/*",
              outdir+"fonts/*",
              outdir+"images/*",
              outdir+"test/**/*",
              outdir+"var/*",
              `!${outdir}/node_modules`,
              `!${outdir}/package.json`,
              `!${outdir}/*.map`
             ],
             {base:outdir}).pipe(gulpzip(outfile)).pipe(gulp.dest('.')).on('end', () => {
                 outfile=path.resolve(outfile);
                 let mbytes=getFileSize(outfile);
                 console.log(getTime()+' ____ zip file created in '+outfile+' (size='+mbytes+' MB )');
                 
                 done();
             });
    
};

// -----------------------------------------------------------------------------------------
// Packaging stuff
// -----------------------------------------------------------------------------------------
var inno=function(tools, version, indir , distdir ) {

    const template=require('gulp-template');
    let obj=tools;
    
    let i_odir    = path.resolve(indir, distdir);
    let i_icon    = path.resolve(indir, 'web/images/bioimagesuite.png.ico');
    let i_license = path.resolve(indir, 'build/web/LICENSE');
    let i_indir   = path.resolve(indir, distdir+'/BioImageSuiteWeb-win32-x64');
    let i_date    = getDate();


    
    let i_tools = "";
    let keys=Object.keys(obj);

    let newkeys=[];
    for (let i=0;i<keys.length;i++) {
        let elem=obj[keys[i]];
        let include=true;
        if (elem.noinno) {
            include=false;
        }
        if (include) {
            newkeys.push(keys[i]);
        }
    }

    
    let max=newkeys.length;
    for (let i=0;i<max;i++) {
        let elem=obj[newkeys[i]];
        let title=elem.title;
            let url=elem.url;
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

    const gulpzip = require('gulp-zip');
    
    let cmdlist = ['pwd'];
    let ziplist = [];
    let inwin32=false;
    if (os.platform()==='win32') {
        inwin32=true;
    }

    console.log('In win 32=',inwin32,outdir,path.resolve(outdir));
    
    let errorf=function() { };
    console.log(colors.cyan(getTime()+' (electron '+version+') for: '+platform));
    let idir=indir+"/build/web";

    if (!inwin32) {
        let ind=platform.indexOf('win32');
        if (ind>=0) {
            platform.splice(ind,1);
            console.log(colors.red(getTime()+' Can not packge for win32 on '+os.platform()));
        }
    }

    
    for (let ia=0;ia<platform.length;ia++) {
        var n=platform[ia];
        var m=n,suffix=".zip";
        if (m==="darwin") {
            m="macos";
            suffix=".app.zip";
        }

        let absdistdir=path.normalize(path.resolve(distdir));
        let zipindir='BioImageSuiteWeb-'+n+'-x64';
        let appdir=path.join(absdistdir,zipindir);

        cmdlist.push(`rimraf ${appdir}`);
        
        if (dopackage>=2) {
            cmdlist.push(`rimraf ${path.resolve(idir,'node_modules')}`);
            if (dopackage===3) {
                cmdlist.push('npm install -d');
                cmdlist.push('modclean -r -a *.ts ');
            } else if (dopackage===2) {
                let zname=path.resolve(path.join(outdir,path.join('..',`electrondist/bisweb_${n}.zip`)));
                try {
                    let stats = fs.statSync(zname);
                    let bytes = stats["size"];
                    console.log('zname = ', zname,bytes);
                    cmdlist.push(`unzip -q ${zname}`);
                } catch(e) {
                    console.log(colors.red(e));
                    process.exit(1);
                }
            }
        }
        
        let basefile=distdir+"/bisweb_"+m+"_"+getVersionTag(version);
        let zipfile=basefile+suffix;

        
        
        let eversion ="4.0.1";
        let cmdline='electron-packager '+path.resolve(outdir)+' BioImageSuiteWeb --arch=x64 --electron-version '+eversion+' --out '+path.resolve(distdir)+' --overwrite '+
            '--app-version '+version;
        
        try {
            fs.unlink(zipfile,errorf);
        } catch(e) {
            errorf('error '+e);
        }

        let newappdir;
        if (n==='darwin')
            newappdir=appdir+'/BioImageSuiteWeb.app/Contents/Resources/app';
        else
            newappdir=appdir+'/resources/app';


        // Cleanup useless files before we electron package
        let todelete =  [
            path.resolve(path.join(newappdir,'node_modules/@tensorflow/tfjs-node/deps')),
            path.resolve(path.join(newappdir,'*.map')),
            path.resolve(path.join(newappdir,'server.zip')),
            path.resolve(path.join(newappdir,'mni2tal')),
            path.resolve(path.join(newappdir,'connviewer')),
            path.resolve(path.join(newappdir,'package-lock.json')),
            path.resolve(path.join(newappdir,'images/bisweb-*.png'))
        ];

        console.log('To Delete = ',JSON.stringify(todelete,null,2));
        let cleancmd='rimraf '+todelete.join(' ');
        
        if (n==="win32") {
            let ifile=path.resolve(indir,'web/images/bioimagesuite.png.ico');
            if (inwin32)
                cmdlist.push(cmdline+` --platform=win32 --icon ${ifile}`);
            else
                cmdlist.push(cmdline+` --platform=win32`);
            if (dopackage===3)
                cmdlist.push(cleancmd);
            if (dopackage>0)  {
                inno(tools,version,indir,distdir);
                let innofile=path.resolve(distdir,'biselectron.iss');
                cmdlist.push('c:\\unix\\innosetup5\\ISCC.exe '+innofile);
            }
        } else {
            if (n==="linux") 
                cmdlist.push(cmdline+' --platform=linux');
            else
                cmdlist.push(cmdline+` --platform=darwin --icon ${path.resolve(indir,'web/images/bioimagesuite.icns')}`);
            if (dopackage===3)
                cmdlist.push(cleancmd);
            if (dopackage>0)  {
                ziplist.push( {
                    zipfile : zipfile,
                    zipdir  : zipindir
                });
            }
        }
    }
    //console.log(getTime()+colors.green('About to execute in : win32=',inwin32,'\n path=', path.resolve(outdir),'\n\t', JSON.stringify(cmdlist,null,4)));

    let counter=0;
    let dozip=function() {

        //console.log('Ziplist=',ziplist);
        let elem=ziplist[counter];
        
        //console.log('counter=',counter,'elem=',elem);

        let outdir=path.resolve(path.join(distdir,elem.zipdir));
        let outfile=elem.zipfile;

        console.log(getTime()+' creating zip file: Outdir=',outdir,'outfile = ',outfile,'distdir=',distdir);
        
        gulp.src([outdir+'/**/*']).pipe(gulpzip(path.basename(outfile))).pipe(gulp.dest(distdir)).on('end', () => {
            outfile=path.resolve(outfile);

            let sz=getFileSize(outfile);
            if (sz>0)
                console.log(colors.green(getTime()+' ____ zip file created in '+outfile+' (size='+sz+' MB )'));
            else
                console.log(colors.red(getTime()+' ____ failed to create zip file '+outfile));
            counter=counter+1;
            if (counter>=ziplist.length)
                done();
            else
                dozip();
        });
    };

    if (ziplist.length<1)
        dozip=done;

    if (cmdlist.length>1) 
        executeCommandList(cmdlist,outdir,dozip);
    else
        done();
};


var createPackage=function(dopackage=1,tools=[],indir=_dirname+"../",outdir="build",version=1.0,platform="linux",distdir="builddist",done=null) {
    
    console.log(getTime()+' creating package: dopack=',dopackage,'indir=',indir,' outdir=',outdir,'\n\t\t version=',version,' platform=',platform,' distdir=',distdir);

    createPackageInternal(dopackage,tools,indir,outdir,version,platform,distdir,done);
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

var createnpmpackage=function(indir,version,in_outdir,done) {

    const rimraf= require('rimraf'),
          rename = require('gulp-rename'),
          es = require('event-stream');
    
    // Step 1 copy file
    // make directories
    let odir=path.resolve(path.join(in_outdir,'biswebbrowser'));
    console.log(colors.red(getTime()+' .... Deleting ',odir));
    try {
        rimraf.sync(odir);
    } catch(e) {
        console.log(e);
    }

    console.log(colors.green(getTime()+' Making directory',odir));
    fs.mkdirSync(odir);
    
    let distDir=path.join(odir,'dist');
    fs.mkdirSync(distDir);

    console.log(colors.green(getTime()+' Copying from',indir));
    es.concat( 
        gulp.src([ `${indir}/build/web/bislib.js`,
                   `${indir}/build/web/css/bootstrap_dark_edited.css`,
                   `${indir}/build/web/css/bootstrap_bright_edited.css`,
                   `${indir}/build/web/libbiswasm*wasm.js`,
                   `${indir}/build/web/webcomponents-lite.js`,
                   `${indir}/build/web/jquery.min.js`,
                   `${indir}/build/web/three.min.js`,
                   `${indir}/build/web/bootstrap.min.js`,
                   `${indir}/build/web/bislib.css`,
                   `${indir}/build/web/bislib_bright.css`,
                   `${indir}/build/web/biswebtest.css`,
                   `${indir}/build/web/biswebtest.html`,
                   `${indir}/build/web/biswebdisplaytest.css`,
                   `${indir}/build/web/biswebdisplaytest.html`,
                   `${indir}/build/web/exportexample.html`,
                   `${indir}/build/web/exportexample.js`,
                   `${indir}/js/coreweb/bis_dummy.js`,
                   `${indir}/build/web/bisdate.json`,
                 ]).pipe(gulp.dest(distDir)),
        gulp.src([ 'lib/fonts/*']).pipe(gulp.dest(distDir+'/fonts/')),
        gulp.src([ 'web/images/favicon.ico' , 'web/images/bioimagesuite.png']).pipe(gulp.dest(distDir+'/images/')),
        gulp.src([ 'web/images/mean_reg2mean.nii.gz', 'web/images/facemask_char.nii.gz']).pipe(gulp.dest(distDir+'/images/')),
        gulp.src([ `${indir}/web/bispreload.js`])
            .pipe(rename('electronpreload.js'))
            .pipe(gulp.dest(distDir+'/../electron/')),
        gulp.src([ `${indir}/web/package.json`])
            .pipe(rename('electrondependencies.json'))
            .pipe(gulp.dest(distDir+'/../electron/')),
        gulp.src([ `${indir}/config/biswebbrowser_readme.md`])
            .pipe(rename('README.md'))
            .pipe(gulp.dest(odir)),
    ).on('end', () => { 
        console.log(getTime()+' .... Files copied in',distDir);

        // Step 1 fix displaytest2.html
        //

        let fname=`${indir}/build/web/biswebdisplaytest2.html`;
        let lines=fs.readFileSync(fname,'utf-8').split('\n');
        let i=0;
        while (i<lines.length) {
            if (lines[i].indexOf('bis-external')>0) {
                lines[i]=lines[i]+'\n      bis-imagepath="https://bioimagesuiteweb.github.io/webapp/images/"';
                console.log("fixed = ",lines[i]);
                i=lines.length;
            }
            i=i+1;
        }

        
        fs.writeFileSync(distDir+'/biswebdisplaytest2.html',lines.join('\n'));
        
        // Step 2 create package.json

        let appinfo=require('../package.json');

        
        
        let obj = { 
            "private": false,
            "name": "biswebbrowser",
            "version": version,
            "description": appinfo.description,
            "homepage": appinfo.homepage,
            "main" : "dist/bislib.js",
            "author": appinfo.author,
            "license": "GPL v2 or Apache",
            "repository": {
                "type" : "git",
                "url" : "https://github.com/bioimagesuiteweb/bisweb",
            },
            devDependencies : appinfo.dependencies
        };
        
        let txt=JSON.stringify(obj,null,4)+"\n";
        let output=path.resolve(path.join(odir,"package.json"));
        console.log(getTime()+ '\t package.json = ',output);
        
        try {
            fs.writeFileSync(output,txt);
        } catch(e) {
            console.log(e);
        }
        console.log('++++');
        console.log('++++ Package.json file created in',output);
        console.log('++++');
        
        //        // Step 4 run npm pack
        //executeCommand('npm pack',odir,done);
        done();
    });
    
};

// -----------------------------------------------------------------------------------------
// Export line
// -----------------------------------------------------------------------------------------

module.exports = {
    getTime: getTime,
    getFileSize: getFileSize,
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
    createnpmpackage :     createnpmpackage,
};


