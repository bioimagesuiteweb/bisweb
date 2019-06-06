'use strict';

const bis_genericio = require('bis_genericio');
const colors=bis_genericio.getcolorsmodule();
const fs = bis_genericio.getfsmodule();

const biswrap = require('libbiswasm_wrapper.js');
const baseutil = require('baseutils.js');

//Need to keep track of labels to know if there are repeats, in which case they should be given a run number
let labelsMap = {};

const dicomParametersFilename = 'dicom_job_info.json';
const sourceDirectoryName = 'sourcedata';
const DEBUG=false;

function timeout(ms) {  return new Promise(resolve => setTimeout(resolve, ms)); }

// DICOM2BIDS
/**
 * Performs NII 2 Bids conversion on data generated by dcm2nii. 
 * When finished, the files will be placed in the specified output directory in a folder named 'source'. See BIDS specifications for more details on file structure. 
 * This function will also calculate checksums for each of the NIFI images before returning. This is to ensure data integrity. 
 * 
 * @param {Dictionary} opts  - the parameter object
 * @param {String} opts.indir - the input directory (output of dcm2nii)
 * @param {String} opts.outdir - the output directory (output of this function)
 * @param {Boolean} opts.dcm2nii - whether or not this function was invoked at the end of a dcm2niix conversion process. false by default.
 * @returns {Promise} -- when done with payload the list of converted files
 */
let dicom2BIDS = async function (opts) {

    try {
        let errorfn = ((msg) => {
            console.log('---- dicom2BIDS Error=', msg);
            return msg;
        });

        let indir = opts.indir || '';
        let outdir = opts.outdir || '';
        let dcm2nii = opts.dcm2nii || false;

        console.log('++++ dicom2BIDS opts=', opts);

        //read size of directory to determine whether or not to calculate checksums
        let total = await readSizeRecursive(indir) / 1024 / 1024 / 1024; //convert to gigabytes
        let calcHash = true;
        if (total > 2) { console.log('---- dicom2BIDS: study too large to parse checksums, skipping'); calcHash = false; }

        let matchniix = bis_genericio.joinFilenames(indir, '*(*.nii.gz|*.nii)');
        let matchsupp = bis_genericio.joinFilenames(indir, '!(*.nii.gz|*.nii)');
        let imageFiles = await bis_genericio.getMatchingFiles(matchniix);
        let supportingFiles = await bis_genericio.getMatchingFiles(matchsupp);


        //Parse date of the image out of a random dcm2nii image
        let date = parseDate(imageFiles[0]);

        if (imageFiles.length < 1) {
            return errorfn('No data to convert in ' + indir);
        }

        let outputdirectory = bis_genericio.joinFilenames(outdir, sourceDirectoryName);
        let subjectdirectory = bis_genericio.joinFilenames(outputdirectory, 'sub-01');

        //Create BIDS folders and filenames
        let dirnames = await makeBIDSDirectories(outputdirectory, subjectdirectory, errorfn);
        dirnames.outputdirectory = outputdirectory, dirnames.subjectdirectory = subjectdirectory;


        let fileArrayInfo = await generateMoveFilesArrays(imageFiles, supportingFiles, dirnames);
        let imageFilenames = fileArrayInfo.imageFilenames, supportingFilenames = fileArrayInfo.supportingFilenames, moveFilesPromiseArray = fileArrayInfo.moveFilesPromiseArray, changedFilenames = fileArrayInfo.changedFilenames;


        let jobFileSettings = { 'date': date, 'dcm2nii': dcm2nii, 'outputdirectory': outputdirectory };
        let dicomobj = makeDicomJobsFile(imageFilenames, supportingFilenames, jobFileSettings);

        await timeout(200);
        await Promise.all(moveFilesPromiseArray);
        await timeout(200);
        if (calcHash) {
            let checksums=await calculateChecksums(imageFilenames);
            for (let val of checksums) {
                for (let fileEntry of dicomobj.files) {
                    if (val.output.filename.includes(fileEntry.name)) {
                        fileEntry.hash = val.output.hash;
                        if (DEBUG) console.log('++++ BIDSOutput: Filename=', fileEntry.name, val.output.hash);
                        break;
                    }
                }
            }
        }

        await writeDicomMetadataFiles(dicomobj, outputdirectory, changedFilenames);

        labelsMap = {};
        return outputdirectory;
    } catch (e) {
        console.log('An error occured during BIDS conversion', e);
        labelsMap = {};
    }

};


