'use strict';
/**
  * This is an abstract base class for a server client 
  * It is extended for both the BioImage Suite File Server Client
  *    and the AWS Client
*/

class BisBaseServerClient { 

    constructor() {
        this.authenticated = false;
        this.hasGUI=false;
        this.serverinfo='';
    }

    /** GUI Replacement for webutil.createAlert */
    alertEvent(name,error=false) {
        if (error)
            console.log('---- File Client Error:',name);
        else
            console.log('____ File Client:',name);
    }

    /** Pure Virtual to be replaced for GUI */
    retryAuthenticationDialog() { }
    showAuthenticationDialog() { }
    hideAuthenticationDialog() { }
    showFileDialog() {}

    /** returns the name of the server
     * @returns{String} -- the name 
     */
    getServerType() {
        return null;
    }

    getServerInfo() {
        return this.serverinfo;
    }

    // ------------------ Download file and helper routines -----------------------------------------------------------------
    /**
     * downloads a file from the server 
     * @param{String} url - the filename
     * @param{Boolean} isbinary - if true file is binary
     * @returns {Promise} -  a Promise with payload { obj.name obj.data } much like bis_genericio.read (from where it will be called indirectly)
     */
    downloadFile(url,isbinary) {
        return Promise.rejected('downloadFile not implemented '+url+' '+isbinary);
    }
    
    /** upload file 
     * @param {String} url -- abstact file handle object
     * @param {Data} data -- the data to save, either a sting or a Uint8Array
     * @param {Boolean} isbinary -- is data binary
     * @returns {Promise} 
     */
    uploadFile(url, data, isbinary=false) {
        return Promise.rejected('uploadFile not implemented '+url+' '+isbinary+' ' +typeof data);
    }

    /** get file size -- the size of a file
     * @param{String} url -- the filename
     * @returns {Promise} payload is the file size
     */
    getFileSize(url) {
        return this.fileSystemOperation('getFileSize',url);
    }

    /** get file stats -- fs.getStats 
     * @param{String} url -- the filename
     * @returns {Promise} stats object 
     */
    getFileStats(url) {
        return this.fileSystemOperation('getFileStats',url);
    }

    /** checks is filename is a directory
     * @param{String} url -- the filename
     * @returns {Promise} payload true or false
     */
    isDirectory(url) {
        return this.fileSystemOperation('isDirectory',url);
    }

    /** creates a directory
     * @param{String} url -- the directory name
     * @returns {Promise} payload true (created) or false (already existing)
     */
    makeDirectory(url) {
        return this.fileSystemOperation('makeDirectory',url);
    }

    /** deletes a directory
     * @param{String} url -- the directory name
     * @returns {Promise} payload true or false
     */
    deleteDirectory(url) {
        return this.fileSystemOperation('deleteDirectory',url);
    }

    /** moves a file from source to destination 
     * @param{String} src -- the source directory
     * @param{String} dest -- the destination directory
     * @returns {Promise} payload true or false
     */
    moveDirectory(url) {
        return this.fileSystemOperation('moveDirectory', url);
    }

    /** copies a file from source to destination
     *@param{String} src -- the source directory
     * @param{String} dest -- the destination directory
     * @returns {Promise} payload true or false
     */
    copyFile(url) {
        return this.fileSystemOperation('copyFile', url, 60000);
    }

    /** getMatching Files
     * @param{String} querystring -- the matching string
     * @returns {Promise} payload list of filenames that match
     */
    getMatchingFiles(querystring) {
        return this.fileSystemOperation('getMatchingFiles',querystring);
    }
}

module.exports = BisBaseServerClient;
