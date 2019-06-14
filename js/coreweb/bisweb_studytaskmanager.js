const webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_bidsutils = require('bis_bidsutils.js');
const bisweb_taskutils = require('bisweb_taskutils.js');
const bootbox = require('bootbox');
const $ = require('jquery');
const util=require('bis_util');

const OFFSET=20;
const AXIS=40;
const OPACITY=0.5;

const dummydata=`{
    "units": "frames",
    "TR": 1,
    "offset": 0,
    "runs" : {
        "run1": {
            "motor": "0-20",
            "visual": "40-60",
            "auditory": "80-99"
        },
        "run2": {
            "motor":    [ "0-10",  "40-51", "75-80" ],
            "visual":   [ "12-22", "53-62", "82-83" ],
            "auditory": [ "25-37", "66-72", "85-98" ]
        }
    }
}`;



class StudyTaskManager {
    
    constructor(studypanel,viewerid) {
        this.widget=null;
        this.studypanel=null; // something with a panel
        this.savedParameters = null;
        this.studypanel=studypanel;
        this.taskplotter=null;
        this.viewerid=viewerid;
        this.viewer=document.querySelector(this.viewerid);
        this.taskdata=null;
        this.graphWindow=null;
        this.dialogElement=null;
        this.canvas=null;
        this.legendMargin=0;
        this.margins=[];
        this.htask=0;
        console.log('Task Manager created');
    }

    getTaskData() {
        return this.taskdata;
    }

    createGUI() {

        if (this.widget!==null) 
            return;
            
        this.widget =  webutil.creatediv({ parent : this.studypanel.panel.getWidget(),
                                           css : { 'width' : '95%' }});
        bis_webfileutil.createFileButton({
            'type': 'info',
            'parent' : this.widget,
            'css' : {
                'width' : '45%',
                'margin-left' : '5px',
                'margin-bottom' : '10px',
            },
            'name': 'Import task definition file',
            'callback': (f) => {
                this.loadStudyTaskData(f);
            },
        },
            {
                'title': 'Import task defintion file',
                'filters': [
                    { 'name': 'Task Files', extensions: ['biswebtask'] }
                ],
                'suffix': 'biswebtask',
                'save': false,
            });

        webutil.createbutton({
            'name': 'Clear task definitions',
            'type': 'danger',
            'parent' : this.widget,
            'css' : {
                'width' : '40%',
                'margin-left' : '15px',
                'margin-bottom' : '10px',
            },

            'callback' : () => {
                if (this.taskdata===null) {
                    webutil.createAlert('No task definitions in memory',true);
                    return;
                }
                bootbox.confirm({
                    'message': 'Clear loaded task data?',
                    'buttons': {
                        'confirm': {
                            'label': 'Yes',
                            'className': 'btn-success'
                        },
                        'cancel': {
                            'label': 'No',
                            'className': 'btn-danger'
                        }
                    },
                    'callback': (result) => {
                        console.log('Result=',result);
                        if (result===true) {
                            this.taskdata = null;
                            webutil.createAlert('Task definitions cleared from memory',false);
                        }
                    }
                });
            }
        });

        webutil.createbutton({
            'name': 'Plot Task Timecourses',
            'type': 'info' ,
            'parent' : this.widget,
            'css' : {
                'width' : '45%',
                'margin-left' : '5px',
            },
            callback : () => {
                this.plotTaskData();
            }
        });

        bis_webfileutil.createFileButton({ 
            'name': 'Convert task file to .tsv', 
            'type' : 'primary',
            'parent' : this.widget,
            'css' : {
                'width' : '40%',
                'margin-left' : '15px',
            },
            'callback': (f) => {
                this.createTSVParseModal(f);
            },
        },{
            'title': 'Choose task file',
            'filters': [
                { 'name': 'Task Files', extensions: ['json'] }
            ],
            'suffix': 'json',
            'save': false,
        });


        /*let convertTasksButton = bis_webfileutil.createFileButton({
            'name' : 'Convert .tsvs to task file',
            'type' : 'info',
            'callback' : (f) => {
                let saveFileCallback = (o) => { 
                    bootbox.prompt({
                        'size' : 'small',
                        'title' : 'Enter the TR for the study',
                        'input' : 'number',
                        'callback' : (result) => {
                        bis_bidsutils.parseTaskFileFromTSV(f, o, result);
                        }  
                    });

                };
                    
                setTimeout( () => {
                    bis_webfileutil.genericFileCallback( 
                        {
                            'title' : 'Choose output directory',
                            'filters' : 'DIRECTORY',
                            'save' : false
                        }, saveFileCallback);
                }, 1);
            }
        },
            {
                'title' : 'Choose directory containing .tsv files',
                'filters' : 'DIRECTORY',
                'save' : false
            }
            );*/

        //XP Change
        if (dummydata) {
            this.taskdata= bisweb_taskutils.parseData(dummydata);
            this.plotTaskData();
        }
            
    }

