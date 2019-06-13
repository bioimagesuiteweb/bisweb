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

// TODO:
// Show Grid lines for time units in s


"use strict";

const $ = require('jquery');
const Chart = require('chart.js');
const webutil = require('bis_webutil');
const util = require('bis_util');
const numeric = require('numeric');
const bootbox = require('bootbox');
const Taucharts = require('taucharts');

require('bootstrap-slider');

//taucharts plugins
require('../../node_modules/taucharts/dist/plugins/tooltip.js');
require('../../node_modules/taucharts/dist/plugins/legend.js');
require('../../node_modules/taucharts/dist/plugins/annotations.js');
require('../../node_modules/taucharts/dist/plugins/export-to.js');

Chart.defaults.global.defaultFontColor = 'white';
Chart.defaults.global.defaultFontSize = '16';


/**
 * @file Adds a frame to the page that will graph things illuminated by the paint tool. Contains {@link BisWEB_ViewerElements}. 
 * Depends on {@link bisweb_painttoolelement}.
 * @author Zach Saltzman
 * @version 1.0
 */

class TaskPlotterModule extends HTMLElement {
    constructor() {
        super();

        this.lastviewer = null;
        this.currentdata = {};
        this.graphcanvasid = null;
        this.lastPlotFrame = false;
        this.graphWindow = null;
        this.resizingTimer = null;
        this.chartInvokedFrom = null; //flag used to determine which buttons should be shown in the graph frame (e.g. plot timecourse.)

        this.taskdata = null;
        this.dialogElement=null;
    }

    connectedCallback() {
        this.viewerid = this.getAttribute('bis-viewerid');

        webutil.runAfterAllLoaded( () => {
            this.viewer = document.querySelector(this.viewerid);
            this.viewer.addResizeObserver(this);
        });
    }

    show() {
        this.chart.dialog.modal('show');
    }

    /**
     * Creates the frame which will contain the VOI plot graph, creating the graph window if necessary. Sizes itself to not overlap the dockbar on the right, but will overlap the one on the left. 
     */
    renderGraphFrame() {

        this.graphcanvasid = webutil.getuniqueid();
        let windowobj = this.createGraphWindow();
        let graphWindow = windowobj.window, dm = windowobj.dimensions;

        graphWindow.widget.css({ "background-color": "#222222" });
        graphWindow.setCloseCallback(() => {
            $('.bisweb-taucharts-container').empty();
            this.chartInvokedFrom = null;
            graphWindow.hide();
        });

        let cw = dm[0];
        let ch = dm[1];

        let cnv = $(`<div id="${this.graphcanvasid}" class='bisweb-taucharts-container' width="${cw}" height="${ch}" style="overflow: auto"></div>`);
        cnv.css({
            'position': 'absolute',
            'left': '5px',
            'top': '8px',
            'margin': '0 0 0 0',
            'padding': '0 0 0 0',
            'height': `${ch}px`,
            'width': `${cw}px`,
        });

        graphWindow.widget.append(cnv);

        graphWindow.show();
        this.graphWindow = graphWindow;
    }

    /** 
     * Creates a bisweb_dialogelement to hold the graph, sizes it, and returns itself.
     * @returns {bisweb_dialogelement} - Appropriately sized element to contain the graph. 
     */
    createGraphWindow() {

        if (this.graphWindow) { this.graphWindow.cleanup(); }

        let dim;
        if (this.lastviewer) {
            dim = this.lastviewer.getViewerDimensions();
        } else {
            //use the dimensions of added viewer instead
            dim = this.viewer.getViewerDimensions();
        }

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
        return  { 
            'window' : graphWindow, 
            'dimensions' : [innerw, innerh - 15] 
        };
    }



