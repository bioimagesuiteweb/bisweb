"use strict";

console.log('++++++++++++++++++++++++++++++++++++++++++++++++');

global.bioimagesuiteweblib=false;
let bisweb=require('./bioimagesuiteweblib');

let toolname='bisserver';
bisweb.loadUserPreferences().then( () => {
    console.log('++++++++++++++++++++++++++++++++++++++++++++++++');
    console.log('++++ Executing module '+toolname);
    console.log('++++++++++++++++++++++++++++++++++++++++++++++++');
    bisweb.loadParse(process.argv, toolname).then( () => {
        console.log('++++++++++++++++++++++++++++++++++++++++++++++++');
        process.exit(0);
    }).catch((e) => { 
        console.log(e); 
        process.exit(1);
    });
}).catch( (e) => {
    console.log(e); 
    process.exit(1);
});


