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

"use strict";

const keystore=require('bis_keystore');
const bis_dropbox = require('bisweb_dropboxmodule');
const bis_googledrive = require('bisweb_drivemodule');
const webutil = require('bis_webutil');
let imagepath="";
if (typeof window.BIS !=='undefined') {
    imagepath=window.BIS.imagepath;
}


module.exports = {

    createCloudLoadMenuItems : function(menu,name,callback,viewerno=0) {

        let dkey=keystore.DropboxAppKey || "";
        let gkey=keystore.GoogleDriveKey || "";


        
        let dropbox_clb=function(e) {
            e.preventDefault();
            bis_dropbox.init().then( () => {
                bis_dropbox.pickReadFile("").then( (obj) => {
                    console.log(obj);
                    callback(obj,viewerno);
                }).catch( (e) => { console.log(e); });
            }).catch( (e) => { console.log(e);
                               webutil.createAlert("Failed to intitialize Dropbox connection", true);
                             });
        };
        
        let google_clb = function(e) {
            e.preventDefault();
            bis_googledrive.create().then( () => {
                bis_googledrive.pickReadFile("").then(
                    (obj) => {
                        console.log(obj);
                        callback(obj[0],viewerno);
                    }
                ).catch((e) => { console.log('Error in Google drive', e); });
            }).catch( (e) => { console.log(e);
                               webutil.createAlert("Failed to intitialize google drive connection", true);
                             });
        };


        if (dkey.length>2)
            webutil.createMenuItem(menu, `Load ${name} from Dropbox`,dropbox_clb);
        if (gkey.length>2)
            webutil.createMenuItem(menu, `Load ${name} from Google Drive`,google_clb);

        if (dkey.length>2 || gkey.length>2)
            webutil.createMenuItem(menu, ''); 
        
    },

    createCloudSaveMenuItems : function(menu,name,viewer) {

        // -------------------------------
        // Xenios -- this needs work -----
        // -------------------------------
        let dropbox_clb=function(e) {
            e.preventDefault();
            bis_dropbox.init().then( () => {
                bis_dropbox.pickWriteFile("").then( (obj) => {
                    console.log('pickWriteFile then ', obj);
                    let img=viewer.getimage();
                    img.save(obj).then( (f) => {
                        webutil.createAlert('Saved '+f);
                    }).catch( (e) => {
                        webutil.createAlert('Failed to save'+e,true);
                    });
                }).catch( (e) => {webutil.createAlert('Upload canceled. To upload a file without replacing another, click the upload button in the top right of the chooser, otherwise select the file you\'d like to replace'+e, false); });
            }).catch( (e) => { console.log(e);
                               webutil.createAlert("Failed to intitialize Dropbox connection", true);
                             });
        };
        
        webutil.createMenuItem(menu, `Save ${name} to Dropbox`,dropbox_clb);

    },

    createMNIImageLoadMenuEntries : function(fmenu,callback,viewerno=0) {
        webutil.createMenuItem(fmenu,'Load MNI T1 (1mm)',
                               function() {
                                   callback(`${imagepath}images/MNI_T1_1mm_stripped_ras.nii.gz`,viewerno);
                               });
        webutil.createMenuItem(fmenu,'Load MNI T1 (2mm)',
                               function() {
                                   callback(`${imagepath}images/MNI_T1_2mm_stripped_ras.nii.gz`,viewerno);
                               });
    },
    
    createBroadmannAtlasLoadMenuEntries : function(fmenu,callback,viewerno=0,second_callback=null) {

        webutil.createMenuItem(fmenu, 'Load Yale Brodmann Atlas (1mm)',
                               function () {
                                   callback(`${imagepath}images/yale_broadmann_ras.nii.gz`, viewerno, second_callback);
                               });
        
        webutil.createMenuItem(fmenu, 'Load Yale Brodmann Atlas (2mm)',
                               function () {
                                   callback(`${imagepath}images/yale_broadmann_2mm_ras.nii.gz`, viewerno, second_callback);
                               });

    },

    
    saveImage: function(img,fname,name) {

        if (img===null) {
            webutil.createAlert('No '+name+' in memory!',true);
            return;
        }

        if (typeof fname === "object")
            fname =  img.getFilename() ||  "outputimage.nii.gz";

        img.save(fname).then( (f) => {
            if (webutil.inElectronApp())  {
                webutil.createAlert(name+' saved in '+f);
            }
        }).catch( (e) => {
            if (webutil.inElectronApp())  {
                webutil.createAlert('failed to save '+name+' ('+e+')',true);
            } else {
                console.log('failed to save '+name+' ('+e+')');
            }
        });
    }

};