    /** replots the current values
     * @param {Number} singleFrame - If set to be a number, plots a VOI for the single frame. If false, plots the timecourse.
     * @returns {Promise} - when done
     */
    replotGraph(singleFrame = false) {

        this.lastPlotFrame = singleFrame;

        if (this.currentdata.numvoxels === null) {
            singleFrame = false;
            //showbuttons = false;
        }

        if (this.currentdata.y < 1) {
            webutil.createAlert('No  objecmap in memory', true);
            return Promise.reject();
        }

        let dim = numeric.dim(this.currentdata.y);
        this.numframes = dim[1];
        this.formatChartData(this.currentdata.y,
                             this.currentdata.numvoxels,
                             null,
                             singleFrame);

        return new Promise((resolve) => {
            setTimeout(() => {
                this.createChart();
                resolve();
            }, 1);
        });
    }

    /**
     * Reformats the y-axis values to a format readable by chart.js. Often these are the values returned by {@link bis_fmrimatrixconnectivity}.roimean.
     * @param {Array|Object} y - y-axis data (values)
     * @param {Array} numVoxels - Number of voxels included in a painted region. Also used to designate which regions should be included in the chart.
     * @param {Array} labelsArray - Names to use for each region. Should be arranged in the same order as the data array.
     */
    formatChartData(y, numVoxels, labelsArray,dt=1.0) { //, singleFrame=false, setCurrentData=false) {
        let mx = util.objectmapcolormap.length;
        let dim = numeric.dim(y);
        this.numframes = dim[1];
        let parsedDataSet = [], parsedColors = {};

        //if labels are provided in signature leave them alone, otherwise we need to make them
        let makeLabels = labelsArray ? false : true;
        if (makeLabels) labelsArray = [];

        for (let i = 0; i < y.length; i++) {
            if (numVoxels[i] != 0) {
                let index = i + 1;
                while (index >= mx) { index = index - mx; }
                
                let cl = util.objectmapcolormap[index];
                cl = 'rgb(' + cl[0] + ', ' + cl[1] + ', ' + cl[2] + ')';
                
                //numbering starts from '1' in viewer so add one to index
                if (makeLabels) {
                    let regionNumber = i + 1;
                    let label = 'R' + regionNumber;
                    labelsArray.push(label);
                    parsedColors[label] = cl;
                } else {
                    parsedColors[labelsArray[i]] = cl;
                }
                
                //if the polarity should be reversed you want to transpose the graph over the trendline
                let trendlineSlope = (y[i][0] - y[i][this.numframes - 1]) / this.numframes;
                
                for (let j = 0; j < y[i].length; j++) {
                    let intensity = y[i][j];
                    if (this.polarity === 'negative') {
                        let trendlineAtFrame = trendlineSlope * j + y[i][0];
                        intensity = trendlineAtFrame + (y[i][j] - trendlineAtFrame) * -1;
                    }
                    
                    //if labels are already generated then it will include regions with no voxels, if not then they will be created above. 
                    //this will create a disparity in which labelsArray[i] will not exist for the generated labels and the correct label will be at the end
                    parsedDataSet.push({ 'stimulus': intensity, 'time': j*dt, 'label': labelsArray[i] || labelsArray[labelsArray.length - 1], 'color': cl });
                }
                
            }
        }

        parsedDataSet = parsedDataSet.filter(Boolean);
        
        let x = Array.from({ length: y[0].length }).map(function (e, i) { return i; });
        let currentData = {
            x: x,
            y: y,
            numvoxels: numVoxels,
            datasets: parsedDataSet,
            colors: parsedColors,
            chartType: 'line'
        };
        
        return currentData;
    }

