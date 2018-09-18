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

const $ = require('jquery');
const Chart = require('chart.js');
const webutil = require('bis_webutil');
const util = require('bis_util');
const fmriutil = require('bis_fmrimatrixconnectivity');
const numeric = require('numeric');
const bisgenericio = require('bis_genericio');
const bootbox = require('bootbox');
const filesaver = require('FileSaver');

Chart.defaults.global.defaultFontColor = 'white';
Chart.defaults.global.defaultFontSize = '16';


/**
 * @file Adds a frame to the page that will graph things illuminated by the paint tool. Contains {@link BisWEB_ViewerElements}. 
 * Depends on {@link bisweb_painttoolelement}.
 * @author Zach Saltzman
 * @version 1.0
 */

class GrapherModule extends HTMLElement {
    constructor() {
        super();

        this.lastviewer = null;
        this.desired_width=900;
        this.desired_height=750;
        this.lastdata = null;
        this.graphcanvasid = null;
        this.lastShowVolume=false;
        this.graphWindow=null;
        this.handlingResize=false;
    }

    createGUI() {

        if (this.graphcanvasid!==null)
            return;

        this.graphcanvasid = webutil.getuniqueid();
        this.graph = null;
        this.graphWindow = document.createElement('bisweb-dialogelement');                          
        this.graphWindow.create("VOI Timeseries Plotter", this.desired_width, this.desired_height, 20,100,100,false);
        this.graphWindow.widget.css({ "background-color": "#222222" });

        let bbar=this.graphWindow.getFooter();

        let self = this;
        this.graphWindow.close.remove();
        bbar.empty();
        
        let fn3 = function (e) {
            e.preventDefault();
            self.exportLastData();
        };

        webutil.createbutton({
            name: 'Plot VOI Values',
            type: "primary",
            tooltip: '',
            css: {
                'margin-left': '10px',
            },
            position: "right",
            parent: bbar
        }).click(() => { this.rePlotGraph(false); });

        webutil.createbutton({
            name: 'Plot VOI Volumes',
            type: "default",
            tooltip: '',
            css: {
                'margin-left': '10px',
            },
            position: "left",
            parent: bbar
        }).click(() => { this.rePlotGraph(true); });

        webutil.createbutton({
            name: 'Export as CSV',
            type: "info",
            tooltip: 'Export Data',
            css: {
                'margin-left': '10px',
            },
            position: "left",
            parent: bbar
        }).click(fn3);

        webutil.createbutton({
            name: 'Save Snapshot',
            type: "warning",
            tooltip: '',
            css: {
                'margin-left': '10px',
            },
            position: "left",
            parent: bbar
        }).click(() => { this.saveSnapshot(); });

        webutil.createbutton({
            name: 'Close',
            type: "default",
            css: {
                'margin-left': '10px',
            },
            position: "right",
            parent: bbar
        }).click(() => { this.graphWindow.hide(); });


        bbar.tooltip();

    }

    /**
     * Graphs the time-averaged mean of fMRI intensity in the area painted by {@link bisweb_painttoolelement} using 
     * {@link bis_fmrimatrixconnectivity.js}. Uses chart.js for the graphics. 
     */
    parsePaintedAreaAverageTimeSeries(orthoElement = null) {

        this.lastdata = null;

        if (orthoElement === null)
            orthoElement = document.getElementsByClassName('ortho-viewer').item(0);

        if (orthoElement === null)
            return;

        if (orthoElement!==this.lastviewer && this.lastviewer!==null) 
            this.lastviewer.removeResizeObserver(this);
        
        this.lastviewer=orthoElement;
        this.lastviewer.addResizeObserver(this);
        
        let image = orthoElement.getimage();
        let objectmap = orthoElement.getobjectmap();

        if (image === null || objectmap === null) {
            webutil.createAlert('No image or objecmap in memory', true);
            return;
        }

        let matrix=null;
        try {
            matrix = fmriutil.roimean(image, objectmap);
        } catch(e) {
            webutil.createAlert('Cannot create roi:'+e, true);
            return;
        }
        
        let y = numeric.transpose(matrix.means);

        let dim = numeric.dim(y);
        let numframes = dim[1];
        let x = null;

        if (numframes > 1) {
            x = numeric.rep([matrix.means.length], 0);
            for (let i = 0; i < matrix.means.length; i++) {
                x[i] = i;
            }
        } else {
            x = numeric.rep([dim[0]], 0);
            for (let i = 0; i < dim[0]; i++) {
                x[i] = i + 1;
            }
        }
        
        this.plotGraph(x, y, matrix.numvoxels);
    }

    plotGraph(x, y, numvoxels) {

        
        this.lastdata = {
            x: x,
            y: y,
            numvoxels: numvoxels
        };
        this.rePlotGraph(false);

    }

