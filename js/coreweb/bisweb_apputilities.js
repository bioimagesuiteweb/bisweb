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

const genericio=require('bis_genericio');
const webutil = require('bis_webutil');

module.exports = {


    createMNIImageLoadMenuEntries : function(fmenu,callback,viewerno=0) {
        webutil.createMenuItem(fmenu,'Load MNI T1 (1mm)',
                               function() {
                                   let imagepath=webutil.getWebPageImagePath();
                                   callback(`${imagepath}/MNI_T1_1mm_stripped_ras.nii.gz`,viewerno);
                               });
        webutil.createMenuItem(fmenu,'Load MNI T1 (2mm)',
                               function() {
                                   let imagepath=webutil.getWebPageImagePath();
                                   callback(`${imagepath}/MNI_T1_2mm_stripped_ras.nii.gz`,viewerno);
                               });
    },
    
    createBroadmannAtlasLoadMenuEntries : function(fmenu,callback,viewerno=0) {

        webutil.createMenuItem(fmenu, 'Load Yale Brodmann Atlas (1mm)',
                               function () {
                                   let imagepath=webutil.getWebPageImagePath();
                                   callback(`${imagepath}/yale_broadmann_ras.nii.gz`, viewerno);
                               });
        
        webutil.createMenuItem(fmenu, 'Load Yale Brodmann Atlas (2mm)',
                               function () {
                                   let imagepath=webutil.getWebPageImagePath();
                                   callback(`${imagepath}/yale_broadmann_2mm_ras.nii.gz`, viewerno);
                               });

    },

    
    saveImage: function(img,fname,name) {

        if (img===null) {
            webutil.createAlert('No '+name+' in memory!',true);
            return;
        }

        if (!fname && !webutil.inElectronApp())  {
            fname = null;
        } else {
            if (fname) {
                if (typeof fname === "object" ) {
                    if (fname.hasOwnProperty('responseFunction') === false) {
                        fname =  img.getFilename() ||  "outputimage.nii.gz";
                    }
                }
            }  else {
                fname="outputimage.nii.gz";
            }

        }

        img.save(fname).then( (f) => {
            if (!genericio.isSaveDownload())
                webutil.createAlert(name+' saved in '+f);
        }).catch( (e) => {
            webutil.createAlert('failed to save '+name+' ('+e+')',true);
        });
    }

};