/**
 * Calculates checksums for each of the NIFTI files in the BIDS directory.
 * 
 * @param {Array} inputFiles - Names of NIFTI files 
 * @returns Promise that will resolve once images have been checksummed.
 */
let calculateChecksums = (inputFiles) => {

    return new Promise((resolve, reject) => {

        console.log('++++ BIDSUTIL: calculating checksums');
        let promises = [];
        for (let filename of inputFiles) {
            promises.push(bis_genericio.makeFileChecksum(filename));
        }

        Promise.all(promises)
            .then((values) => { console.log('++++ BIDSUtil: done calculating checksums'); resolve(values); })
            .catch((e) => {
                console.log('--------------- calc Checksums error');
                reject(e);
            });
    });

};

/**
 * Makes a directory.
 * 
 * @param {String} filename - Name of the directory to create.
 * @param {Function} errorfn - Function to call on error.
 * @returns True if successful, false otherwise.
 */
let makeDir = async function (filename, errorfn) {
    try {
        console.log('++++ BIDSUTIL: making directory', filename);
        await bis_genericio.makeDirectory(filename);
    } catch (e) {
        if (e.code !== 'EEXIST') {
            errorfn('Error' + e);
            return false;
        } else {
            console.log('Directory Exists Ignoring');
        }
    }
    return true;
};

/**
 * Recursively reads the size of a directory (by reading the size of all its contents).
 * 
 * @param {String} item - The name of the root directory when invoking 
 */
let readSizeRecursive = (filepath) => {
    return new Promise( (resolve, reject) => {
        fs.lstat(filepath, (err, stats) => {
            if (err) { console.log('err', err); reject(err); return; }
            if (stats.isDirectory()) {
                let total = stats.size;

                fs.readdir(filepath, (err, children) => {
                    if (err) { reject(err); }

                    let reads = [];
                    for (let child of children) {
                        reads.push(readSizeRecursive([filepath, child].join('/')));
                    }

                    Promise.all(reads).then( (values) => {

                        for (let value of values) { total = total + value; }
                        resolve(total);
                    });
                });
    
                
            } else {
                resolve(stats.size);
            }
        });
    }).catch( (err) => {
        console.log('Promise array failed Read size recursive encountered an error', err); 
    });
};

let getBIDSDirname =  (filename, flist, dirs) => {
    let name = filename.toLowerCase(), dirname = 'anat';

    if (name.includes('bold') || name.includes('asl') || name.includes('rest') || name.includes('task')) {
        dirname = dirs.funcdir;
    } else if (name.includes('localizer') || name.includes('loc')) {
        dirname = dirs.locdir;
    } else if (name.includes('.bval') || name.includes('.bvec')) {
        // DTI helper files
        dirname = dirs.diffdir;
    } else if (name.includes('dti') || name.includes('dwi') || name.includes('diff')) {
        dirname = dirs.diffdir;
    } else if (name.includes('.nii.gz')) {
        let f2 = name.substr(0, name.length - 7);
        let f3 = f2 + '.bval';
        if (flist.includes(f3))
            dirname = dirs.diffdir;
    }

    return dirname;
};


/**
 * Parses name into a set of BIDS compliant name components. Currently only supports images acquired by MRI.
 * 
 * @param {String} name - Name of the file.
 * @param {String} directory - Name of the directory the file will be contained in, one of 'anat', 'func', 'diff', or 'localizer'   
 */
