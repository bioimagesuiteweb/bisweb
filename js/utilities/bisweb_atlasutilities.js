

const ATLAS = {};
ATLAS['humanmni']=require('atlases/humanmni.json');
ATLAS['allenmri']=require('atlases/mouseallenmri.json');

const ATLASLIST= require('atlases/atlaslist.json');

const MAP = {
    'mouse' : 'allenmri',
    'human' : 'humanmni',
};

const PARAMETERS = {
    CurrentAtlasName : 'humanmni',
    CurrentSpeciesName : 'human'
};



// ---------------------------------------------------------------
//  Code to get and set current atlas stuff
// ---------------------------------------------------------------

var setCurrentAtlasName=function(spname='humanmni')  {

    spname= spname || 'humanmni';
    
    let keys=Object.keys(ATLASLIST);
    if (keys.indexOf(spname)>=0) {
        PARAMETERS.CurrentAtlasName=spname;
        PARAMETERS.CurentSpeciesName=ATLAS[spname]['species'];
    }
};

var getCurrentAtlasName=function()  {
    return PARAMETERS.CurrentAtlasName;
};


var setCurrentSpeciesName=function(spname='human')  {

    spname= spname || 'human';
    
    let keys=Object.keys(MAP);
    if (keys.indexOf(spname)>=0) {
        PARAMETERS.CurrentSpeciesName=spname;
        PARAMETERS.CurrentAtlasName=MAP[PARAMETERS.CurrentSpeciesName];
    }
};

var getCurrentSpeciesName=function()  {
    return PARAMETERS.CurrentSpeciesName;
};

var getCurrentAtlasHeader=function() {
    return ATLASLIST[PARAMETERS.CurrentAtlasName];
};

var getCurrentAtlas=function() {
    return ATLAS[PARAMETERS.CurrentAtlasName];
};
    

// ---------------------------------------------------------------
// Fix gaps in WSHU network indices -- from bisweb_connectivityvis
var fixConnectivityNetworkIndex=function(n,attributeIndex=0) {

    if (PARAMETERS.CurrentAtlasName!=='humanmni')
        return n;
    
    
    // XP: Human Stuff 
    // Yale networks are OK
    if (attributeIndex===4)
        return n;
    
    if (n<=1)
        return n;
    if (n<=5)
        return n-1;
    return n-2;
};


// ---------------------------------------------------------------
// Atlas Stuff for bisweb_connecitivtycontrolelement

var populateAtlasParameters=function(guiParameters={}) {


    guiParameters.Lobes =  ATLAS['humanmni'].labels.data[0].labels;
    guiParameters.Lobes2 = ATLAS['allenmri'].labels.data[1].labels;
    guiParameters.Lobes3 = ATLAS['allenmri'].labels.data[2].labels;

    guiParameters.BrodLabels = ATLAS['humanmni'].labels.data[3].labels;
    guiParameters.LobesValues = [];
    let keys=Object.keys(guiParameters.Lobes);
    for (let i=0;i<keys.length;i++) {
        guiParameters.LobesValues.push(guiParameters.Lobes[keys[i]]);
    }

    guiParameters.NetworksArray = [
        ATLAS['humanmni'].labels.data[2].labels,
        ATLAS['humanmni'].labels.data[4].labels
    ];


    guiParameters.NetworksArrayShort = [
        ATLAS['humanmni'].labels.data[2].shortlabels,
        ATLAS['humanmni'].labels.data[4].shortlabels
    ];

};

// ---------------------------------------------------------------
var compareDimensions=function(imgdim,imgspa,atlasdim,atlasspa,factor=2.0) {
    
    let agrees=true;
    for (let i=0;i<=2;i++) {
        let sz=imgdim[i]*imgspa[i];
        let asz=atlasdim[i]*atlasspa[i];
        if (Math.abs(sz-asz)>factor*atlasspa[i])
            agrees=false;
    }
    return agrees;
};

// Return true if found, false if not
var findAndSetAtlas=function(image) {

    let keys=Object.keys(ATLASLIST);
    let found=false;

    let dim=image.getDimensions();
    let spa=image.getSpacing();
    let i=0;
    
    while (i<keys.length && found===false) {
        let atlasdim=ATLASLIST[keys[i]]['dimensions'];
        let atlasspa=ATLASLIST[keys[i]]['spacing'];
        
        if (this.compareDimensions(dim,spa,atlasdim,atlasspa)) {
            found=true;
        } else {
            i=i+1;
        }
    }

    if (!found) 
        return false;

    this.setCurrentAtlasName(keys[i]);
    console.log('+++ found atlas=',this.getCurrentAtlasName());
    return true;
};

var getNetworkCitation=function(index) {

    const ATLAS=this.getCurrentAtlas();
    const gdef=ATLAS['groupdefinitions'];
    let found=false,i=0;
    while (found===false && i < gdef.length) {
        let elem=gdef[i];
        if (elem.index === index) {
            found=true;
            let citation = elem.citation || null;
            if (citation) {
                return citation;
            }
        }
        i=i+1;
    }
    return null;
};

// ---------------------------------------------------------------

module.exports = {
    // set/get names
    setCurrentAtlasName : setCurrentAtlasName,
    setCurrentSpeciesName : setCurrentSpeciesName,
    getCurrentAtlasName : getCurrentAtlasName,
    getCurrentSpeciesName : getCurrentSpeciesName,
    // Get Pointers
    getCurrentAtlasHeader :    getCurrentAtlasHeader,
    getCurrentAtlas :    getCurrentAtlas,
    // Utility Code for 2D
    fixConnectivityNetworkIndex :     fixConnectivityNetworkIndex,
    // ConnectivityControlElement
    populateAtlasParameters : populateAtlasParameters,
    findAndSetAtlas :     findAndSetAtlas,
    compareDimensions :     compareDimensions,
    //
    getNetworkCitation :     getNetworkCitation
};
