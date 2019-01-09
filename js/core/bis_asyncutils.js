'use strict';

const util = require('bis_util');

const serverEventList = {};
const binaryDataList = {};
let serverEventId = 1;
let verbose = false;


var printEvent = function (id) {
    if (serverEventList[id])
        return JSON.stringify({
            id : id,
            name : serverEventList[id].name,
            checksum :serverEventList[id].checksum
        });
    return `[No event ${id} ]`;
};

var addServerEvent = function (resolve, reject, name = "") {

    serverEventId = serverEventId + 1;
    serverEventList[serverEventId] = {
        'resolve': resolve,
        'reject': reject,
        'id': serverEventId,
        'checksum': 0,
        'name'    : name,
        'timeout' : null,
    };

    if (verbose)
        console.log('__async__Create server event', printEvent(serverEventId));

    return serverEventList[serverEventId];
};

var removeServerEvent=function(id) {
    if (!serverEventList) 
        return;
        
    if (serverEventList[id].timeout) {
        clearTimeout(serverEventList[id].timeout);
        if (verbose)
            console.log("Removing timeout event",serverEventList[id].id,' done');
    }
    delete serverEventList[id];
};



var resolveServerEvent = function (id, obj = {}) {

    let s = serverEventList[id];
    if (s) {
        if (obj.checksum) {
            if (binaryDataList[obj.checksum]) {
                if (verbose)
                    console.log('__async__Resolving checksum server event', printEvent(id), obj.checksum);
                resolveServerEvent(id, binaryDataList[obj.checksum]);
                delete binaryDataList[obj.checksum];
                removeServerEvent(id);
            } else {
                if (verbose)
                    console.log('__async__Registering checksum in server event', printEvent(id), obj.checksum);
                serverEventList[id].checksum = obj.checksum;
            }
        } else {
            if (verbose)
                console.log('__async__Resolving server event', printEvent(id));
            s.resolve(obj);
            removeServerEvent(id);
        }
    }
};

var rejectServerEvent = function (id, e = "") {

    let s = serverEventList[id];
    if (s) {
        if (verbose)
            console.log('__async__Rejecting server event', printEvent(id));
        s.reject(e);
        removeServerEvent(id);
    }

};

var addEventTimeout=function(id,timeout=10000) {

    let s=serverEventList[id];
    if (!s) {
        return 0;
    }

    serverEventList[id].timeout=setTimeout( () => {
        serverEventList[id].timeout=null;
        //        if (verbose)
        console.log('____ Processing timeout',id);
        rejectServerEvent(id,'timeout');
    },timeout);


};


// Binary Data Stuff

var addBinaryDataList = function (checksum, data) {

    let i = 0, found = false;
    let keys = Object.keys(serverEventList);

    while (i < keys.length && found === false) {
        let id = keys[i];
        if (checksum === serverEventList[id].checksum) {
            found = true;
            if (verbose)
                console.log('__async__\t Not adding binary data as check sum is here', checksum, id);
            resolveServerEvent(id, data);
            return;
        } else {
            i = i + 1;
        }
    }
    binaryDataList[checksum] = data;

    if (verbose)
        console.log('__async__\t Adding binaryData Event', checksum);
};

var resolveBinaryData = function (data) {

    let checksum = util.SHA256(data);

    if (verbose)
        console.log('__async__\t Checking Binary Data', checksum);
    addBinaryDataList(checksum, data);
};


module.exports = {
    addServerEvent: addServerEvent,
    printEvent: printEvent,
    rejectServerEvent: rejectServerEvent,
    resolveBinaryData: resolveBinaryData,
    resolveServerEvent : resolveServerEvent,
    setVerbose : (f) => {   verbose = f || false; },
    addEventTimeout : addEventTimeout,
};