let parseBIDSLabel = (name, directory) => {
    let bidsLabel;
    name = name.toLowerCase();

    //some files should not be propagated, so simply indicate to discard them
    if (name.includes('phoenix') && name.includes('document')) {
        return 'DISCARD';
    }

    if (directory === 'anatomical' || directory === 'anat') {
        if ( (name.includes('t1') && name.includes('weight') ) || name.includes('mprage') || name.includes('t1w')) { bidsLabel = 'T1w'; }
        else if (name.includes('t2') && name.includes('weight')) { bidsLabel = 'T2w'; }
        else if (name.includes('t1') && name.includes('rho')) { bidsLabel = 'T1rho'; }
        else if (name.includes('t1') && name.includes('map')) { bidsLabel = 'T1map'; } 
        else if (name.includes('t1') && name.includes('plane')) { bidsLabel = 'inplaneT1'; }
        else if (name.includes('t2') && name.includes('map')) { bidsLabel = 'T2map'; }  
        else if (name.includes('t2') && name.includes('plane')) { bidsLabel = 'inplaneT2'; }
        else if (name.includes('star')) { bidsLabel = 'T2star'; }  
        else if (name.includes('flair')) { bidsLabel = 'FLAIR'; }
        else if (name.includes('flash')) { bidsLabel = 'FLASH'; }  
        else if (name.includes('pd') && name.includes('map')) { bidsLabel = 'PDmap'; }
        else if (name.includes('pd') && name.includes('t2')) { bidsLabel = 'PDT2'; } 
        else if (name.includes('pd')) { bidsLabel = 'PD'; }
        else if (name.includes('angio')) { bidsLabel = 'angio'; }
        else { bidsLabel = 'unknown'; }   
    }

    if (directory === 'functional' || directory === 'func') {
        //parse contrast label
        if (name.includes('bold')) { bidsLabel = 'bold'; }
        else if (name.includes('cbv')) {  bidsLabel = 'cbv'; }
        else if (name.includes('phase')) { bidsLabel = 'phase'; }
        else { bidsLabel = 'unknown'; }
    }

    if (directory === 'localizer') {
        //trim number at the end of the localizer to use as the label
        let splitName = name.split('-');
        bidsLabel = splitName[splitName.length - 1];

        //split off the file extension too
        let trimmedLabel = bidsLabel.split('.');
        bidsLabel = trimmedLabel[0];
    }

    if (directory === 'dwi' || directory === 'diff') {
        bidsLabel = 'dwi';
    }

    return bidsLabel;
};

/**
 * Creates the set of directories needed for a BIDS compliant study, i.e. root folder, subject folder, and 'anat', 'func', 'localizer', and 'dwi' folders. 
 * 
 * @param {String} outputdirectory - Name of the base directory for the study.
 * @param {String} subjectdirectory - Name of the subject directory for the study.
 * @returns Object containing the paths of all the imaging type directories (e.g. path for anat, func, etc.)
 */
let makeBIDSDirectories = async (outputdirectory, subjectdirectory, errorfn) => {
    try {
        await makeDir(outputdirectory, errorfn);
        await makeDir(subjectdirectory, errorfn);
        console.log(colors.green('....\n.... BIDSUTIL:: Created output directory : '+outputdirectory));
    } catch (e) {
        return errorfn('Failed to make directory ' + e);
    }


    let funcdir = bis_genericio.joinFilenames(subjectdirectory, 'func');
    let anatdir = bis_genericio.joinFilenames(subjectdirectory, 'anat');
    let locdir = bis_genericio.joinFilenames(subjectdirectory, 'localizer');
    let diffdir = bis_genericio.joinFilenames(subjectdirectory, 'dwi');

    try {
        await makeDir(funcdir, errorfn);
        await makeDir(anatdir, errorfn);
        await makeDir(diffdir, errorfn);
        await makeDir(locdir, errorfn);
    } catch (e) {
        return errorfn('failed to make directory' + e);
    }

    return { 'funcdir' : funcdir, 'anatdir' : anatdir, 'locdir' : locdir, 'diffdir' : diffdir };
};


