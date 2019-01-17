

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

/* jshint node:true */

"use strict";

require('./config/bis_checknodeversion');

const gulp = require('gulp'),
      program=require('commander'),
      os = require('os'),
      fs = require('fs'),
      path=require('path'),
      colors=require('colors/safe'),
      bis_gutil=require('./config/bis_gulputils'),
      rimraf=require('rimraf'),
      es = require('event-stream');


const getTime=bis_gutil.getTime;
const getFileSize=bis_gutil.getFileSize;
// ------------------------------------ Utility Functions ---------------------------------------------


// -----------------------------------------------------------------------------------------
// Command Line stuff 
// -----------------------------------------------------------------------------------------

program
    .option('-i, --input <s>','mainscript to build')
    .option('-m, --minify','flag to minify')
    .option('-l, --platform  <s>','platform')
    .option('-p, --dopack <s>','dopackage 0=electron-packager, 1=run inno or zip in addition, 2=using zip distribution for node_modules, 3 run npm install',parseInt)
    .option('-e, --eslint <n>','if 0 use jshint instead of eslint',parseInt)
    .option('-w, --worker','if present build the webworker as well')
    .option('-s, --sworker','if present build the service worker and index.js as well')
    .option('--tf','if true package tensorfow in electron app')
    .option('--localhost','only local access')
    .option('--portno <s>','port for server (8080 is default)')
    .option('--internal <n>','if 1 use internal code, if 2 serve the internal directory as well',parseInt)
    .option('--external <n>','if 1 use extra external code (in ../external)',parseInt)
    .option('--verbose','verbose')
    .parse(process.argv);


if (program.dopack === undefined)
    program.dopack=2;

//console.log('Workers=',program.worker,program.sworker);

let options = {
    inpfilename : program.input || "all",
    outdir : "build/web",
    distdir : "build/dist",
    verbose : program.verbose || false,
    platform : program.platform || os.platform(),
    dopack : program.dopack || 0,
    webworker : program.worker || false,
    eslint : program.eslint,
    sworker : program.sworker || false,
    internal : program.internal,
    external : program.external || 0 ,
    portno : parseInt(program.portno) || 8080,
    hostname : '0.0.0.0',
    tensorflow : program.tf || false,
};


if (program.localhost)
    options.hostname='localhost';

if (program.minify)
    options.minify=1;
else
    options.minify=0;

if (program.internal === undefined)
    options.internal=1;

if (program.eslint === undefined)
    options.eslint=1;





if (options.tensorflow === false) {
    if (options.dopack===2)
        options.dopack=3;
}

//console.log('Tensorflow=',options.tensorflow,options.dopack);



const mainoption=program.rawArgs[2];

// -----------------------------------------------------------------------------------------
// Install and Zip Issues
// Second pass to help with gulp zip and gulp package
// -----------------------------------------------------------------------------------------

if (mainoption=="fullpackage")
    options.dopack=2;


options.baseoutput=".";
options.outdir+="/";

let plat=options.platform;
if (plat==='all') {
    plat=[ 'win32','linux'];
    if (os.platform()!=='win32')
        plat.push("darwin");
} else {
    plat=options.platform.split(",");
}
options.platform=plat;


if (options.verbose) {
    console.log(getTime()+' Full options ='+JSON.stringify(options,null,2)+'.\n');
}

// -----------------------------------------------------------------------------------------
// M A I N  P R O G R A M Set internal structure with all parameters
// -----------------------------------------------------------------------------------------

let internal = {
    dependcss : [ 
        "./lib/css/bootstrap_dark_edited.css", 
        "./lib/css/bootstrap-colorselector.css",
        "./node_modules/jstree/dist/themes/default/style.css",
        "./web/biscommon.css"
    ],
    lintscripts : ['js/**/*.js','config/*.js','compiletools/*.js','*.js','web/**/*.js','test/**/*.js','fileserver/*.js'],
    toolarray : [ 'index'],
    htmlcounter : 0,
    csscounter  : 0,
    jscounter   : 0,
    bislib     : 'bislib.js',
    biscss     : 'bislib.css',
    indexlib   : 'index.js',
    serviceworkerlib : 'bisweb-sw.js',
    webworkerlib  : 'webworkermain.js',
    serveroptions : { },
    setwebpackwatch : 0,
};


// Define server options
internal.serveroptions = {
    "root" : path.normalize(__dirname),
    "host" : options.hostname,
    "port" : `${options.portno}`,
    'directoryListing': true,
};

