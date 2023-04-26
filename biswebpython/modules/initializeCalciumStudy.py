# LICENSE
# 
# _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
# 
# BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
# 
# - you may not use this software except in compliance with the License.
# - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
# 
# __Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.__
# 
# ENDLICENSE

import os
import sys
import numpy as np
import biswebpython.core.bis_basemodule as bis_basemodule
import biswebpython.core.bis_objects as bis_objects
import biswebpython.utilities.calcium_analysis as calcium_analysis;
from PIL import Image, ImageSequence #for TIFF support
import json

DUMMY_MODE=False

class initializeCalciumStudy(bis_basemodule.baseModule):

    def __init__(self):
        super().__init__();
        self.name='initializeCalciumStudy';
   
    def createDescription(self):
        des= {
            "name": "Initialize Calcium Study",
            "description": "Takes as input a study setup json file and creates the initial nifti images",
            "author": "Xenios Papademetris",
            "version": "1.0",
            "inputs": [],
            "outputs" : [],
            "params": [
                {
                    "type": "string",
                    "name": "Setup Name",
                    "description": "The setup filename",
                    "varname": "setupname",
                    "default" : "",
                    "required": True
                },
                {
                    "type": "string",
                    "name": "Output Directory",
                    "description": "The base output directory",
                    "varname": "outdir",
                    "default" : "",
                    "required": True
                }

            ]
        }
        return des;

    def directInvokeAlgorithm(self,vals):
        print('oooo invoking: something with vals', vals);

        setupname=vals['setupname'];
        print(setupname)
        indir=os.path.abspath(os.path.dirname(setupname))
        outdir=vals['outdir'];
        self.data={};
        
        try:
            file = open(vals['setupname'])
            text=file.read()
            self.data = json.loads(text)
        except:
            e = sys.exc_info()[0]
            print(e)
            print('---- Bad setup file (',setupname)
            return 0

        try:
            os.mkdir(outdir)
        except:
            e = sys.exc_info()[0]
            print(e)
            print('---- Failed to make directory',outdir)
            #            return 0
        
        output=self.convertRuns(self.data,indir,outdir);
        out=json.dumps(output,sort_keys=False,indent=4);
        fname=os.path.abspath(os.path.join(outdir,self.data['subjectname']+'_step1.json'))
        try:
            with open(fname, 'w') as fp:
                fp.write(out);
                print('++++\n++++\t saved in ',fname,len(out));
        except:
            e = sys.exc_info()[0]
            print('----\t failed to save image',e);
            return False
        
        return True

    # --------------------------------------
    # Load Image Data
    # --------------------------------------

    def loadChannels(self,infilename,movies,usedframes,mat,spacing,triggers):

        expected_num_frames=len(triggers);
        img = Image.open(infilename)
        print('... Current number of frames stored for each channel=',usedframes)
        print('... Reading tiff image',str(img),'\n...\t expected num frames='+str(expected_num_frames))

        c=0
        for page in ImageSequence.Iterator(img):

            # This 'F' needs to be investigated (Fortran Mode transposition)
            imgl=page.convert(mode='F')
            v=np.array(imgl)
            channel=triggers[c][1]-1
            
            movies[channel][:,:,0,usedframes[channel]] = np.array(imgl,dtype=np.uint16)
            if (c%125==0 or c<4 or c>(expected_num_frames-4)):
                s='...\t added frame {:5d}/{:5d} to channel {:d} as new frame {:5d} based on trigger {:s}'.format(c+1,expected_num_frames,channel+1,usedframes[channel]+1,str(triggers[c]))
                print(s)

            c=c+1;
            usedframes[channel]=usedframes[channel]+1
            if (c>100 and DUMMY_MODE):
                break

        print('... Read',c,'frames from', infilename,'vs.',len(triggers),'trigger timepoints')
        print('...')
        return
        

    # --------------------------------------
    # Convert Runs
    # --------------------------------------

        
    def convertRuns(self,data,indir,outdir):

        numruns=len(data['runs'])
        if (DUMMY_MODE and numruns>2):
            numruns=2
        numchannels=len(data['channelnames'])
        
        resol=data['resolution'];
        TR=data['TR']
        orient=data['orientation']
        mat=np.zeros((4,4));
        spa=[ resol,resol,1.0,TR*numchannels,1.0 ];
        if (orient[0]=='L'):
            mat[0][0]=-resol
        else:
            mat[0][0]=resol

        if (orient[1]=='P'):
            mat[1][1]=-resol
        else:
            mat[1][1]=resol
        mat[2][2]=1
        mat[3][3]=1


        trigdata=[];
        outputs={
            "subjectname" : data['subjectname'],
            "numchannels" : numchannels,
            "channelnames" : data['channelnames'],
            "runs" : [],
        };

        for acquisition_run in range(0,numruns):
            run=data['runs'][acquisition_run]
            number=run['runnumber']
            if (number==None):
                number='{$:s}'.format(acquisition_run+1)
            parts=run['parts']
            numparts=len(parts)
            channelspec=data['runs'][acquisition_run]['triggerfile']

            tmpimg = Image.open(os.path.join(indir,parts[0]))
            print('...')
            print('..............................................................................')
            print('...')
            print('... B e g i n n i n g   r u n =',acquisition_run+1, 'actual =',number);
            print('...')
            print('... Parsing image',str(tmpimg),'\n...\tsize=',tmpimg.size,str(tmpimg.format))
            print('...')
            print('...',parts)
            print('...')


            # Read trigger file
            try:
                file = open(os.path.join(indir,channelspec))
                text=file.read()
                trigdata.append(json.loads(text))
                print('.... imported triggers from',channelspec)
            except:
                e = sys.exc_info()[0]
                print(e)
                print('---- Bad setup file ',channelspec)
                return 0

            # Figure out how many frames per channe;
            numframes=np.zeros( numchannels,dtype=np.uint32);
            for part in range(0,numparts):
                nm='Tiff_order'+str(part+1)
                triggers=trigdata[acquisition_run][nm]
                lt=len(triggers)
                for k in range(0,lt):
                    v=triggers[k][1]-1;
                    numframes[v]=numframes[v]+1;
                print('...\t processing', nm, 'cumulative numframes per channel=',numframes)
                

            # Initialize empty channel movies
            print('...')
            movies=[];
            for channel in range(0,numchannels):
                v=[tmpimg.size[1],tmpimg.size[0],1,numframes[channel-1]];
                tmp=np.zeros(v,dtype=np.uint16)
                print('... Creating empty channel image',v,'for channel:', data['channelnames'][channel])
                movies.append(tmp)

            usedframes=np.zeros( numchannels,dtype=np.uint32);

                
            # Read each part and append in channels
            for part in range(0,numparts):
                print('...')
                nm='Tiff_order'+str(part+1)
                print('... Importing run',number,'( order=',acquisition_run+1,') part', part+1, 'from', parts[part])
                self.loadChannels(os.path.join(indir,parts[part]),movies,usedframes,mat,spa,trigdata[acquisition_run][nm]);

                
            # Create Outputs
            desc={};
            for channel in range(0,numchannels):
                cn=data['channelnames'][channel]
                oname='{:s}_run{:s}_channel_{:d}_{:s}.nii.gz'.format(data['subjectname'],number,channel+1,cn)
                oname=os.path.abspath(os.path.join(outdir,oname))
                print('... Storing combined run channel',cn,'in',oname)
                img=bis_objects.bisImage();
                img.create(movies[channel],spa,mat);
                if (not DUMMY_MODE):
                    img.save(oname);
                desc[cn]=oname;
                
            outputs['runs'].append(desc)

        print('...')
        print('..............................................................................')
        print('...')
        return outputs