/**
 * Parses the list of files generated by DMC2NIIx, formats them to be BIDS compliant, and generates an array of promises corresponding to disk operations that will perform the relevant moves.
 * Also generates a list of the new filenames for the image and supporting files and a flat list of the changed names (i.e. the name produced by dcm2niix -> BIDS compliant name)
 * 
 * @param {Array} imagefiles - List of image files generated by dcm2niix (in a temporary directory).
 * @param {Array} supportingfiles - List of non-image files generated by dcm2niix (in a temporary directory).
 * @param {Object} dirs - The names of the BIDS directories.
 * @returns Object containing the full list of Promises that will move the relevant files on disk, flat list of changed names, and lists of the new names for image and supporting files, respectively. 
 */
let generateMoveFilesArrays = (imagefiles, supportingfiles, dirs) => {
    
    //TODO: Fix file system operations being handed incomplete filenames, e.g. 'anat/filename' instead of '/home/zach/output_directory/sourcedata/sub-01/anat/filename'
    //Array of bis_genericio.copyFile promises, changed names to be written to a utility file on disk later, and flat list of parsed filenames respectively
    let moveFilePromises = [], changedNames = [], imageFilenames = [], supportingFilenames = [];

    //Generate BIDS names for the files generated by DCM2NIIx
    for (let i = 0; i < imagefiles.length; i++) {

        let name = imagefiles[i];
        let dirname = getBIDSDirname(name, imagefiles, dirs);
        dirname = bis_genericio.joinFilenames(dirs.subjectdirectory, dirname);

        let basename = bis_genericio.getBaseName(name);
        let dirbasename = bis_genericio.getBaseName(dirname);

        let splitName = basename.split('.')[0];

        let filteredsuppfiles = supportingfiles.filter( (file) => {
            return file.toLowerCase().includes(splitName.toLowerCase());
        });

        for (let suppfile of filteredsuppfiles) {
            let suppBasename = bis_genericio.getBaseName(suppfile);
            let formattedSuppfile = makeBIDSFilename(suppBasename, dirbasename, dirs.subjectdirectory);
            let suppTarget = bis_genericio.joinFilenames(dirname, formattedSuppfile);

            if (!formattedSuppfile.includes('DISCARD')) {
                supportingFilenames.push(suppTarget);
                changedNames.push(bis_genericio.getBaseName(suppfile) + ' -> ' + bis_genericio.getBaseName(suppTarget));
                moveFilePromises.push(bis_genericio.copyFile(suppfile + '&&' + suppTarget));
            }

        }

        let formattedBasename = makeBIDSFilename(basename, dirbasename, dirs.subjectdirectory);
        let target = bis_genericio.joinFilenames(dirname, formattedBasename);

        if (!formattedBasename.includes('DISCARD')) {
            changedNames.push(bis_genericio.getBaseName(name) + ' -> ' + bis_genericio.getBaseName(target));
            moveFilePromises.push(bis_genericio.copyFile(name + '&&' + target));
            imageFilenames.push(target);
        } 

    }


    //    console.log('move file promises', moveFilePromises, 'image filenames', imageFilenames, 'supporting filenames', supportingFilenames);
    return { 'moveFilesPromiseArray' : moveFilePromises, 'changedFilenames' : changedNames, 'imageFilenames' : imageFilenames, 'supportingFilenames' : supportingFilenames };


    //Local functions to parse BIDS filenames

    function makeBIDSFilename(filename, directory, subjectdirectory) {
        let splitsubdirectory = subjectdirectory.split('/');
        let fileExtension = filename.split('.');
        if (fileExtension.length > 2 && fileExtension[fileExtension.length - 2] === 'nii' && fileExtension[fileExtension.length - 1] === 'gz') {
            fileExtension = '.nii.gz';
        } else {
            fileExtension = '.' + fileExtension[fileExtension.length - 1];
        }

        //BIDS uses underscores as separator characters to show hierarchy in filenames, so change underscores to hyphens to avoid ambiguity
        filename = filename.split('_').join('-');

        let bidsLabel = parseBIDSLabel(filename, directory), namesArray;
        let runNumber = getRunNumber(bidsLabel, fileExtension);

        //may change in the future, though currently looks a bit more specific than needed
        if (directory === 'anat') {
            namesArray = [ splitsubdirectory[splitsubdirectory.length - 1], runNumber, bidsLabel];
        } else if (directory === 'func') {
            namesArray = [ splitsubdirectory[splitsubdirectory.length - 1], 'task-unnamed', runNumber, bidsLabel];
        } else if (directory === 'localizer') {
            namesArray = [ splitsubdirectory[splitsubdirectory.length - 1], runNumber, bidsLabel];
        } else if (directory === 'dwi') {
            namesArray = [ splitsubdirectory[splitsubdirectory.length - 1], runNumber, bidsLabel];
        }

        if (DEBUG)
            console.log(colors.green('++++ BIDS filename', namesArray.join('_')));
        let joinedName = namesArray.join('_');
        return joinedName.concat(fileExtension);
    }


    //Returns the number of runs with the same name name component for a directory type and updates the count in labelsMap (global map of keys seen so far)
    function getRunNumber(bidsLabel, fileExtension) {
        let runNum;
        
        if (labelsMap[bidsLabel]) {
            if (fileExtension.includes('nii')) {
                //supporting files are moved before the image file in the code above
                //so once we find the image we can safely increment the label in labelsMap
                runNum = labelsMap[bidsLabel];
                labelsMap[bidsLabel] = labelsMap[bidsLabel] + 1;
            } else {
                runNum = labelsMap[bidsLabel];
            }
        } else {
            labelsMap[bidsLabel] = 1;
            runNum = 1;
        }

        if (runNum < 10) { runNum = '0' + runNum; }
        return 'run-' + runNum; 
    }
};