    createChart(settings = null) {

        
        //if no settings are provided, the graph should use the last available settings when redrawing
        if (settings) { this.currentSettings = settings; }
        else { settings = this.currentSettings; }

        let chartData = this.currentdata;

        this.renderGraphFrame();

        this.dialogElement.removeCloseButton();
        let footer=this.dialogElement.getFooter();
        footer.css({
            "height" : "50px",
            'margin' : '3 3 3 3',
            'padding' : '0 0 0 0',
            "overflow-y": "hidden",
            "overflow-x": "hidden" ,
        });

        console.log('Footer=',footer);
        footer.empty();
        const self=this;

        let frame = document.getElementById(this.graphcanvasid);

        //hide dropdown menu if it shouldn't be used, otherwise fill it with the names of the charts
        if (settings.charts) {
            $(this.graphWindow.getHeader()).find('.task-selector').css('visibility', 'inherit');
            let keys = Object.keys(settings.charts);
            keys.sort();
            for (let i = 0 ; i < keys.length; i++) {
                addItemToFooter(keys[i]);
            }
            self.dialogElement.setTitle('Showing Task Definitions for '+keys[0].toUpperCase());

        } else {
            $(this.graphWindow.getHeader()).find('.task-selector').css('visibility', 'hidden');
        }

        this.createLineChart(chartData.datasets, chartData.colors, frame, settings); 
        
        function addItemToFooter(key) {

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
                let newSettings = settings;
                newSettings.displayChart = key;
                self.createChart(newSettings);
                self.dialogElement.setTitle('Showing Task Definitions for '+key.toUpperCase());
            });
        }
    }



    createLineChart(data, colors, frame, settings) {

        //find data corresponding to the chart to be displayed and highlight selected item in dropdown
        if (settings.displayChart) {
            let dropdownMenu = $(this.graphWindow.getHeader()).find('.task-selector').siblings('.dropdown-menu');
            data = settings.charts[settings.displayChart].datasets;
            colors = settings.charts[settings.displayChart].colors;

            let selectedItem = dropdownMenu.find(`li:contains(${settings.displayChart})`);
            selectedItem.addClass('bs-dropdown-selected');
        }

        let chartParams = {
            guide: {
                showAnchors: 'hover',
                showGridLines: 'xy',
                interpolate: 'linear',
                x: {
                    padding: 10,
                    label: { text: settings.xaxisLabel },
                },
                y: {
                    padding: 10,
                    label: { text: settings.yaxisLabel },
                },
                color: {
                    brewer: colors
                },
            },
            type: 'line',
            x: 'time',
            y: 'stimulus',
            color: 'label',
            settings: {
                fitModel: 'fill-height',
            },
            plugins: [
                Taucharts.api.plugins.get('legend')({
                    'position': 'top'
                }),
                /*Taucharts.api.plugins.get('tooltip')({
                    'fields': ['time' ],
                    'align': 'right'
                }),*/
            ],
            data: data
        };
      

        if (settings.isFrameChart) { chartParams.guide.y.min = 0; chartParams.guide.y.max = 1.1; }

        let chart = new Taucharts.Chart(chartParams);
        chart.renderTo(frame);

        let layout = $(frame).find('.tau-chart__layout');
        layout.addClass('short-chart');

        chart.refresh();

        if (settings.displayChart) {
            let selectedItemLabel = $(`<div class='tau-chart__label'><label><i>Currently displayed — ${settings.displayChart}</i></label></div>`);
            $('.bisweb-taucharts-container').append(selectedItemLabel);
        }
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

    createFrameSelectorModal(cb) {

        let sliderInput = $(`
            <input 
                class='bootstrap-frame-slider'
                data-slider-min='0'
                data-slider-max='${this.numframes - 1}'
                data-slider-value='0'
                data-slider-step='1'>
            </input>`);

        let frameSelectorBox = bootbox.confirm({
            'size': 'small',
            'title': 'Select a frame',
            'message': `<p>Select a frame to plot intensities for</p><br>`,
            'show': false,
            'callback': (result) => {
                if (result) { cb(sliderInput.val()); }
                else { return; }
            }
        });

        frameSelectorBox.find('.modal-body').append(sliderInput);
        $('.bootstrap-frame-slider').slider({
            'formatter': (value) => {
                return 'Current frame: ' + value;
            }
        });
        frameSelectorBox.modal('show');

    }



    /**
     * Creates a custom Taucharts plugin to disable line fill.
     */
    fillPlugin(settings) {
        let frame = settings.frame;
        return {
            init : () => {},
            onRender: () => {
                //disable line fill on lines in svg
                let lines = $(frame).find('.tau-chart__line');
                for (let line of lines) {
                    $(line).attr('fill', 'none');
                }
            }

        };
    }
    
}

module.exports = TaskPlotterModule;
webutil.defineElement('bisweb-taskplotterelement', TaskPlotterModule);


