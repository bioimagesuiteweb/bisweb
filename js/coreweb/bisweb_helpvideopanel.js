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

/**
 * @file A Broswer module. Contains {@link BisWEB_ViewerElements}.
 * @author Xenios Papademetris
 * @version 1.0
 */


"use strict";

const $=require('jquery');
const BisWebPanel = require('bisweb_panel.js');



let singleton=null;

class BisWebHelpVideoPanel {


    displayVideo(embed_link) {

        if (singleton===null)
            singleton=new BisWebPanel(this.layoutcontroller,{
                name : "Help",
                width : 425,
                height : 2000,
                hasfooter : false,
                mode : 'sidebar',
                dual : 'false',
            });
        
        if (!embed_link)
            embed_link=`<iframe width="420" height="236" src="https://www.youtube.com/embed/aFDMQV3nC0A?rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        
        singleton.getWidget().empty();
        singleton.getWidget().append($(embed_link));
        singleton.show();
    }

    setLayoutController(lc) {
        this.layoutcontroller=lc;
    }
}

module.exports=BisWebHelpVideoPanel;