/**
 * Creates a JSON object containing metadata relevant to the study, including the date of the study's creation, the platform it was invoked from and the full structure of the study.
 * This file will be written to disk at the same time as the other study metadate files. 
 * 
 * @param {Array} imageFilenames - List of the study's images in BIDS format.
 * @param {Array} supportingFilenames - List of the study's supporting files in BIDS format.
 * @param {Object} settings - Various parameters relevant to the job file, including the date the images were created and the context in which this function ran (e.g. directly from dcm2nii or from a separate process invoking BIDS conversion).
 * @returns The full JSON for the DICOM job file. 
 */
let makeDicomJobsFile = (imageFilenames, supportingFilenames, settings) => {

    let date = settings.date, dcm2nii = settings.dcm2nii, outputdirectory = settings.outputdirectory;

    //separate date string into individual chunks
    let year = date.substring(0, 4), month = date.substring(4, 6), day = date.substring(6, 8), hour = date.substring(8, 10), minute = date.substring(10, 12);

    let dicomobj = {
        "source": dcm2nii ? 'dcm2nii' : 'BIDS import',
        'platform' : baseutil.getSystemInfo(biswrap),
        'location' : baseutil.getExecutableArguments('bids_utils'),
        "bidsversion": "1.1.0",
        "description": `Dataset generated on ${month}/${day}, ${year} at ${hour}:${minute}`,
        "files": [],
    };

    for (let i = 0; i < imageFilenames.length; i++) {
        let fname = imageFilenames[i];
        let name = bis_genericio.getBaseName(fname);
        let infoname = '';
        if (name.includes(".nii.gz")) {

            //find supporting files from file list 
            let basename = name.split('.')[0], suppfileArray = [];
            for (let file of supportingFilenames) {
                if (file.includes(basename)) {
                    suppfileArray.push(file.substr(outputdirectory.length + 1, file.length));
                }
            }

            dicomobj.files.push({
                name: name,
                filename: fname.substr(outputdirectory.length + 1, fname.length),
                hash: 'no checksums',
                supportingfiles: suppfileArray,
                details: infoname
            });
        }
    }

    return dicomobj;
};

