const webutil = require('bis_webutil.js');
const bis_webfileutil = require('bis_webfileutil.js');
const bis_bidsutils = require('bis_bidsutils.js');
const bisweb_taskutils = require('bisweb_taskutils.js');

const bootbox = require('bootbox');


class StudyTaskManager {
    
    constructor(studypanel,viewerid) {
        this.widget=null;
        this.studypanel=null; // something with a panel
        this.savedParameters = null;
        this.studypanel=studypanel;
        this.taskplotter=null;
        this.viewerid=viewerid;
        this.taskdata=null;
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
        
    
    plotTaskData() {
        
        if (this.taskdata===null) {
            webutil.createAlert('No task definitions in memory',true);
            return;
        }

        if (this.taskplotter===null) {
            this.taskplotter = document.createElement('bisweb-taskplotterelement');
            this.taskplotter.setAttribute('bis-viewerid',this.viewerid);
            document.body.appendChild(this.taskplotter);
        }
        
        //parse ranges into 0 and 1 array
        let parsedRuns = this.taskdata.runs;
        let taskNames = this.taskdata.taskNames;
        let taskCharts = {};

        console.log('parsedRuns',parsedRuns);
        const step=(100.0/(taskNames.length+1));
        const scale=0.8*step;
                
        let runKeys=Object.keys(parsedRuns);

        for (let i=0;i<runKeys.length;i++) {

            let regionsArray = [];
            let regions = {};        
            let runkey=runKeys[i];
            for (let t=0;t<taskNames.length;t++) {
                let taskKey=taskNames[t];
                let base=t*step;
                
                if (parsedRuns[runkey].parsedRegions[taskKey]) {

                    let ukey=taskKey;
                    let tmp=parsedRuns[runkey].parsedRegions[taskKey];
                    regions[ukey] = new Array(tmp.length*3);
                    for (let j=0;j<tmp.length;j++) {
                        tmp[j]=tmp[j]*scale+base;
                        for (let ia=0;ia<=2;ia++)
                            regions[ukey][j*3+ia]=tmp[j];
                    }
                }
            }

            let labelsArray = Object.keys(regions).sort();
            for (let ia = 0; ia < labelsArray.length; ia++) 
                regionsArray.push(regions[labelsArray[ia]]);
            taskCharts[runkey] = this.taskplotter.formatChartData(regionsArray,
                                                                  new Array(labelsArray.length).fill(1),
                                                                  labelsArray,1.0/3.0);
        }
        //let n='All Tasks';
        //taskCharts[n] = blockChart;
        let name=runKeys[0];
        
        this.taskplotter.createChart({
            'xaxisLabel': 'Time',
            'yaxisLabel': 'Activation',
            'isFrameChart': false,
            'charts': taskCharts,
            'makeTaskChart': false,
            'displayChart': name,
            'chartType': 'line',
        });

        return Promise.resolve();
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
}


module.exports = StudyTaskManager;