if (options.external>0) {
    options.external=1;
}

if (options.internal>=2 || options.external>0)  {
    internal.serveroptions = {
        "root" : path.normalize(path.resolve(__dirname,'..'))
    };
}


if (options.internal) {
    internal.lintscripts.push('../internal/js/*/*.js');
    internal.lintscripts.push('../internal/js/*.js');
}

if (options.external) {
    internal.lintscripts.push('../external/js/*/*.js');
    internal.lintscripts.push('../external/js/*.js');
}


// ---------------------------
// Get Tool List
// ---------------------------

internal.appinfo=require('./package.json');
internal.setup=require('./web/images/tools.json');

// Let example tools
internal.extra=require('./web/images/examples.json');
let keys2=Object.keys(internal.extra.tools);
for (let i=0;i<keys2.length;i++) {
    internal.setup.tools[keys2[i]]=internal.extra.tools[keys2[i]];
}



let keys=Object.keys(internal.setup.tools);
console.log(getTime()+colors.cyan(' Config versiontag='+bis_gutil.getVersionTag(internal.appinfo.version)+' tools='+keys));

if (options.inpfilename === "" || options.inpfilename === "all") {
    let obj=internal.setup.tools;
    let keys=Object.keys(obj);
    options.inpfilename ='index,'+keys.join(",");
} 

// ------------------------
// Define webpack jobs
// ------------------------

if (mainoption==="build") {
    options.sworker=1;
    options.webworker=1;
}


internal.webpackjobs = [ { path: './js/webcomponents/' , name: internal.bislib } ];
if (options.inpfilename === 'index') {
    internal.webpackjobs=[];
}

if (options.sworker) {
    internal.webpackjobs.push({ path: './web/' ,  name : internal.indexlib });
    internal.webpackjobs.push({ path: './web/' ,  name : internal.serviceworkerlib });

}

if (options.webworker) {
    internal.webpackjobs.push(
        { path : "./js/webworker/",
          name : internal.webworkerlib,
        });
}

// -------------------------------
// Verbose Info
// -------------------------------

if (options.verbose) {
    console.log(getTime()+' Scripts to process are '+colors.cyan(options.inpfilename));
}

// ------------------------------- ------------------------------- -------------------------------
//
// Preliminaries Over
//
// Define Tasks
//
// ------------------------------- ------------------------------- -------------------------------

function createDate() {

    return new Promise( (resolve) => { 
        const git = require('git-rev');
        git.long( (str) => {
            bis_gutil.createDateFile(path.resolve(options.outdir,'bisdate.json'),str,internal.appinfo.version);
            bis_gutil.createDateFile(path.resolve(options.outdir,'../wasm/bisdate.js'),str,internal.appinfo.version);
            resolve();
        });
    });
}


// ------------------ JSHint ------------------