/**
 * Parses date and time from a dcm2niix image that has been converted with '%t' specified (i.e. with session date and time appended).
 * 
 * @param {String} dcm2niiImage - Name of an image generated by dcm2nii. 
 * @returns The 14 character date and time string.
 */
let parseDate = (dcm2niiImage) => {
    //date will be a 14 character string in the middle of a filename
    let dateRegex = /\d{14}/g;
    let fileString = dcm2niiImage;
    let dateMatch = dateRegex.exec(fileString);
    return dateMatch[0];
};

let writeDicomMetadataFiles = async (dicomJobs, outputdirectory, changedFilenames) => {
    let bidsignore = '**/localizer\n**/dicom_job_info.json\n**/name_change_log.txt';
    let currentDate = new Date();
    currentDate = new Date().toLocaleDateString() + ' at ' + currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds();
    let datasetDescription = {
        'Name': 'DICOM dataset converted on ' + currentDate,
        'BIDSVersion': "1.2.0",
        "License": "",
        "Authors": [],
        "Funding": []
    };

    //write record of name changes to disk
    let namechangefilename = bis_genericio.joinFilenames(outputdirectory, 'name_change_log.txt');
    let bidsignorefilename = bis_genericio.joinFilenames(outputdirectory, '.bidsignore');
    let dicomjobfilename = bis_genericio.joinFilenames(outputdirectory, dicomParametersFilename);
    let datasetdescriptionfilename = bis_genericio.joinFilenames(outputdirectory, 'dataset_description.json');

    await bis_genericio.write(namechangefilename, changedFilenames.join('\n'), false);
    await bis_genericio.write(bidsignorefilename, bidsignore, false);
    await bis_genericio.write(dicomjobfilename, JSON.stringify(dicomJobs, null, 2), false);
    await bis_genericio.write(datasetdescriptionfilename, JSON.stringify(datasetDescription, null, 2), false);
    console.log('++++ BIDSUTIL: output directory', outputdirectory);

    return;
};

/**
 * Makes supporting files match the format of their parent image files which have been changed by another operation.
 * Call this function after image files have been altered in some way, e.g. by a user changing where files are in the file tree. 
 * 
 * @param {Array} changedFiles - Names of files that have already been moved. Each entry is an object with a field 'old' that has the old name of the image and 'new' with the changed name. These should be the full paths for the files. 
 * @param {String} taskName - Name of the new task entered by the user.
 * @param {String} baseDirectory - Name of the base directory of the study. 
 */
