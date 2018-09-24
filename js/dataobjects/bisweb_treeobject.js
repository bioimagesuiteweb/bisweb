class BiswebTreeObject {
    
    constructor(files = null) {
        if (files) {
            this.parseFiles(files);
        } else {
            this.fileTree = null;
        }
    }

    parseFiles(files) {
        
    }
}

module.exports = BiswebTreeObject;