    /**
     * Loads the data for each task from a file on disk. 
     * Turns a JSON file into an array of 1's and zeroes denoting regions of task and rest.
     * 
     * @param {String} name - The name of the task file.
     */
    async loadStudyTaskData(name) {

        //declared here so they can be accessed by the functions below
        
        try {
            this.taskdata= await bisweb_taskutils.parseFile(name);
        } catch(e) {
            webutil.createAlert('Failed to parse task definitions',true);
            return Promise.reject();
        }

        this.plotTaskData();
    }

    setTaskData(taskdata,plot=true) {
        try {
            this.taskdata=JSON.parse(JSON.stringify(taskdata));
        } catch(e) {
            webutil.createAlert('Failed to parse task definitions',true);
        }
        if (plot)
            this.plotTaskData();
    }
        
   
    createTSVParseModal(f) {
        bootbox.confirm({
            'message' : 'Overwrite any existing .tsv files with ones parsed from ' + f + '?',
            'buttons' : {
                'confirm' : {
                    'label' : 'Yes',
                    'className' : 'btn-success'
                },
                'cancel' : {
                    'label' : 'No', 
                    'className' : 'btn-danger'
                }
            },
            'callback' : (result) => {
                if (result) {
                    let baseDirectory = this.studypanel.baseDirectory;
                    bis_bidsutils.parseTaskFileToTSV(f, baseDirectory).then( () => {
                        webutil.createAlert('Task parse successful. Please ensure that these files match what you expect!');
                    });
                }
            }
        });
    }

    // -----------------------------------------------------------------------------------
    createTaskPlotWindow() {

        if (this.graphWindow) {
            this.graphWindow.cleanup();
        }
        
        let dim= this.viewer.getViewerDimensions();
        
        //search HTML for a dock open on the left
        //if it exists, we want to make sure the graph is displayed over it so we add extra width
        let docks = $('.biswebdock');
        for (let dock of docks) {
            if ($(dock).css('left') === '0px') {
                dim[0] += parseInt($(dock).css('width'));
            }
        }
        
        let width = dim[0] - 20;
        let height = dim[1] * 0.85;
        let left = 10;
        let top = 40;
        
        this.dialogElement=document.createElement('bisweb-dialogelement');
        console.log('Dlg=',this.dialogElement);
        let graphWindow =this.dialogElement.create('Task Plotter', width, height, left, top, 200, false);
        
        let innerh = height - 120;
        let innerw = width - 10;
        
        graphWindow.widget.css({
            'margin': '0 0 0 0',
            'padding': '0 0 0 0',
            'height': `${innerh}px`,
            'width': `${innerw}px`,
            "overflow-y": "hidden",
            "overflow-x": "hidden",
        });
        
        graphWindow.widgetbase.css({
            'height': `${innerh}px`,
            'width': `${innerw}px`,
            'background-color': '#222222',
            'margin': '0 0 0 0',
            'padding': '0 0 0 0',
            "overflow-y": "hidden",
            "overflow-x": "hidden",
        });
        
        graphWindow.widget.empty();
        this.graphWindow=graphWindow;
        let dm=[innerw, innerh - 15];
        this.graphcanvasid = webutil.getuniqueid();
        
        graphWindow.widget.css({ "background-color": "#222222" });
        graphWindow.setCloseCallback(() => {
            graphWindow.hide();
        });

        let cw = dm[0];
        let ch = dm[1];

        this.canvas = document.createElement('canvas');
        this.canvas.width=cw;
        this.canvas.height=ch;
        graphWindow.widget.append($(this.canvas));
        console.log('Canvas=',this.canvas);

        this.dialogElement.removeCloseButton();
        let footer=this.dialogElement.getFooter();
        footer.css({
            "height" : "50px",
            'margin' : '3 3 3 3',
            'padding' : '0 0 0 0',
            "overflow-y": "hidden",
            "overflow-x": "hidden" ,
        });
        footer.empty();
        graphWindow.show();
    }


