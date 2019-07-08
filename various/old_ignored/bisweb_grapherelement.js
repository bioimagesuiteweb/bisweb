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
const bis_webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const util = require('bis_util');
const fmriutil = require('bis_fmrimatrixconnectivity');
const numeric = require('numeric');
const bisgenericio = require('bis_genericio');
const bootbox = require('bootbox');
const filesaver = require('FileSaver');
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

class GrapherModule extends HTMLElement {
    constructor() {
        super();

        this.lastviewer = null;
        this.currentdata = {};
        this.graphcanvasid = null;
        this.lastPlotFrame = false;
        this.graphWindow = null;
        this.resizingTimer = null;
        this.usesmoothdata = false;
        this.chartInvokedFrom = null; //flag used to determine which buttons should be shown in the graph frame (e.g. plot timecourse.)

        this.taskdata = null;
    }

    connectedCallback() {
        this.viewerid = this.getAttribute('bis-viewerid');
        this.viewerid2 = this.getAttribute('bis-viewerid2');

        bis_webutil.runAfterAllLoaded( () => {
            this.viewer = document.querySelector(this.viewerid);
            this.viewer.addResizeObserver(this);
            if (this.viewerid2) { 
                this.viewer2 = document.querySelector(this.viewerid2); 
                this.viewer.addResizeObserver(this);
            }
        });
    }

    show() {
        this.chart.dialog.modal('show');
    }

