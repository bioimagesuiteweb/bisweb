
const util = require('bis_util');

const serverEventList = { };
const binaryDataList = { };
let serverEventId=1;

const verbose=false;


var printEvent=function(id) {
    if (serverEventList[id])
        return JSON.stringify(serverEventList[id]);
    return `[No event ${id} ]`;
};

var addServerEvent=function(resolve,reject,name="") {

    serverEventId=serverEventId+1;
    serverEventList[serverEventId]={
        'resolve' : resolve,
        'reject'  : reject,
        'id'      : serverEventId,
        'checksum': 0,
        'name'    : name,
    };

    if (verbose)
        console.log('Create server event',printEvent(serverEventId));
    
    return serverEventList[serverEventId];
};

var removeServerEvent=function(id) {
    if (serverEventList)
        delete serverEventList[id];
};



var resolveServerEvent=function(id,obj={}) {

    let s=serverEventList[id];
    if (s) {
        if (obj.checksum) {
            if ( binaryDataList[obj.checksum]) {
                if (verbose)
                    console.log('Resolving checksum server event',printEvent(id),obj.checksum);
                resolveServerEvent(id,binaryDataList[obj.checksum]);
                delete binaryDataList[obj.checksum];
                removeServerEvent(id);
            } else {
                if (verbose)
                    console.log('Registering checksum in server event',printEvent(id),obj.checksum);
                serverEventList[id].checksum=obj.checksum;
            }
        } else {
            if (verbose)
                console.log('Resolving server event',printEvent(id));
            s.resolve(obj);
            removeServerEvent(id);
        }
    }
};

var rejectServerEvent=function(id,e="") {

    let s=serverEventList[id];
    if (s) {
        if (verbose)
            console.log('Rejecting server event',printEvent(id));
        s.reject(e);
        removeServerEvent(id);
    }
    
};


// Binary Data Stuff

var addBinaryDataList = function(checksum,data) {

    let i=0,found=false;
    let keys=Object.keys(serverEventList);
    
    while (i<keys.length && found===false) {
        let id=keys[i];
        if (checksum===serverEventList[id].checksum) {
            found=true;
            resolveServerEvent(id,data);
            return;
        } else {
            i=i+1;
        }
    }
    binaryDataList[checksum]=data;
    if (verbose)
        console.log('Adding binaryData Event',checksum);
};

var resolveBinaryData = function(id,data) {

    let checksum=util.SHA256(data);
    
    if ( binaryDataList[checksum]) {
        resolveServerEvent(id,binaryDataList[checksum]);
        delete binaryDataList[checksum];
    } else {
        addBinaryDataList(checksum,data);
    }
};


module.exports = {
    addServerEvent :addServerEvent,
    printEvent : printEvent,
    rejectServerEvent : rejectServerEvent,
    resolveBinaryData: resolveBinaryData,
    resolveServerEvent : resolveServerEvent,
};
    