    rePlotGraph(showVolume = false, viewerDimensions=null) {

        this.lastShowVolume=showVolume;


        
        if (this.lastdata.y < 1) {
            webutil.createAlert('No  objecmap in memory', true);
            return;
        }

        let dim = numeric.dim(this.lastdata.y);
        let numframes = dim[1];
        let data = this.formatChartData(this.lastdata.x,
                                        this.lastdata.y,
                                        this.lastdata.numvoxels,
                                        showVolume);

        let options = null;
        let d_type = '';

        if (numframes > 1 && showVolume === false) {
            options = {
                title: {
                    display: true,
                    text: 'Average Intensity in each Region vs Time'
                },
                elements: {
                    line: {
                        tension: 0, // disables bezier curves
                    }
                },
                scales: {
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Time (s)',
                            fontSize: 20
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: false
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Intensity',
                            fontSize: 20
                        }
                    }]
                },
                legend: {
                    position: 'right',
                    display: false
                }
            };
            d_type = 'line';
        } else {
            let heading = "Volume of each Region";
            if (showVolume === false)
                heading = "Average Intensity in each Region";

            options = {
                title: {
                    display: true,
                    text: heading,
                },
                legend: {
                    position: 'right',
                    display: false
                },
                scales: {
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Volume (mm^3)',
                            fontSize: 10
                        }
                    }],
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Region Index',
                            fontSize: 10
                        }
                    }]
                }
            };
            d_type = 'bar';
        }

        this.createGUI();
        this.graphWindow.show();
        let dm=this.getCanvasDimensions(viewerDimensions);

        let cw=dm[0];
        let ch=dm[1];
        
        this.graphWindow.widget.empty();
        let cnv=$(`<canvas id="${this.graphcanvasid}" width="${cw}" height="${ch}"></canvas></div>`);
        this.graphWindow.widget.append(cnv);
        cnv.css({
            'background-color' : '#002200',
            'margin' : '4 4 4 4',
            'padding' : '0 0 0 0',
            'height' : `${ch}px`,
            'width'  : `${cw}px`,
        });


        let canvas = document.getElementById(this.graphcanvasid);
        let context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (this.graph !== null)
            this.graph.destroy();


        return new Promise( (resolve) => {
            setTimeout(() => {
                this.graph = new Chart(canvas, {
                    type: d_type,
                    data: data,
                    options: options
                });
                resolve();
            },1);
        });
    }

    /**
     * Reformats the means returned by {@link bis_fmrimatrixconnectivity}.roimean to a format readable by chart.js.
     * Internal use only. 
     */
    formatChartData(x, y, numVoxels, showVolume) {

        let mx = util.objectmapcolormap.length;
        let dim = numeric.dim(y);
        let numframes = dim[1];
        let labels = [];

        if (numframes > 1 && showVolume === false) {
            let parsedDataSets = [];
            for (let i = 0; i < y.length; i++) {
                if (numVoxels[i] != 0) {
                    let index = i + 1;
                    while (index >= mx) { index = index - mx; }

                    let cl = util.objectmapcolormap[index];
                    cl = 'rgb(' + cl[0] + ', ' + cl[1] + ', ' + cl[2] + ')';

                    parsedDataSets[i] = {
                        label: "Region " + i,
                        data: y[i],
                        backgroundColor: cl,
                        borderColor: cl,
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    };

                }
            }
            labels = x;
            parsedDataSets = parsedDataSets.filter(Boolean);
            return {
                labels: labels,
                datasets: parsedDataSets
            };
        } else {
            // Bar Chart
            let parsedDataSet = [], data = [], backgroundColor = [];
            for (let i = 0; i < y.length; i++) {
                if (numVoxels[i] > 0) {
                    let index = i + 1;
                    let colorindex = index;
                    while (colorindex >= mx) { colorindex = (colorindex - 1) - (mx - 1) + 1; }

                    let cl = util.objectmapcolormap[colorindex];
                    cl = 'rgb(' + cl[0] + ', ' + cl[1] + ', ' + cl[2] + ')';
                    backgroundColor.push(cl);
                    let out = 'R' + index;
                    labels.push(out);
                    if (showVolume === false)
                        data.push(y[i]);
                    else
                        data.push(numVoxels[i]);
                }
            }

            parsedDataSet.push({
                data: data,
                backgroundColor: backgroundColor,
                borderWidth: 1,
                pointRadius: 0
            });
            return {
                labels: labels,
                datasets: parsedDataSet
            };
        }
    }

    /** create a snapshot of the current plot */
    saveSnapshot() {

        let canvas = document.getElementById(this.graphcanvasid);
        let outimg = canvas.toDataURL("image/png");
        let dispimg = $('<img id="dynamic">');
        dispimg.attr('src', outimg);
        dispimg.width(300);

        let a = webutil.creatediv();
        a.append(dispimg);

        bootbox.dialog({
            title: 'This is the snapshot (size=' + canvas.width + 'x' + canvas.height + ').<BR> Click SAVE to output as png.',
            message: a.html(),
            buttons: {
                ok: {
                    label: "Save To File",
                    className: "btn-success",
                    callback: function () {
                        let blob = bisgenericio.dataURLToBlob(outimg);
                        if (webutil.inElectronApp()) {
                            let reader = new FileReader();
                            reader.onload = function () {
                                let buf = this.result;
                                let arr = new Int8Array(buf);
                                bisgenericio.write({
                                    filename: "snapshot.png",
                                    title: 'Select file to save snapshot in',
                                    filters: [{ name: 'PNG Files', extensions: ['png'] }],
                                }, arr, true);
                            };
                            reader.readAsArrayBuffer(blob);
                        } else {
                            filesaver(blob, 'snapshot.png');
                        }
                    }
                },
                cancel: {
                    label: "Cancel",
                    className: "btn-danger",
                },
            }
        });
        return false;
    }

    exportLastData() {

        if (this.lastdata === null)
            return;

        let dim = numeric.dim(this.lastdata.y);
        let numrows = dim[1];
        let numcols = dim[0];

        let out = " ,";
        for (let pass = 0; pass <= 2; pass++) {

            if (pass == 1)
                out += "Volume,";
            if (pass == 2)
                out += "\nFrame,";

            for (let col = 0; col < numcols; col++) {
                if (pass === 0 || pass === 2)
                    out += `Region ${col + 1}`;
                else
                    out += `${this.lastdata.numvoxels[col]}`;
                if (col < numcols - 1)
                    out += ',';
            }
            out += "\n";
        }


        for (let row = 0; row < numrows; row++) {
            let line = `${this.lastdata.x[row]}, `;
            for (let col = 0; col < numcols; col++) {
                line += `${this.lastdata.y[col][row]}`;
                if (col < numcols - 1)
                    line += ',';
            }
            out += line + '\n';
        }



        bisgenericio.write({
            filename: 'voidata.csv',
            title: 'Select file to save void timeseries as ',
            filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        }, out);

        return false;
    }

    /**
     * handles resize event from viewer
     * @param {array} dim - [ width,height] of viewer
     */
    handleresize(dim) {
        if (this.handlingResize)
            return;
        
        this.handlingResize=true;
        const self=this;
        setTimeout( () => {
            self.rePlotGraph(self.lastShowVolume,dim).then( () => {
                self.handlingResize=false;
            });
        },500);
        
    }


    /** Resizes elements and returns the canvas dimensions
     * @returns {array} - [ canvaswidth,canvasheight ]
     */
    getCanvasDimensions(dim) {
        
        if (!this.graphWindow.isVisible())
            return;
        
        if (dim===null) {
            if (this.lastviewer)
                dim=this.lastviewer.getViewerDimensions();
            else 
                dim=[ window.innerWidth,window.innerHeight ];
        }

        if (dim[1]>window.innerHeight-50)
            dim[1]=window.innerHeight-50;


        let val=this.graphWindow.dialog.css(['left','width','top','height']);
        let left=parseFloat(val['left'].replace(/px/g,''));
        let width=parseFloat(val['width'].replace(/px/g,''));
        let top=parseFloat(val['top'].replace(/px/g,''));
        let height=parseFloat(val['height'].replace(/px/g,''));

        let newwidth=dim[0]-30;
        let newheight=dim[1]-100;
        
        if ( (width>=this.desired_width && left+width< dim[0]) &&
             (height>=this.desired_height && top+height< dim[1])) {
            return;
        }

        if (width>newwidth) {
            width=newwidth;
            left=15;
        } else if (width<this.desired_width && newwidth>=this.desired_width) {
            width=this.desired_width;
        } else if (width<this.desired_width && newwidth>width) {
            width=newwidth;
        }
             
        if (height>newheight) {
            height=newheight;
            if (height<200)
                height=200;
            top=25;
        } else if (height<this.desired_height && newheight>=this.desired_height) {
            height=this.desired_height;
        } else if (height<this.desired_height && newheight>height) {
            height=newheight;
            if (height<200)
                height=200;
        }             

        this.graphWindow.dialog.css({'left': `${left}px`,
                                     'width' :`${width}px`,
                                     'top' : `${top}px`,
                                     'height' : `${height}px`,
                                     'min-width' :`${width}px` });


        let realh=height-140;
        let realw=width-5;

        this.graphWindow.widget.css({
            'margin' : '0 0 0 0',
            'padding' : '0 0 0 0',
            'height' : `${realh-2}px`,
            'width'  : `${realw-2}px`,
        });
        this.graphWindow.widgetbase.css({
            'height' : `${realh}px`,
            'width'  : `${realw}px`,
            'background-color' : '#222222',
            'margin' : '0 0 0 0',
            'padding' : '0 0 0 0',

        });


        let cw=realw-15;
        let ch=realh-15;
        return [ cw,ch];
    }

}

webutil.defineElement('bisweb-graphelement', GrapherModule);