let syncSupportingFiles = (changedFiles, taskName, baseDirectory) => {

    return new Promise((resolve, reject) => {
        //dicom params file is in source so trim base directory to there
        let splitFilename = baseDirectory.split('/');
        for (let i = 0; i < splitFilename.length; i++) {
            if (splitFilename[i] === sourceDirectoryName) {
                baseDirectory = splitFilename.slice(0, i + 1).join('/');
                i = splitFilename.length;
            }
        }

        let settingsFilename = baseDirectory + '/' + dicomParametersFilename;

        //open dicom settings file 
        getSettingsFile(settingsFilename).then((settings) => {
            let compiledSupportingFileList = [], movePromiseArray = [];

            for (let file of changedFiles) {

                let oldFilename = bis_genericio.getBaseName(file.old);
                oldFilename = oldFilename.split('.')[0];

                for (let i = 0; i < settings.files.length; i++) {

                    let settingsFilename = settings.files[i].name;
                    if (settingsFilename.includes(oldFilename)) {
                        let supportingFiles = settings.files[i].supportingfiles;

                        //new supporting file list for writeback
                        let newSupportingFileList = [];
                        for (let supportingFile of supportingFiles) {

                            let newFilename = replaceTaskName(supportingFile, taskName);
                            let newFilepath = file.new.split('/');
                            newFilepath = newFilepath.slice(0, newFilepath.length - 1);
                            newFilepath.push(newFilename);
                            newFilepath = newFilepath.join('/');

                            //file.old will hold the old location of the image, so trim off the file extension and add the extension of the supporting file to get its location
                            let splitOldPath = file.old.split('/');
                            splitOldPath[splitOldPath.length - 1] = bis_genericio.getBaseName(supportingFile);
                            let oldFilepath = splitOldPath.join('/');

                            console.log('old location', oldFilepath, 'new location', newFilepath);

                            movePromiseArray.push(bis_genericio.moveDirectory(oldFilepath + '&&' + newFilepath));
                            newSupportingFileList.push(newFilepath);
                        }

                        //'name' should be the base filename without an extension, 'filename' and 'supportingfiles' should be the last three files in the path (the location within the bids directory)
                        let splitNewPath = file.new.split('/');
                        for (let i = 0; i < newSupportingFileList.length; i++) {
                            let splitSuppPath = newSupportingFileList[i].split('/');
                            newSupportingFileList[i] = splitSuppPath.slice(splitSuppPath.length - 3).join('/');
                        }

                        let filename = splitNewPath.slice(splitNewPath.length - 3).join('/');
                        let name = splitNewPath.slice(splitNewPath.length - 1);
                        name = name[0].split('.')[0];

                        let settingsEntry = settings.files[i];
                        settingsEntry.name = name;
                        settingsEntry.filename = filename;
                        settingsEntry.supportingfiles = newSupportingFileList;

                        compiledSupportingFileList = compiledSupportingFileList.concat(newSupportingFileList);
                    }
                }
            }

            let writeSettingsFileFn = writeSettingsFile(settingsFilename, settings);
            movePromiseArray.push(writeSettingsFileFn);

            Promise.all(movePromiseArray).then( () => {
                resolve(compiledSupportingFileList);
            });

        }).catch( (e) => { reject(e);});

    });


    function replaceTaskName(filename, taskname) {
        let basename = bis_genericio.getBaseName(filename);
        let splitbase = basename.split('_');

        //task name could be at index 1 or 2 according to BIDS specification
        //https://bids-specification.readthedocs.io/en/stable/04-modality-specific-files/01-magnetic-resonance-imaging-data.html
        if (splitbase[1].includes('task')) { splitbase[1] = 'task-' + taskname; }
        else if (splitbase[2].includes('task')) { splitbase[2] = 'task-' + taskname; }

        return splitbase.join('_');
    }
};

/**
 * Writes dicom settings file to disk. 
 * 
 * @param {String} filename - Name of the settings file to save.
 * @param {Object} settings - New settings file to write over transientDicomJobInfo.
 */
let writeSettingsFile = (filename, settings) => {
    return new Promise( (resolve, reject) => {
        if (typeof settings !== 'string') { 
            settings = JSON.stringify(settings, null, 2);
        }
    
        bis_genericio.write(filename, settings, false)
            .then( () => { resolve(); })
            .catch( () => { reject(); });
    });
};

/**
 * Reads settings file from disk and returns the contents.
 */
let getSettingsFile = (filename) => {
    return new Promise( (resolve, reject) => {
        bis_genericio.read(filename).then( (obj) => {
            try {
                console.log('obj', obj);
                let fileInfo = JSON.parse(obj.data);
                resolve(fileInfo);
            } catch (e) {
                reject(e);
            }
        });
    });
};

module.exports = {
    dicom2BIDS: dicom2BIDS,
    syncSupportingFiles : syncSupportingFiles,
    getSettingsFile : getSettingsFile,
    dicomParametersFilename : dicomParametersFilename
};