    /**
     * Creates the frame which will contain the VOI plot graph, creating the graph window if necessary. Sizes itself to not overlap the dockbar on the right, but will overlap the one on the left. 
     * @param {Object} settings - Settings for createSettingsModal. 
     */
    renderGraphFrame(settings) {

        this.graphcanvasid = bis_webutil.getuniqueid();
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

        this.createGUI(graphWindow, settings);

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

        let graphWindow = document.createElement('bisweb-dialogelement').create('Plotter', width, height, left, top, 200, false);

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

        graphWindow.footer.css({
            "height": "40px",
            'margin': '3 3 3 3',
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

    /**
     * Creates UI elements inside the graph frame created by renderGraphFrame.
     * 
     * @param {bisweb_dialogelement} graphWindow — Dialog window containing the graph.
     * @param {Object} settings — Parameter object for the GUI
     * @param {String} settings.chartType — Type of chart to render, one of 'bar', 'line', or 'task'. Renders different buttons for different tasks.
     */
    createGUI(graphWindow, settings) {

        let footer = graphWindow.getContent().find('.modal-footer');
        $(footer).empty();

        let bbar = bis_webutil.createbuttonbar({ 'css' : 'width: 80%;'});

        //settings button should be attached next to close button
        //TODO: Revisit settings menu? 
        // -Zach
        let settingsButton = $(`<button type='button' class='bistoggle' style='float:right; -webkit-user-drag: none; visibility: hidden'></button>'`);
        let dropdownButton = $(`
        <div class='btn-group dropleft' style='float: right;'>
            <button type='button dropdown-toggle' data-toggle='dropdown' class='bistoggle task-selector' style='float: right; visibility: hidden; -webkit-user-drag: none;'>
            <span class='glyphicon glyphicon-chevron-down'></span>
            </button>    
            <ul class='dropdown-menu'>
                <li style='visibility: hidden;'> hello!</li>
            </ul> 
        </div>
        `);

        let gearIcon = $(`<span class='glyphicon glyphicon-cog'></span>`);
        settingsButton.append(gearIcon);

        let closeButton = graphWindow.getHeader().find('.bistoggle');
        settingsButton.insertAfter(closeButton);
        dropdownButton.insertAfter(settingsButton);

        settingsButton.on('click', () => { this.createSettingsModal(settings); });

        let timecourseButton = bis_webutil.createbutton({
            name: 'Plot Timecourse',
            type: "primary",
            tooltip: '',
            css: {
                'margin-left': '10px',
            },
            position: "right",
        }).click(() => { this.replotGraph(false).catch(() => { }); });


        console.log('settings', settings);
        //Add button to look at a single frame of data if data is a timecourse
        if (settings.chartType === 'line') {
            let singleFrameButton = bis_webutil.createbutton({
                name: 'Plot Single Frame',
                type: "default",
                tooltip: '',
                css: {
                    'margin-left': '10px',
                },
                position: "left",
            }).click(() => {
                let cb = (frame) => {
                    this.replotGraph(frame).catch(() => { });
                };

                this.createFrameSelectorModal(cb);
            });


            bbar.append(singleFrameButton);
        }

        bbar.append(timecourseButton);

        //check to see if current data exists and isn't an empty object
        if (this.currentdata && Object.entries(this.currentdata).length !== 0) {
            let exportButton = bis_webutil.createbutton({
                name: 'Export as CSV',
                type: "info",
                tooltip: 'Export Data',
                css: {
                    'margin-left': '10px',
                },
                position: "left",
            }).click( (e) => {
                e.preventDefault();
                this.exportLastData();
            });

            bbar.append(exportButton);
        }

        if (this.taskdata && Object.entries(this.taskdata).length !== 0) {
            
            let exportButton = webfileutil.createFileButton({
                'type': 'info',
                'name': 'Export task info',
                'css' : { 
                    'margin-left' : '10px'
                },
                'callback': (f) => {
                    this.taskdata.matrix.save(f);
                },
            }, {
                'title': 'Select a directory to save matrix info in',
                'filters': 'DIRECTORY',
                'suffix': 'DIRECTORY',
                'save': true,
                'serveronly' : true,
                initialCallback: () => { return 'tasks.matr'; },
            });

            bbar.append(exportButton);
        }
       
        if (this.viewer.getimage() || (this.viewer2 && this.viewer2.getimage())) {
            let screenshotButton = bis_webutil.createbutton({
                name: 'Save Snapshot',
                type: "warning",
                tooltip: '',
                css: {
                    'margin-left': '10px',
                },
                position: "left",
            }).click(() => { this.saveTauchartsSnapshot(); });

            //TODO: Removed until I work out saving a snapshot with Taucharts
            // -Zach
            //bbar.append(screenshotButton);
        }
        
        bbar.tooltip();
        footer.append(bbar);
    }

    /** Main Function 1 as called by the editor tool
     * Graphs the time-averaged mean of fMRI intensity in the area painted by {@link bisweb_painttoolelement} using 
     * {@link bis_fmrimatrixconnectivity.js}. Uses chart.js for the graphics. 
     * Calls plot Graph for the actual plotting.
     * Opening the file tree panel will shrink the canvas, so we need to add the width to the desired size of the graph window to render properly.
     * 
     * @param {HTMLElement} orthoElement - The orthagonal element to take image data from.
     * @param {Object|BiswebImage} imgdata - An object containing one or more images. May be used to specify image data not specifically displayed on screen, e.g. when loading a task set.
     */
    parsePaintedAreaAverageTimeSeries(orthoElement = null, imgdata = null) {

        //TODO: Work out the issue with chartType not being specified in these settings but the correct chart being created anyway.
        // -Zach
        let self = this;
        if (!orthoElement && !imgdata)
            return;

        this.currentdata = null;
        let image, objectmap;

        if (orthoElement && !imgdata) {
            image = orthoElement.getimage();
            objectmap = orthoElement.getobjectmap();
            formatChart(image, objectmap);
            this.createChart({ xaxisLabel : 'frame', yaxisLabel : 'intensity (average per-pixel value)', makeTaskChart : (this.taskdata) ? true : false });
        } else if (orthoElement && imgdata) {

            //plot the image if there's only one image, otherwise assemble the dictionary of task images
            let objectmap = orthoElement.getobjectmap();
            if (imgdata.jsonformatname) {
                formatChart(imgdata, objectmap);
                this.createChart({ xaxisLabel : 'frame', yaxisLabel : 'intensity (average per-pixel value)', makeTaskChart : (this.taskdata) ? true : false })
            } else {
                let startingKey = 99;
                for (let key of Object.keys(imgdata)) {
                    let splitKey = key.split('_');
                    let keyNum = splitKey[1];
                    if (parseInt(keyNum) < startingKey) { startingKey = splitKey.join('_'); }

                    imgdata[key] = formatChart(imgdata[key], objectmap);
                }

                this.createChart({ xaxisLabel : 'frame', yaxisLabel : 'intensity (average per-pixel value)', makeTaskChart : true, charts: imgdata, displayChart : startingKey });
            }
            
        } else {
            console.log('cannot parse time series without an ortho element');
            return;
        }

        function formatChart(image, objectmap) {
            if (image === null || objectmap === null) {
                bis_webutil.createAlert('No image or objecmap in memory', true);
                return;
            }
    
            let matrix = null;
            try {
                matrix = fmriutil.roimean(image, objectmap);
            } catch (e) {
                bis_webutil.createAlert('Cannot create roi:' + e, true);
                return;
            }
    
            let y = numeric.transpose(matrix.means);
    
            let dim = numeric.dim(y);
            self.numframes = dim[1];
            let x = null;
    
            if (self.numframes > 1) {
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

            return self.formatChartData(y, matrix.numvoxels, null, false);
        }
       
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
            bis_webutil.createAlert('No  objecmap in memory', true);
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
     * @param {Number|Boolean} singleFrame - If a positive number, plot the VOI intensity for that frame. Otherwise plot the timecourse.
     * @param {Boolean} setCurrentData - If true, set this.currentdata to be the data that formatChartData parses, otherwise don't. True by default.
     */
    formatChartData(y, numVoxels, labelsArray, singleFrame, setCurrentData = true) {
        let mx = util.objectmapcolormap.length;
        let dim = numeric.dim(y);
        this.numframes = dim[1];
        let parsedDataSet = [], parsedColors = {}, label;

        //if labels are provided in signature leave them alone, otherwise we need to make them
        let makeLabels = labelsArray ? false : true;
        if (makeLabels) labelsArray = [];

        if ( !y || y.length === 0) { bis_webutil.createAlert('Error: no objectmap loaded', true); return; }

        if (this.numframes > 1 && singleFrame === false) {

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
                        parsedDataSet.push({ 'intensity': intensity, 'frame': j, 'label': labelsArray[i] || labelsArray[labelsArray.length - 1], 'color': cl });
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

            if (setCurrentData) { this.currentdata = currentData; }
            if (this.usesmoothdata) { this.makeSmoothChartData(); }

            return currentData;

        } else {

            //if we're in bar chart territory and single frame isn't set, that means there's only 1 frame of data.
            if (!singleFrame) { singleFrame = 0; }

            // Select a single data frame from within y and plot the frame as a bar chart
            let dataframe = [], data = [];
            for (let i = 0; i < y.length; i++) { dataframe.push(y[i][singleFrame]); }

            for (let i = 0; i < dataframe.length; i++) {

                let doshow = false;
                if (numVoxels === null) {
                    doshow = true;
                } else if (numVoxels[i] > 0) {
                    doshow = true;
                }

                if (doshow) {
                    let index = i + 1;
                    let colorindex = index;
                    while (colorindex >= mx) { colorindex = (colorindex - 1) - (mx - 1) + 1; }

                    let cl = util.objectmapcolormap[colorindex];
                    cl = 'rgb(' + cl[0] + ', ' + cl[1] + ', ' + cl[2] + ')';
                    label = 'R' + index;
                    parsedColors[label] = cl;

                    data.push({ 'intensity': dataframe[i], 'index': index, 'label': label, 'color': cl });
                }
            }

            parsedDataSet.push({
                data: data,
                borderWidth: 1,
                pointRadius: 0
            });

            this.currentdata = {
                x: y[0].length,
                y: y,
                numvoxels: numVoxels,
                datasets: parsedDataSet,
                colors: parsedColors,
                chartType: 'bar'
            };
        }

        return this.currentdata;
    }

    createChart(settings = null) {

        //if no settings are provided, the graph should use the last available settings when redrawing
        if (settings) { this.currentSettings = settings; }
        else { settings = this.currentSettings; }

        let chartData = this.currentdata;

        //when redrawing graph settings should be the same as the last time (no settings will be provided on redraw)
        if (settings === null) { settings = this.settings; }
        else { this.settings = settings; }

        this.renderGraphFrame(settings);
        let frame = document.getElementById(this.graphcanvasid);

        //hide dropdown menu if it shouldn't be used, otherwise fill it with the names of the charts
        if (settings.charts) {
            $(this.graphWindow.getHeader()).find('.task-selector').css('visibility', 'inherit');
            let dropdownMenu = $(this.graphWindow.getHeader()).find('.task-selector').siblings('.dropdown-menu');
            dropdownMenu.empty();

            //check for optional charts in settings and alphabetize keys so that they display in order in the dropdown
            let keys = Object.keys(settings.charts);

            keys.sort();
            for (let i = 0 ; i < keys.length; i++) {
                addItemToDropdown(keys[i], dropdownMenu);
            }

        } else {
            $(this.graphWindow.getHeader()).find('.task-selector').css('visibility', 'hidden');
        }

        console.log('settings', settings, 'chart data', chartData);
        let chartType = settings.chartType || chartData.chartType;  
        if (settings.makeTaskChart && chartType === 'line') {
            this.createTaskChart(chartData.datasets, chartData.colors, frame, this.taskdata, settings);
        } else if (chartType === 'bar') {
            this.createBarChart(chartData.datasets[0].data, chartData.colors, frame, settings);
        } else if (chartType === 'line') {
            this.createLineChart(chartData.datasets, chartData.colors, frame, settings); 
        } else {
            console.log('Error: unrecognized chart type', chartType);
        }

        let self = this;
        function addItemToDropdown(key, dropdownMenu) {
            let button = $(`<a class='dropdown-item' href='#'>${key}<br></a>`);
            
            let buttonItem = $(`<li></li>`);
            buttonItem.append(button);
            dropdownMenu.append(buttonItem);
            button.on('click', () => {
                let newSettings = settings;
                newSettings.displayChart = key;
                self.createChart(newSettings);
            });
        }
    }


    createBarChart(data, colors, frame, /* settings --currently unused */) {

        let chart = new Taucharts.Chart({
            guide: {
                showAnchors: true,
                x: {
                    padding: 0,
                    label: { text: 'region' }
                },
                y: {
                    padding: 0,
                    rotate: -90,
                    label: { text: 'intensity (average per-pixel value)' },
                },
                color: {
                    brewer: colors
                }
            },
            type: 'bar',
            x: 'index',
            y: 'intensity',
            color: 'label',
            size : 'size',
            settings: {
                fitModel: 'fill-height'
            },
            plugins: [
                Taucharts.api.plugins.get('legend')({
                    'position': 'top'
                }),
                Taucharts.api.plugins.get('tooltip')({
                    'fields': ['intensity', 'label'],
                    'align': 'right'
                }),
                Taucharts.api.plugins.get('export-to')({
                    'visible' : false,
                    'paddingTop' : '20px'
                })],
            data: data,
        });

        chart.renderTo(frame);

        let layout = $(frame).find('.tau-chart__layout');
        layout.addClass('single-chart');

        chart.refresh();
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
            x: 'frame',
            y: (this.usesmoothdata ? 'smoothedintensity' : 'intensity'),
            color: 'label',
            settings: {
                fitModel: 'fill-height',
            },
            plugins: [
                this.fillPlugin({
                    'frame' : frame
                }),
                Taucharts.api.plugins.get('legend')({
                    'position': 'top'
                }),
                Taucharts.api.plugins.get('tooltip')({
                    'fields': ['intensity', 'frame', 'label'],
                    'align': 'right'
                })],
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

    createTaskChart(data, colors, frame, tasks, settings) {

        //find data corresponding to the chart to be displayed and highlight selected item in dropdown
        if (settings.displayChart) {
            let dropdownMenu = $(this.graphWindow.getHeader()).find('.task-selector').siblings('.dropdown-menu');
            data = settings.charts[settings.displayChart].datasets;

            let selectedItem = dropdownMenu.find(`li:contains(${settings.displayChart})`);
            selectedItem.addClass('bs-dropdown-selected');
        }

        //construct task labels and regions for tauchart
        for (let task of tasks.formattedTasks) {
            for (let item of data) {
                if (task.data[item.frame] === 1) { item.task = task.label; }
            }
        }
        //find task regions corresponding to the labeled image
        let taskIndex = null, taskLabel = null, annotations = [];
        for (let i = 0; i < tasks.formattedTasks.length; i++) {
            if (tasks.formattedTasks[i].label === settings.displayChart) { taskIndex = i; taskLabel = settings.displayChart; break; }
        }

        //if there's a valid task region paint it in the image, otherwise ignore it
        if (taskIndex !== null) {
            //convert underscore separated task name back to work with raw task index
            let convertedLabel = taskLabel.indexOf('_') ? taskLabel.split('_').join('') : taskLabel;
            let keys = Object.keys(tasks.rawTasks.runs[convertedLabel]), index = 1;
            for (let key of keys) {
                let task = tasks.formattedTasks[taskIndex].regions[key];
                let cl = util.objectmapcolormap[index];
                cl = 'rgba(' + cl[0] + ', ' + cl[1] + ', ' + cl[2] + ', 0.2)';

                if (Array.isArray(task)) { 
                    for (let subTask of task) {
                        annotations.push({
                            'dim' : 'frame',
                            'val' : parseTask(subTask),
                            'text' : key,
                            'color' : cl
                        });
                    }
                } else {
                    annotations.push({
                        'dim' : 'frame', 
                        'val' : parseTask(task),
                        'text' : key,
                        'color' : cl
                    });
                }

                index = index + 1;
            }
        }

        let chart = new Taucharts.Chart({
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
            x: 'frame',
            y: (this.usesmoothdata ? 'smoothedintensity' : 'intensity'),
            color: 'label',
            settings: {
                fitModel: 'entire-view',
            },
            plugins: [
                this.fillPlugin({
                    'frame' : frame
                }),
                Taucharts.api.plugins.get('legend')({
                    'position' : 'top'
                }),
                Taucharts.api.plugins.get('tooltip')({
                    'fields': ['intensity', 'frame', 'label', 'task'],
                    'align': 'right'
                }),
                Taucharts.api.plugins.get('annotations')({
                    items : annotations
                })],
            data: data
        });
        
        chart.renderTo(frame);

        let layout = $(frame).find('.tau-chart__layout');
        layout.addClass('short-chart');

        chart.refresh();

        if (settings.displayChart) {
            let selectedItemLabel = $(`<div class='tau-chart__label'><label><i>Currently displayed — ${settings.displayChart}</i></label></div>`);
            $('.bisweb-taucharts-container').append(selectedItemLabel);
        }
       
        function parseTask(task) {
            let parsedTask = task.split('-');
            parsedTask[0] = parseInt(parsedTask[0]);
            parsedTask[1] = parseInt(parsedTask[1]);
            return parsedTask;
        }
    }

    createSeparatedTaskChart(data, colors, frame, tasks, settings) {

        console.log('tasks', tasks.formattedTasks);
        //construct complete colors object
        //this will be each task name combined with each region
        let parsedColors = {};
        let colorKeys = Object.keys(colors);
        for (let key of colorKeys) {
            for (let task of tasks) {
                let taskColor = task.label + '_' +  key;
                parsedColors[taskColor] = colors[key];
            }
        }

        //data is formatted as a single array for a regular chart, so decompile that into separate arrays
        let separatedArrays = [], taskFrames = tasks[0].data.length;
        while (data.length > 0) {
            separatedArrays.push(data.splice(0, taskFrames));
        }

        for (let task of tasks) {
            let parsedData = [];
            for (let region of separatedArrays) {
                let regionArray = [];
                for (let i = 0; i < task.data.length; i++) {
                    let unit = {}; 
                    Object.assign(unit, region[i]);
                    unit.label = task.label + '_' + unit.label;
                    if (task.data[i] === 0) { unit.intensity = 0; }
                    regionArray.push(unit);
                }
                parsedData = parsedData.concat(regionArray);
            }
            
            new Taucharts.Chart({
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
                        brewer: parsedColors
                    },
                },
                type: 'line',
                x: 'frame',
                y: 'intensity',
                color: 'label',
                settings: {
                    fitModel: 'fit-width',
                },
                plugins: [
                    this.fillPlugin({
                        'frame' : frame
                    }),
                    /*this.lineHoverPlugin( { 
                        'frame' : frame
                    }),*/
                    Taucharts.api.plugins.get('legend')({
                        'position' : 'top'
                    }),
                    Taucharts.api.plugins.get('tooltip')({
                        'fields': ['intensity', 'frame', 'label'],
                        'align': 'right'
                    })],
                data: parsedData
            }).renderTo(frame);
        }

        let layout = $(frame).find('.tau-chart__layout');
        layout.addClass('task-chart');
    }

    /** create a snapshot of the current plot */
    saveSnapshot() {

        let canvas = document.getElementById(this.graphcanvasid);

        let outcanvas = document.createElement('canvas');
        outcanvas.width = canvas.width;
        outcanvas.height = canvas.height;

        let ctx = outcanvas.getContext('2d');
        ctx.fillStyle = "#555555";
        ctx.globalCompositeOperation = "source-over";
        ctx.fillRect(0, 0, outcanvas.width, outcanvas.height);
        ctx.drawImage(canvas, 0, 0, outcanvas.width, outcanvas.height);

        let outimg = outcanvas.toDataURL("image/png");

        let dispimg = $('<img id="dynamic">');
        dispimg.attr('src', outimg);
        dispimg.width(300);

        let a = bis_webutil.creatediv();
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
                        if (bis_webutil.inElectronApp()) {
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

    saveTauchartsSnapshot() {
        //click hidden 'Export' button
        let frame = document.getElementById(this.graphcanvasid);
        let exportButton = $(frame).find('.tau-chart__export');
        console.log('export button', exportButton);
        exportButton.trigger('click');
    }

    /** save the last data to csv */
    exportLastData() {

        if (this.currentdata === null)
            return;

        let dim = numeric.dim(this.currentdata.y);
        let numrows = dim[1];
        let numcols = dim[0];

        let out = " ,";
        for (let pass = 0; pass <= 2; pass++) {

            if (pass == 1)
                out += "Volume,";
            if (pass == 2)
                out += "\nFrame,";

            for (let col = 0; col < numcols; col++) {
                if (this.currentdata.numvoxels[col] > 0) {
                    if (pass === 0 || pass === 2)
                        out += `Region ${col + 1}`;
                    else
                        out += `${this.currentdata.numvoxels[col]}`;
                    if (col < numcols - 1)
                        out += ',';
                }
            }
            out += "\n";
        }


        for (let row = 0; row < numrows; row++) {
            let line = `${this.currentdata.x[row]}, `;
            for (let col = 0; col < numcols; col++) {
                if (this.currentdata.numvoxels[col] > 0) {
                    line += `${this.currentdata.y[col][row]}`;
                    if (col < numcols - 1)
                        line += ',';
                }
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

    createSettingsModal(settings = {}) {
        let settingsModal = bis_webutil.createmodal('Change settings');

        let submitButton = $(`<button type='button' class='btn btn-sm btn-success'>Ok</button>`);
        let cancelButton = $(`<button type='button' class='btn btn-sm btn-primary'>Cancel</button>`);

        let footer = settingsModal.footer;
        footer.empty(); 
        footer.append(submitButton); 
        footer.append(cancelButton);
        
        let polarityButton = null, smoothButton = null, optionalChartsButton = null;

        if (settings.optionalCharts) { optionalChartsButton = createCheck('Display optional charts'); }
        if (settings.flipPolarity) { polarityButton = createCheck('Reverse polarity'); }
        if (settings.smooth) { smoothButton = createCheck('Smooth input'); }

        if (polarityButton && this.polarity === 'negative') { polarityButton.find('.form-check-input').prop('checked', true); }
        if (smoothButton && this.usesmoothdata) { smoothButton.find('.form-check-input').prop('checked', true); }
        if (optionalChartsButton && this.showOptionalCharts) { smoothButton.find('.form-check-input').prop('checked', true); }


        //callbacks for individual toggles
        submitButton.on('click', () => {

            checkEnable(smoothButton, 
                () => { this.makeSmoothChartData(); this.usesmoothdata = true; }, 
                () => { this.usesmoothdata = false; });
            
            checkEnable(polarityButton, 
                () => { this.polarity = 'negative'; },
                () => { this.polarity = 'positive'; });
            
            checkEnable(optionalChartsButton, 
                () => { },
                () => { });

            settingsModal.dialog.modal('hide');
            this.replotGraph(false);
        });

        cancelButton.on('click', () => {
            settingsModal.dialog.modal('hide');
        });

        settingsModal.dialog.modal('show');

        function createCheck(name) {
            let id = bis_webutil.getuniqueid();
            let button = $(`<div class='custom-control custom-radio'> 
                                <input id=${id} class='form-check-input' type='checkbox'></input>
                                <label for='polarity-check'>${name}</label>
                            </div>`);
            
            settingsModal.body.append(button);
            return button;
        }

        function checkEnable(button, enablecb, disablecb) {
            if (button) { 
                let enable = button.find('.form-check-input').prop('checked');
                if (enable) { enablecb(); }
                else { disablecb(); }
            } else { 
                disablecb(); 
            }
        }
    }

    makeSmoothChartData() {
        //edge case of smoothing isn't handled, i.e. the values are left as-is
        let datasets = this.currentdata.y, smoothdata = []; 

        for (let i = 0; i < datasets.length; i++) {

            let dataset = datasets[i];
            //skip arrays that are all empty elements
            if (dataset.every( ele => ele === 0 )) { continue; }

            let smoothDataset = [ dataset[0], dataset[1] ];
            for (let j = 2; j < dataset.length - 2; j++) {
                let smoothPoint = 0.05 * dataset[j - 2] + 0.25 * dataset[j - 1] + 0.4 * dataset[j] + 0.25 * dataset[j + 1] + 0.05 * dataset[j + 2];
                smoothDataset.push(smoothPoint);
            }

            //add the last two points
            smoothDataset.push(dataset[dataset.length-2], dataset[dataset.length-1]);
            smoothdata.push(smoothDataset);
        }

        //add a smooth data field to the taucharts-formatted data
        let joinedSmoothArray = []; 
        for (let dataset of smoothdata) { joinedSmoothArray = joinedSmoothArray.concat(dataset); }

        //NOTE: sets in currentdata.y are assumed to be listed in the same order as currentdata.datasets
        for (let i = 0; i < joinedSmoothArray.length; i++) {
            this.currentdata.datasets[i].smoothedintensity = joinedSmoothArray[i];
        }

        this.currentdata.smoothdata = smoothdata;
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

    /*lineHoverPlugin(settings) {
        let chart = settings.frame;
        return {
            init : () => {},
            onRender : () => {
                let lines = $(chart).find('.tau-chart__line');
                for (let node of lines) {
                    //clear opacity on render

                    $(node).css('opacity', '');
                    $(node).hover( () => {

                        //change opacity of other lines in the set
                        for (let otherNode of lines) {
                            $(otherNode).css('opacity', 0.3);
                        }
                        $(node).css('opacity', '1.0');
                    }, () => {});
                }   
            }
        };
    }*/

    hasTaskData() {
        return this.taskdata ? true : false;
    }
}

module.exports = GrapherModule;
bis_webutil.defineElement('bisweb-graphelement', GrapherModule);


