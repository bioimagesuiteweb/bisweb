

const BaseModule = require('basemodule.js');
const bis_genericio = require('bis_genericio');
const BisWebTextObject = require('bisweb_textobject.js');
const path=bis_genericio.getpathmodule();
const fs=bis_genericio.getfsmodule();
const baseutils=require("baseutils");


class CalciumPreprocessModule extends BaseModule {
    constructor() {
        super();
        this.name = 'MakeCalciumPreprocess';
    }

    createDescription() {

        return {
            "name": "Create CalciumPreprocess file",
            "description": "This module creates a makefile from a CalciumPreprocess json file. Use --sample true to get an example CalciumPreprocess file",
            "author": "Zach Saltzman and Xenios Papademetris",
            "version": "1.0",
            "inputs": [
                {
                    'type': 'image',
                    'name': 'Mask',
                    'description': 'The image frame to mask with',
                    'varname': 'mask',
                    'shortname': 'm',
                    'required': true,
                },
                {
                    'type': 'image',
                    'name': 'RefImage',
                    'description': 'The reference image frame',
                    'varname': 'refimage',
                    'shortname': 'r',
                    'required': true,
                }
            ],
            "outputs": [
                {
                    'type': 'text',
                    'shortname' : 'o',
                    'name': 'Results',
                    'description': 'output script',
                    'varname': 'output',
                    'required': true,
                    'extension': '.txt'
                },
            ],
            "buttonName": "Execute",
            "shortname": "info",
            "params": [
                {
                    "name": "setup",
                    "shortname" : "s",
                    "description": "Name of the input setup filename (result of stiching _step1)",
                    "advanced": false,
                    "type": "string",
                    "varname": "setup",
                    "default": ""
                },
                {
                    "name": "odir",
                    "shortname" : "d",
                    "description": "Output directory",
                    "advanced": false,
                    "type": "string",
                    "varname": "odir",
                    "default": ""
                },
                {
                    "name": "trimStart",
                    "description": "Number of frames to trim from the beginning of each timeseries",
                    "priority": 1,
                    "advanced": false,
                    "gui": "slider",
                    "type": 'int',
                    "default": 1,
                    "lowbound": 0,
                    "highbound": 15000,
                    "varname": "trimstart"
                },
                {
                    "name": "trimEnd",
                    "description": "Number of frames to trim from the end of each timeseries. If a file has 6000 frames and this is specified as 200, then the last frame used will by 5800.",
                    "priority": 2,
                    "advanced": false,
                    "gui": "slider",
                    "type": 'int',
                    "default": -1,
                    "lowbound": -15000,
                    "highbound": 15000,
                    "varname": "trimend"
                },
                {
                    "name": "Sigma",
                    "description": "The gaussian kernel standard deviation (either in voxels or mm)",
                    "priority": 3,
                    "advanced": false,
                    "gui": "slider",
                    "varname": "sigma",
                    "default": 1.0,
                    "type": 'float',
                    "low":  0.0,
                    "high": 8.0
                },
                {
                    "name": "In mm?",
                    "description": "Determines whether kernel standard deviation (sigma) will be measured in millimeters or voxels",
                    "priority": 4,
                    "advanced": false,
                    "gui": "check",
                    "varname": "inmm",
                    "type": 'boolean',
                    "default": true,
                },
                {
                    "name": "FWHMAX?",
                    "description": "If true treat kernel in units of full-width-at-half max (FWHM) (not as the actual value of the sigma in the gaussian filter.)",
                    "priority": 5,
                    "advanced": false,
                    "gui": "check",
                    "varname": "fwhmax",
                    "type": 'boolean',
                    "default": false,
                },
                {
                    "name": "Interpolation",
                    "description": "Which type of interpolation to use (3 = cubic, 1 = linear, 0 = nearest-neighbor)",
                    "priority": 6,
                    "advanced": false,
                    "gui": "dropdown",
                    "type": "int",
                    "default" : "1",
                    "varname": "interpolation",
                    "fields" : [ 0,1,3 ],
                    "restrictAnswer" : [ 0,1,3],
                },
                {
                    "name": "Fill Value",
                    "description": "Value to use for outside the image",
                    "priority": 7,
                    "advanced": true,
                    "gui": "slider",
                    "type": "float",
                    "varname": "backgroundvalue",
                    "default" : 0.0,
                },
                {
                    "name": "Res factor",
                    "description": "The amount to downsample the reference by",
                    "priority": 8,
                    "advanced": false,
                    "gui": "slider",
                    "type": "float",
                    "varname": "res",
                    "default" : 2.0,
                    "low" : 1.0,
                    "high" : 4.0
                },
                {
                    "name": "df over f",
                    "description": "Computes df/f normalization",
                    "varname": "dff",
                    "type": "boolean",
                    "default": false,
                    "priority" : 9,
                },
                {
                    "name": "regress",
                    "description": "if true regress out second image from first else just normalization",
                    "varname": "doregress",
                    "type": "boolean",
                    "default": true,
                    "priority" : 10,
                },
                {
                    "name": "Dilation",
                    "description": "The amount (in voxels) to dilate the mask by",
                    "priority": 11,
                    "advanced": false,
                    "gui": "slider",
                    "type": "int",
                    "varname": "dilation",
                    "default" : 0,
                    "low" : 0,
                    "high" : 5
                },
                {
                    "name": "biswebpy",
                    "description": "Name of the main python script (else biswebpy)",
                    "advanced": true,
                    "type": "string",
                    "varname": "biswebpy",
                    "default": "",
                    "priority" : 100,
                },
                {
                    "name": "python3",
                    "description": "Name of the main python3 executable",
                    "advanced": true,
                    "type": "string",
                    "varname": "python",
                    "default": "python3",
                    "priority" : 100,
                },
                baseutils.getDebugParam()
            ]
        };
    }

