const bis_genericio = require('bis_genericio.js');
const util = require('bis_util');
const fs = bis_genericio.getfsmodule();
const path = bis_genericio.getpathmodule();
const os = bis_genericio.getosmodule();
// ......................... Filename Validation Code .............................................

let exportobj = { };

if (bis_genericio.getmode() === 'node' ||
    bis_genericio.getmode() === 'electron' ) {


    
    // In browser or webworker this will not run 
    
    const baseDirectoriesList = [ os.homedir(), os.tmpdir() ? os.tmpdir() : 'No temporary directory'];
    const indent = '.....';

    console.log('+++ using filesystemutils mode= ',bis_genericio.getmode(),baseDirectoriesList);
    /**
     * Takes a path specifying a file to load on the server machine and determines whether the path is clean, i.e. specifies a file that exists, does not contain symbolic links.
     * Recursively checks every file and directory on the path.
     * 
     * @param {String} filepath - Path to check.
     * @return {Boolean} true if OK, false if not OK,
     */
    let validateFilename = (filepath, debug = false) => {

        //some filepaths will be two filepaths conjoined by the symbol &&, check these separately
        if (filepath.indexOf('&&') >= 0) {
            const filepaths = filepath.split('&&');
            if (debug)
                console.log('filepaths', filepaths);
            return validateFilename(filepaths[0]) && validateFilename(filepaths[1]);
        }

        filepath = filepath || '';
        if (filepath.length < 1) {
            if (debug) console.log('short filepath');
            return false;
        }

        if (path.sep === '\\')
            filepath = filepath.toLowerCase();

        if (debug)
            console.log('filepath=', filepath, ' ', baseDirectoriesList);

        let i = 0, found = false;
        while (i < baseDirectoriesList.length && found === false) {
            if (path.sep === '\\') {
                if (filepath.indexOf(baseDirectoriesList[i].toLowerCase()) === 0) {
                    found = true;
                }
            } else if (filepath.indexOf(baseDirectoriesList[i]) === 0) {
                found = true;
            } else {
                i = i + 1;
            }
        }

        if (found === false) {
            return false;
        }

        let realname = filepath;
        if (path.sep === '\\')
            realname = util.filenameUnixToWindows(filepath);



        if (fs.existsSync(realname)) {
            let stats = fs.lstatSync(realname);
            if (stats.isSymbolicLink()) {
                return false;
            }
        } else {
            let dirname = path.dirname(realname);
            try {
                let stats = fs.lstatSync(dirname);
                if (stats.isSymbolicLink()) {
                    if (debug)
                        console.log('Sym Link ');
                    return false;
                }
            } catch (e) {
                console.log('Existence problem ', e);
                return false;
            }
        }

        return true;
    };

    /** Validate Directories
     * @params{Array} - array of directories
     * @params{String} - name of list for debugging
     * @returns{Array} - fixed array
     */
    let validateDirectories = (lst, name = "", verbose = true) => {

        let newlist = [];
        for (let i = 0; i < lst.length; i++) {

            let p = lst[i];
            if (path.sep === '\\')
                p = util.filenameUnixToWindows(p);

            p = path.normalize(p);
            let stats = null;
            try {

                stats = fs.lstatSync(p);
            } catch (e) {
                p = null;
            }



            if (stats) {

                if (stats.isSymbolicLink()) {
                    let q = fs.readlinkSync(p);
                    p = q;
                }

                if (!stats.isDirectory()) {
                    p = null;
                }

                if (p.lastIndexOf(path.sep) == (p.length - 1)) {
                    p = p.substr(0, p.length - 1);
                }
            } else {
                p = null;
            }

            if (p != null) {

                if (path.sep === '/') {
                    let ignore = false;
                    if (p !== '/tmp') {
                        let l = p.split('/');
                        if (l.length < 3)
                            ignore = true;
                    }
                    if (!ignore)
                        newlist.push(p);
                } else {
                    let l = p.split('\\');
                    if (l.length >= 3)
                        newlist.push(util.filenameWindowsToUnix(p));
                }
            }
        }
        if (verbose)
            console.log(indent, 'Validating ' + name + ' directory list=', lst.join(','), '-->\n' + indent + '\t ', newlist.join(','));
        return newlist;
    };


    exportobj = {
        validateFilename: validateFilename,
        validateDirectories: validateDirectories,
        tempdir: os.tmpdir()
    };
}

    

module.exports=exportobj;
