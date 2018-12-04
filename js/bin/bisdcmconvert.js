require('../../config/bisweb_pathconfig.js');
const exec = require('child_process').exec;
const program = require('commander');
const process = require('process');


program
    .option('-i, --in <n>', 'The folder to invoke dcm2nii on. Required.')
    .option('-o, --out <n>', 'The name of the folder to output converted files into. Optional, this will generate a default directory if not specified.')
    .option('-4, --four-dimensional <b>','Whether or not to create 4D volumes from the DICOM files. Will otherwise it will save as many 3D volumes, true by default')
    .option('-a, --anonymize <b>', 'Whether or not to anonymize the DICOM images. True by default.')
    .option('-b, --settings <n>', 'Load settings from a specified initialization file. Optional.')
    .option('-c, --collapse <b>', 'Collapse input folders. Optional, true by default.')
    .option('-d, --date <b>', 'Put the date in the filename. Optional, true by default.')
    .option('-e, --events <b>', 'Put events (series, acquisitions) in the filename, e.g. filename.dcm -> s002a003.nii. Optional, true by default')
    .option('-f, --source-filenames', 'Source the filenames. Optional, false by default.')
    .option('-g, --gzip <b>', 'Compress output. Optional, true by default')
    .option('--id <b>', 'Put id in the filename, e.g. filename.dcm -> johndoe.nii. Optional, false by default')
    .option('-m, --manual <b>', 'Manually prompt the user to specify an output format. Optional, true by default')
    .option('-n, --nii <b>', 'Output nii file. Optional, true by default, if false will create .hdr/.img pair')
    .option('-r, --reorient-orthagonal <b>', 'Reorient image to the nearest orthagonal. Optional.')
    .option('-s, --spm2-analyze <b>', 'Do SPM2/Analyze rather than SPM5/NIfTI. Optional, false by default.')
    .option('-t, --text <b>', 'Make a text report, (patient and scan details). Optional, false by default.')
    .option('-v, --convert <b>', 'Convert every image in the specified in directory. Optional, true by default')
    .option('-x, --reorient-crop <b>', 'Reorient and crop the 3D NIfTI images. Optional, false by default')
    .parse(process.argv);
    
/*let parseOptions = () => {
    let optionString = '';
    console.log('program.fourDimensional')
    switch (program) {
        case program.fourDimensional : optionString.concat('-4 1')
        case 
    }
};*/

let runDCM2NII = (inFolder, outFolder) => {
    console.log('parse options', parseOptions());
    exec(`dcm2nii -o ${outFolder} ${inFolder}`, (err, stdout, stderr) => {
        if (err) { console.log('An error occurred during conversion', err); return; }

        console.log('stdout', stdout, 'stderr', stderr);
    });
};

    
exec('which dcm2nii', (err, stdout, stderr) => {
    if (err) {
        console.log('The program dcm2nii could not be found in your path, please ensure that you have installed this program and try again.');
        console.log('Error message', err);
    } else if (stderr) {
        console.log('An error occured when trying to locate dcm2nii on your machine', stderr);
    } else if (stdout) {
        if (!program.in) { console.log('Error, no in directory specified, cannot do conversion'); return; }
        console.log('Found dcm2nii on your machine, commencing conversion...');

        const inFolder = program.in;
        const outFolder = program.out;

        if (!outFolder) {
            const dateString = Date.getMonth() + 1 + '-' + Date.getDate() + '-' + Date.getFullYear();
            const defaultOutFolder = process.cwd() + '/dcm2nii_' + dateString;
            console.log('default out folder', defaultOutFolder);
            exec(`mkdir ${defaultOutFolder}`, (err) => {
                if (err) { console.log('An error occured while making the default folder', err); return; }
                runDCM2NII(inFolder, defaultOutFolder);
            });
        } else {
            const outFolder = program.out;
            runDCM2NII(inFolder, outFolder);
        }

    }
});