gulp.task('jshint',  (done) => {

    const jshint = require('gulp-jshint');
    for (let i=0;i<internal.lintscripts.length;i++) {
        
        gulp.src(internal.lintscripts[i])
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
    done();
});



gulp.task('eslint',  () => { 
    // ESLint ignores files with "node_modules" paths.
    // So, it's best to have gulp ignore the directory as well.
    // Also, Be sure to return the stream from the task;
    // Otherwise, the task may end before the stream has finished.

    
    const eslint = require('gulp-eslint');
    console.log(colors.yellow(getTime(),"Scannng scripts ",internal.lintscripts.join(',')));
    return gulp.src(internal.lintscripts)
    // eslint() attaches the lint output to the "eslint" property
    // of the file object so it can be used by other modules.
        .pipe(eslint({
            "env": {
                "browser": true,
                "node": true,
                "commonjs": true,
                "es6": true
            },
            "extends": "eslint:recommended",
            "parserOptions": {
                "sourceType": "module",
                "ecmaVersion": 2017
            },
            "rules": {
                'no-console': 'off',
                'indent' : 'off',
                "semi": [
                    "error",
                    "always"
                ]
            }
        })).pipe(eslint.format());
});


gulp.task('watch', () => { 
    if (options.eslint)
        return gulp.watch(internal.lintscripts, gulp.series('eslint'));
    return gulp.watch(internal.lintscripts, gulp.series('jshint'));
});


// ------------------------------------------------------------------------
gulp.task('webpack', function (done) {

    createDate().then( () => {
        bis_gutil.runWebpack(internal.webpackjobs,
                             options.internal,
                             options.external,
                             __dirname,
                             options.minify,
                             options.outdir,
                             options.verbose,
                             internal.setwebpackwatch).then( () => {
                                 console.log(getTime()+' webpack done num jobs=',internal.webpackjobs.length);
                                 done();
                             });
    });
});


gulp.task('testdata', ((done) => {

    const gulpzip = require('gulp-zip');

    console.log(gulpzip);
    let outdir=path.resolve(path.join(options.distdir,'test'));
    let outfile=path.resolve(path.join(options.distdir,'testdata.zip'));
    rimraf.sync(outdir);
    rimraf.sync(outfile);

    console.log(getTime()+' Creating zip file '+outfile);
    es.concat(
        gulp.src(['./test/testdata/**/*']).pipe(gulp.dest(outdir+'/testdata')),
        gulp.src(['./test/webtestdata/**/*']).pipe(gulp.dest(outdir+'/webtestdata')),
        gulp.src(['./test/module_tests.json']).pipe(gulp.dest(outdir)),
    ).on('end', () => {
        console.log(getTime()+' Files copied to '+outdir+', creating '+outfile);
        gulp.src([outdir+'/**/*']).pipe(gulpzip(path.basename(outfile))).pipe(gulp.dest(options.distdir)).on('end', () => {
            console.log(getTime()+ ' Done zipping '+outfile);
            let sz=getFileSize(outfile);
            if (sz>0)
                console.log(colors.green(getTime()+' ____ zip file created in '+outfile+' (size='+sz+' MB )'));
            else
                console.log(colors.red(getTime()+' ____ failed to create zip file '+outfile));
            done();
        });
    });
}));

gulp.task('buildtest', ((done) => {

    let maincss    = './web/biswebtest.css';
    let maincss2    = './web/biswebdisplaytest.css';    

    Promise.all([
        bis_gutil.createHTML('biswebtest',options.outdir,'bislib.js',internal.biscss),
        bis_gutil.createCSSCommon([maincss],'biswebtest.css',options.outdir),
        bis_gutil.createHTML('biswebdisplaytest',options.outdir,'bislib.js',internal.biscss),
        bis_gutil.createHTML('biswebdisplaytest2',options.outdir,'bislib.js',internal.biscss),
        bis_gutil.createCSSCommon([maincss2],'biswebdisplaytest.css',options.outdir),
    ]).then( () => { done();});
    
}));

gulp.task('setwebpackwatch', (done) => {
    
    internal.setwebpackwatch=1;
    done();
});
    


gulp.task('webserver', ()=> {
    const webserver = require('gulp-webserver');
    console.log(colors.red(getTime()+' server options=',JSON.stringify(internal.serveroptions)));
    return gulp.src('.').pipe(webserver(internal.serveroptions));
});


gulp.task('commonfiles', (done) => { 

    const rename = require('gulp-rename');

    let name='package_notf';

    if (options.tensorflow)
        name='package';
    
    console.log(getTime()+' Copying css,fonts,images etc. . tensorflow=',options.tensorflow);

    es.concat(
        gulp.src([ 'node_modules/bootstrap/dist/css/*']).pipe(gulp.dest(options.outdir+'css/')),
        gulp.src([ 'node_modules/bootstrap/dist/fonts/*']).pipe(gulp.dest(options.outdir+'fonts/')),
        gulp.src([ 'web/images/**/*']).pipe(gulp.dest(options.outdir+'/images/')),
        gulp.src([ 'lib/fonts/*']).pipe(gulp.dest(options.outdir+'/fonts/')),
        gulp.src([ 'web/manifest.json']).pipe(gulp.dest(options.outdir)),
        gulp.src('./web/bispreload.js').pipe(gulp.dest(options.outdir)),
        gulp.src('./web/biselectron.js').pipe(gulp.dest(options.outdir)),
        gulp.src('./web/'+name+'.json').pipe(rename({'basename' : 'package'})).pipe(gulp.dest(options.outdir)),
        gulp.src('./lib/css/bootstrap_dark_edited.css').pipe(gulp.dest(options.outdir)),
        gulp.src('./lib/js/webcomponents-lite.js').pipe(gulp.dest(options.outdir)),
        gulp.src('./node_modules/jquery/dist/jquery.min.js').pipe(gulp.dest(options.outdir)),
        gulp.src('./node_modules/three/build/three.min.js').pipe(gulp.dest(options.outdir)),
        gulp.src('./web/aws/biswebaws.html').pipe(gulp.dest(options.outdir)),
        gulp.src('./web/aws/awsparameters.js').pipe(gulp.dest(options.outdir)),
        gulp.src('./node_modules/bootstrap/dist/js/bootstrap.min.js').pipe(gulp.dest(options.outdir)),
        gulp.src([ 'web/manifest.json']).pipe(gulp.dest(options.outdir))
    ).on('end', () => {
        bis_gutil.createHTML('console',options.outdir,'',internal.biscss);
        done();
    });
});


gulp.task('tools', ( (cb) => {
    
    internal.toolarray = options.inpfilename.split(",");
    console.log(getTime()+colors.green(' Building tools ['+internal.toolarray+']'));

    console.log(getTime()+colors.green(' Building tool     : common css'));

    let promises=[];
    
    promises.push(bis_gutil.createCSSCommon(internal.dependcss,internal.biscss,options.outdir));
    
    for (let index=0;index<internal.toolarray.length;index++) {
        let toolname=internal.toolarray[index];
        let gpl=true;
        if (toolname!=='index') {
            if (internal.setup.tools[toolname].nogpl)
                gpl=false;
        }
        console.log(getTime()+colors.green(' Building tool '+(index+1)+'/'+internal.toolarray.length+' : '+toolname));
        internal.jscounter+=1;

        let jsname =internal.bislib;
        if (index===0)
            jsname=internal.indexlib;
        promises.push(bis_gutil.createHTML(toolname,options.outdir,jsname,internal.biscss,gpl));

        let customcss='./web/'+toolname+'.css';
        if (fs.existsSync(customcss))
            promises.push(bis_gutil.createCSSCommon([customcss],toolname+'.css',options.outdir));

        let customjs='web/'+toolname+'.js';
        if (fs.existsSync(customjs)) {
            console.log(getTime()+'\tCopying  JS '+customjs);
            promises.push( new Promise((resolve) => {
                gulp.src([ customjs ]).pipe(gulp.dest(options.outdir)).on('end', () => { resolve();});
            }));
        }
    }
    Promise.all(promises).then( () => { cb();});
}));

gulp.task('zip', ((done) => {
    
    bis_gutil.createZIPFile(options.baseoutput,options.outdir,internal.appinfo.version,options.distdir,done);
}));

gulp.task('packageint', (done) => {

    bis_gutil.createPackage(options.dopack,
                            internal.setup.tools,
                            __dirname,options.outdir,internal.appinfo.version,options.platform,options.distdir,done);
});

gulp.task('package', gulp.series('commonfiles','packageint'));

gulp.task('clean', () => { 

    const del = require('del');
    let arr = [options.outdir+'#*',
               options.outdir+'*~',
               options.outdir+'*.js*',
               options.outdir+'*.zip',
               options.outdir+'*.wasm',
               options.outdir+'*.png',
               options.outdir+'*.html*',
               options.outdir+'*.css*',
               options.outdir+'css/*',
               options.outdir+'fonts/*',
               options.outdir+'images/*',
               options.outdir+'doc/*',
               options.outdir+'node_modules',
               options.outdir+'test',
               options.distdir+"/*",
              ];
    
    console.log(getTime()+' Cleaning files ***** .');
    return del(arr);
});

gulp.task('jsdoc', (done) => { 
    bis_gutil.jsDOC(__dirname,'config/jsdoc_conf.json',done);
});

gulp.task('cdoc', (done) =>  { 
    bis_gutil.doxygen(__dirname,'config/Doxyfile',done);
});

gulp.task('npmpack', (done) => { 
    bis_gutil.createnpmpackage(__dirname,internal.appinfo.version,'build/dist',done);
});


// -------------------- Straight compound tasks
gulp.task('buildint', gulp.series('commonfiles','tools','buildtest'));

gulp.task('build',gulp.parallel(
    'webpack',
    gulp.series('commonfiles','tools','buildtest'),
));



gulp.task('buildpackage', gulp.series('buildint',
                                      'package'));

gulp.task('doc', gulp.parallel('jsdoc','cdoc'));


gulp.task('serve',
          gulp.series(
              'setwebpackwatch',
              'webserver',
              gulp.parallel(
                  'watch',
                  'webpack')
          ));

gulp.task('default', gulp.series('serve'));