    /** Initialize the plot and then plot the first run */
    plotTaskData() {
        
        this.createTaskPlotWindow();

        if (this.taskdata===null) {
            webutil.createAlert('No task definitions in memory',true);
            return;
        }

        const taskNames = this.taskdata.taskNames;
        const footer=this.dialogElement.getFooter();
        const parsedRuns = this.taskdata.runs;
        const runKeys=Object.keys(parsedRuns);
        
        for (let i=0;i<runKeys.length;i++) {
            let runName=runKeys[i];
            this.addItemToFooter(footer,runName);
        }

        
        let canvas=this.canvas;
        let context=canvas.getContext("2d");
        context.clearRect(0,0,canvas.width,canvas.height);
        context.fillStyle="#444444";
        context.fillRect(0,0,canvas.width,canvas.height);
        
        context.font='14px Arial';
        context.fillStyle = "#ffffff";

        const textw=120,texth=25,offset=20;
        this.legendMargin=Math.ceil(textw+offset);

        console.log('Canvas=',canvas.width,canvas.height,'margin=',this.legendMargin);

        this.margins=[OFFSET,OFFSET,(canvas.width-this.legendMargin-OFFSET),canvas.height-2*OFFSET ];
        this.htask=Math.floor((this.margins[3]-1.1*AXIS)/taskNames.length);
        
        for (let i=0;i<taskNames.length;i++) {
            let y=50+i*this.htask;
            let x=Math.round(canvas.width-this.legendMargin+offset/2);
            let cl=util.objectmapcolormap[i+1];
            context.fillStyle=`rgba(${cl[0]},${cl[1]},${cl[2]},${OPACITY})`;
            context.fillRect(x,y,textw,1.25*texth);
            context.fillStyle="#000000";
            context.fillText(taskNames[i],Math.floor(x+offset/2),Math.floor(y+texth));
        }

        
        this.plotTaskDataRun(runKeys[0]);
    }