    async directInvokeAlgorithm(vals) {

        let data=null;
        try {
            let obj=await bis_genericio.read(vals.setup);
            try { 
                data=JSON.parse(obj.data);
            } catch(e) {
                console.log('.... failed to parse setup file',vals.setup);
                return Promise.reject(e);
            }
        } catch(e) {
            console.log('.... failed to read setup file',vals.setup);
            return Promise.reject(e);
        }
        console.log('Setup=',JSON.stringify(data,null,2));

        vals.odir=vals.odir || '';
        if (vals.odir.length<1) {
            console.log('_ No output directory specified, specify this using the --odir flag');
            reject('');
            return;
            
        }

        let tmpdir='';

        if (vals.odir!=='none') {
            vals.odir = path.resolve(path.normalize(vals.odir));
            try {
                await bis_genericio.makeDirectory(vals.odir);
                tmpdir=path.join(vals.odir,'tmp');
                await bis_genericio.makeDirectory(tmpdir);

            } catch(e) {
                return Promise.reject(e);
            }
        }
        
     

        let nodejscommand=process.argv[0]+' '+process.argv[1];
        console.log('Command=',nodejscommand)

        let pythoncommand='biswebpy';

        if (vals['biswebpy']==='') {
            let s=process.argv[1];
            let index=s.lastIndexOf('js/bin');
            if (index>0) {
                pythoncommand=vals['python']+' '+path.join(s.substring(0,index-1),
                    path.join('biswebpython','biswebpy.py'));            
            }
        }
        console.log('Python=',pythoncommand);
 

        this.outputs['output']=new BisWebTextObject();
        this.outputs['output'].setText('hello');

        let outtext='#\n';

        let numchannels=data.numchannels;
        let numruns=data.runs.length;
        let channelnames=data.channelnames;

        let outnames=[];
        let debug=this.parseBoolean(vals['debug']);
        let step1names={};

        let step1=[];
        let step2=[];
        let step3=[];

        this.resampledmaskname='';

        for (let run=0;run<numruns;run++) {
            step1names[run]={};
            for (let channel=0;channel<numchannels;channel++) {

                let fname=data.runs[run][channelnames[channel]];
                let outname=path.basename(fname);

                // Trim
                let ind=outname.lastIndexOf('.nii.gz');
                outname=path.join(tmpdir,outname.substr(0,ind)+'_trimmed.nii.gz');
                console.log('1',fname,'-->',outname);
                outnames.push(outname);
                step1.push(outname);

                outtext=outtext+outname+' : '+fname+'\n\t'+nodejscommand+` largeextractframes  -i ${fname} -o ${outname}`; 
                outtext+=` --beginframe ${vals['trimstart']} --endframe ${vals['trimend']}`;
                if (!debug) outtext+=` > ${outname}.log 2>&1`;
                outtext+=`\n\n`;
                
                // Smoothing
                let ind2=outname.lastIndexOf('.nii.gz');
                let outname2=outname.substr(0,ind2)+'_smoothed.nii.gz';
                outnames.push(outname2);
                outtext=outtext+outname2+' : '+outname+'\n\t'+nodejscommand+` largesmoothfilter -i ${outname}`;
                outtext+=` -o ${outname2}`; 
                outtext+=` --sigma ${vals['sigma']} --inmm ${vals['inmm']} --fwhmax ${vals['fwhmax']}`
                if (!debug) outtext+=` > ${outname2}.log 2>&1`;
                outtext+=`\n\n`;
                step1.push(outname2);

                let tmp='1 0 0 0\n0 1 0 0\n0 0 1 0\n0 0 0 1';
                let identity=path.join(tmpdir,'identity.matr');
                if (run===0 && channel===0) { 
                    await bis_genericio.write(identity,tmp);
                }

                let ind3=outname2.lastIndexOf('.nii.gz');
                let outname3=outname2.substr(0,ind3)+'_resampled.nii.gz';
                outnames.push(outname3);
                let refname=this.inputs['refimage'].getFilename();

                outtext=outtext+outname3+' : '+outname2+'\n\t'+nodejscommand+` largereslice -i ${outname2} -o ${outname3}`;
                outtext+=` -r ${refname} -x ${identity} --interpolation ${vals['interpolation']}`;
                outtext+=` --res ${vals['res']}`;
                if (!debug) outtext+=` > ${outname3}.log 2>&1`;
                outtext+=`\n\n`;
                step2.push(outname3);

                if (run===0 && channel===0) {
                    let maskname=this.inputs['mask'].getFilename();
                    let ind3=maskname.lastIndexOf('.nii.gz');
                    let m2=path.basename(maskname.substr(0,ind3));
                    console.log('Maskname=',maskname,vals.odir);
                    this.resampledmaskname=path.join(vals.odir,m2+'_resampled.nii.gz');
                    console.log(' N=',this.resampledmaskname);
                    outnames.push(this.resampledmaskname);
                    let outname3=this.resampledmaskname;
                    let refname=this.inputs['refimage'].getFilename();
    
                    outtext=outtext+outname3+' : '+maskname+'\n\t'+nodejscommand+` largereslice -i ${maskname} -o ${outname3}`;
                    outtext+=` -r ${refname} -x ${identity} --interpolation 0`;
                    outtext+=` --res ${vals['res']}`;
                    if (!debug) outtext+=` > ${outname3}.log 2>&1`;
                    outtext+=`\n\n`;
                    step2.push(outname3);
    
                }

                step1names[run][channel]=outname3;
            }
        }

        for (let run=0;run<numruns;run++) {
            let f1=step1names[run][0];
            let f2=step1names[run][1];

            let ind4=f1.lastIndexOf('_channel');
            let dff=this.parseBoolean(vals['dff']);
            let doregress=this.parseBoolean(vals['doregress']);
            if (!dff && !doregress) {
                console.log('One of dff and regress must be true');
                return Promise.reject('But dff and regression');
            }

            let suffix='';
            if (doregress) {
                suffix=suffix+'_regress';
            }
            if (dff) {
                suffix=suffix+'_dff';
            };



            let outname4=f2.substr(0,ind4)+suffix+'.nii.gz';
            outnames.push(outname4);
            step3.push(outname4);
            outtext+=outname4+' : '+f1+' '+f2+'\n\t'+pythoncommand+` dualImageRegression --input ${f2} `;
            outtext+=` -o ${outname4}`;
            outtext+=` --doregress ${doregress} --dff ${dff} --regress ${f2}`;
            if (!debug) outtext+=` > ${outname4}.log 2>&1`;
            outtext+=`\n\n`;
            
            let ind5=outname4.lastIndexOf('.nii.gz');

            let outname5=outname4.substr(0,ind5)+'_masked.nii.gz';
            outname5=path.join(vals.odir,path.basename(outname5));
            outnames.push(outname5);
            step3.push(outname5);
            let maskname=this.inputs['mask'].getFilename();

            outtext+=outname5+' : '+outname4+'\n\t'+nodejscommand+` largemaskimage -i ${outname4} -m ${this.resampledmaskname} -o ${outname5}`;
            outtext+=` --dilation ${vals['dilation']}`;
            if (!debug) outtext+=` > ${outname5}.log 2>&1`;
            outtext+=`\n\n`;
            
        }

        console.log('outtext=',outtext)

        let makefile=path.join(vals.odir,'makefile');

        let top='all : '+outnames.join(' ')+'\n\t echo "Computing all"\n\n';
        
        top+='step1 : '+step1.join(' ')+'\n\n';
        top+='step2 : '+step2.join(' ')+'\n\n';
        top+='step3 : '+step3.join(' ')+'\n\n';
        

        outtext=top+outtext;

        await bis_genericio.write(makefile,outtext);
        console.log('Makefile saved in ',makefile)



        return Promise.resolve('Done');

    }
};

module.exports = CalciumPreprocessModule;
