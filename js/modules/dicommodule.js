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

//TODO: store DCM2NIIX for each platform (package dcm2niix appropriately). stringify dcm2niix and store it somewhere on disk, then read it and parse it before using it.
const BaseModule = require('basemodule.js');
const baseutils = require('baseutils.js');
const sysutils = require('bis_filesystemutils.js');
const bis_util = require('bis_util.js');
const bis_commandlineutils = require('bis_commandlineutils.js');
const bis_genericio = require('bis_genericio.js');
const BidsModule = require('./bis_bidsmodule.js');
const path = bis_genericio.getpathmodule();
const fs = bis_genericio.getfsmodule();
const os = bis_genericio.getosmodule();

class DicomModule extends BaseModule {
    constructor() {
        super();
        this.name = 'Dicom Conversion';
    }

    createDescription() {

        return {
            "name": "Dicom Conversion",
            "description": "This module converts raw DICOM data into NIFTI form using dcm2niix, then formats it to BIDS specifications",
            "author": "Zach Saltzman",
            "version": "1.0",
            "inputs": [],
            "outputs": [
                {
                    'type': 'text',
                    'name': 'Results',
                    'description': 'log file',
                    'varname': 'logoutput',
                    'required': false,
                    'extension': '.bistext'
                },
            ],
            "buttonName": "Execute",
            "shortname": "info",
            "params": [
                {
                    "name": "Input Directory",
                    "description": "Input directory for the DICOM conversion",
                    "advanced": true,
                    "type": "string",
                    "varname": "inputDirectory",
                    "default": ""
                },
                {
                    "name": "Output Directory",
                    "description": "Output directory for the DICOM conversion. Optional, saves in /tmp if not specified",
                    "advanced": true,
                    "required": false,
                    "type": "string",
                    "varname": "outputDirectory",
                    "default": ""
                },
                {
                    "name": "Convert to BIDS",
                    "description": "Whether or not to format the DCM2NII converted files to BIDS. Optional, defaults to true",
                    "advanced": true,
                    "required": false,
                    "type": "boolean",
                    "varname": "convertbids",
                    "default": true
                },
                baseutils.getDebugParam()
            ]
        };
    }

    // ---------------------------------------------------------------------------------
    /** getdcm2ni
     * @returns {String} -- string to dcm2niix dcmbinary
     */
    async getdcm2niibinary() {

        // Source version
        let dcmpath=path.resolve(path.join(__dirname,'dcm2nii_binaries'));
        //console.log('Original dcmpath=',dcmpath,__dirname);

        if (typeof window !== "undefined") {
            let scope=window.document.URL.split("?")[0];
            let index=scope.lastIndexOf("/");
            
            // First 8 characters are file:///
            if (os.platform()==='win32')
                scope=scope.substr(8,index-8)+"/dcm2nii_binaries";
            else
                scope=scope.substr(7,index-7)+"/dcm2nii_binaries";
            dcmpath=path.resolve(scope);
        } else if (!fs.existsSync(dcmpath)) {
            //console.log("It does not exist", dcmpath);
            dcmpath=path.resolve(path.join(__dirname,'../../web/dcm2nii_binaries'));
        }

        let dcmBinaryFolder = dcmpath, dcmbinary = '';

        //console.log('dcmBinaryFolder', dcmBinaryFolder);
        switch (os.platform()) {
            case 'win32' : dcmbinary = dcmBinaryFolder + '/windows/dcm2niix.exe'; break;
            case 'darwin' : dcmbinary = dcmBinaryFolder + '/mac/dcm2niix'; break;
            case 'linux' : dcmbinary = dcmBinaryFolder + '/linux/dcm2niix'; break;
            default : console.log('Cannot process dcm2nii for unknown architecture', os.platform(), 'returned by os.platform'); return false;
        }

        let stats = fs.statSync(dcmbinary);
        console.log('....\n.... dcm2niix binary found=',dcmbinary, 'size=', stats.size/1024, 'Kb');
        return dcmbinary;
    }



    
    // ---------------------------------------------------------------------------------
    /** Run Algorithm */
    
    async directInvokeAlgorithm(vals) {

        console.log('oooo invoking: dicommodule with vals', JSON.stringify(vals));

        // -------------------- Check Directories and create as needed --------------------
        let indir = vals.inputDirectory, outdir = vals.outputDirectory, tmpdir = null;

        if (indir.length<1 || outdir.length<1) {
            return Promise.reject('No input or output directory specified.');
        }
        
        if (path.sep === '\\')  {
            indir = bis_util.filenameUnixToWindows(indir);
        }
        
        // Input directory
        // --------------------------------------------
        if (!sysutils.validateFilename(indir)) 
            return Promise.reject('Bad Input directory '+indir);
        
        // Output Directory
        // --------------------------------------------
        let outdir2 = outdir;
        if (path.sep === '\\')  
            outdir2=bis_util.filenameUnixToWindows(outdir);
        
        if (!sysutils.validateFilename(outdir2)) 
            return Promise.reject('Bad output directory '+outdir);

        // Create this
        try {
            fs.mkdirSync(outdir);
        } catch (e) {
            if (e.code !== 'EEXIST') {
                return Promise.reject('Failed to create output directory ' + outdir);
            }
        }

        
        // Temp Dir 
        // --------------------------------------------
        
        if (vals.convertbids) { 
            tmpdir = path.join(sysutils.tempdir, 'dicom_' + Date.now());

            try {
                fs.mkdirSync(tmpdir);
            } catch (e) {
                if (e.code !== 'EEXIST') {
                    return Promise.reject('Failed to create temporary directory ' + tmpdir);
                }
            }
        }

        // Now all systems go
        // ----------------------------------------------------------------------------

        return new Promise( async (resolve,reject) => { 

            // TODO add the listen method from outside somehow
            // So if it exists it sends update to browser
            /*let listen= (message) => {
              this.sendCommand(socket,'dicomConversionProgress', message);
              };*/
            
            let dcm2nii = await this.getdcm2niibinary();
            let cmd = dcm2nii + ' -z y ' + ' -o ' + (vals.convertbids ?  tmpdir : outdir) + ' -ba y -c bisweb ' + indir;
            console.log('.... executing :'+cmd+'\n....');

            try { 
                let m = await bis_commandlineutils.executeCommandAndLog(cmd, process.cwd());
                if (bis_genericio.getmode() !== 'node' )
                    console.log(m);
            } catch(e) {
                reject(e);
                return false;
            }
                
            if (vals.convertbids) {
                let bidsmodule = new BidsModule();
                try {
                    let bidsoutput = await bidsmodule.directInvokeAlgorithm({ 'inputDirectory' : tmpdir,
                                                                              'outputDirectory' : outdir});
                    console.log('.... removing temporary directory = '+tmpdir);
                    await bis_genericio.deleteDirectory(tmpdir);
                    console.log('.... all done (bids), returning output path = '+outdir);
                    resolve(bidsoutput);
                    return true;
                } catch (e) {
                    reject(e);
                    return false;
                }
            }
            console.log('.... all done (no bids), returning output path = '+outdir);
            resolve(outdir);
            return true;
        });
    }
}

module.exports = DicomModule;