    /** Plot data for a single run */
    plotTaskDataRun(runName) {

        this.dialogElement.setTitle('Showing Task Definitions for '+runName.toUpperCase());
        
        let canvas=this.canvas;
        let context=canvas.getContext("2d");
        
        context.fillStyle="#383838";
        context.fillRect(this.margins[0],this.margins[1],this.margins[2],this.margins[3]);

        const taskNames = this.taskdata.taskNames;
        const parsedRuns = this.taskdata.runs;
        const runInfo=parsedRuns[runName];

        let taskbase=this.margins[0];
        
        let maxt=0;
        for (let i=0;i<taskNames.length;i++) {
            let task=taskNames[i];
            let runpairs=runInfo[task];
            // TODO: Fix this in parsing runpairs SHOULD ALWAYS by an array of arrays!
            if (typeof runpairs[0] === "number")
                runpairs=[runpairs]; 

            for (let i=0;i<runpairs.length;i++) {
                let m=parseFloat(runpairs[i][1]);
                if (m>maxt)
                    maxt=m;
            }
        }
        maxt=Math.ceil(maxt/20)*20;

        // draw Time axis;
        let axis_start=this.margins[0]+OFFSET;
        let axis_stop=this.margins[0]+this.margins[2]-2*OFFSET;
        context.beginPath();
        let liney=this.margins[1]+this.margins[3]-0.7*AXIS;
        context.strokeStyle="#ffffff";
        console.log('axis=',axis_start,axis_stop,liney,this.margins);
        context.moveTo(axis_start,liney);
        context.lineTo(axis_stop,liney);
        context.stroke();
        context.font='12px Arial';
        context.fillStyle = "#ffffff";
        context.textAlign="center";
        context.textBaseline="bottom";


        for (let i=0;i<taskNames.length;i++) {
            let task=taskNames[i];
            let runpairs=runInfo[task];
            // TODO: Fix this in parsing runpairs SHOULD ALWAYS by an array of arrays!
            if (typeof runpairs[0] === "number")
                runpairs=[runpairs];
            let maxy=taskbase+this.htask*(i+1);
            let miny=maxy-0.8*this.htask;
            
            context.save();
            context.strokeStyle="#cccccc";
            context.beginPath();
            context.setLineDash([20,5]);
            context.moveTo(axis_start,maxy);
            context.lineTo(axis_stop,maxy);
            context.stroke();
            context.restore();
            context.save();
            let cl=util.objectmapcolormap[i+1];
            for (let i=0;i<runpairs.length;i++) {
                let limits=[ runpairs[i][0], runpairs[i][1] ];
                console.log('Draing',task,limits,cl);
                for (let i=0;i<=1;i++) {
                    limits[i]=axis_start+(limits[i]/maxt)*(axis_stop-axis_start);
                }
                context.fillStyle=`rgba(${cl[0]},${cl[1]},${cl[2]},${OPACITY})`;
                context.fillRect(limits[0],maxy,limits[1]-limits[0],miny-maxy);
            }
            context.restore();
        }
        
        // Vertical Grid Lines
        for (let t=0;t<=maxt;t+=10.0) {
            let x=(t/maxt)*(axis_stop-axis_start)+axis_start;
            let x2=((t+5)/maxt)*(axis_stop-axis_start)+axis_start;
            context.beginPath();
            context.moveTo(x,liney-0.2*AXIS);
            context.lineTo(x,liney+0.2*AXIS);
            context.stroke();
            context.fillText(util.scaledround(t,2)+'s',x,liney+0.7*AXIS);
            context.save();
            
            context.strokeStyle="#888888";
            context.beginPath();
            context.setLineDash([20,5]);
            context.moveTo(x,liney-0.3*AXIS);
            context.lineTo(x,this.margins[1]);
            context.stroke();

            if (t<maxt) {
                context.strokeStyle="#666666";
                context.beginPath();
                context.setLineDash([20,10]);
                context.moveTo(x2,liney);
                context.lineTo(x2,this.margins[1]);
                context.stroke();
            }
            context.restore();
        }

    }

    
    addItemToFooter(footer,key) {

        let bt=webutil.createbutton({
            'name': 'Show '+key.toUpperCase(),
            'type': 'info' ,
            'parent' : footer,
            'css' : {
                'margin-right' : '20px',
                'margin-top'  : '0px',
            },
        });
        
        bt.on('click', () => {
            this.plotTaskDataRun(key);
        
        });
    }


    /**
     * handles resize event from viewer
     * @param {array} dim - [ width,height] of viewer
     */
    handleresize() {

        if (this.resizingTimer) {
            clearTimeout(this.resizingTimer);
            this.resizingTimer = null;
        }

        if (this.graphWindow === null) {
            return;
        }

        if (!this.graphWindow.isVisible()) {
            this.createGraphWindow();
            return;
        }


        this.resizingTimer = setTimeout(() => {
            this.replotGraph(self.lastPlotFrame).catch((e) => {
                console.log(e, e.stack);
            });
        }, 200);

    }




}


module.exports = StudyTaskManager;
