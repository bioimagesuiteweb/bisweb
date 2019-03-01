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
const Taucharts = require('taucharts');

require('bootstrap-slider');

//taucharts plugins
require('../../node_modules/taucharts/dist/plugins/tooltip.js');
require('../../node_modules/taucharts/dist/plugins/legend.js');

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
        this.desired_width = 500;
        this.desired_height = 500;
        this.currentdata = null;
        this.graphcanvasid = null;
        this.lastPlotFrame = false;
        this.graphWindow = null;
        this.resizingTimer = null;
        this.buttons = [];
    }

    connectedCallback() {
        this.viewerid = this.getAttribute('bis-viewerid');
        this.viewerid2 = this.getAttribute('bis-viewerid2');

        webutil.runAfterAllLoaded( () => {
            this.viewer = document.querySelector(this.viewerid);
            if (this.viewerid2) { document.querySelector(this.viewerid2); }
        });
    }

    /** create the GUI (or modifiy it if it exists)
     * @param{Boolean} showbuttons -- if true show the 'Plot VOI Values' and 'Plot VOI Volumes' buttons, else hide them (as we may only have values!)
     */
    createGUI(showbuttons = true) {

        if (this.graphcanvasid !== null) {
            if (this.buttons.length > 0) {
                for (let i = 0; i < this.buttons.length; i++) {
                    if (showbuttons)
                        this.buttons[i].css({ "visibility": "visible" });
                    else
                        this.buttons[i].css({ "visibility": "hidden" });
                }
            }
            return;
        }

        this.graphcanvasid = webutil.getuniqueid();
        this.graphWindow = document.createElement('bisweb-dialogelement');
        this.graphWindow.create("VOI Tool", this.desired_width, this.desired_height, 20, 0, 100, false);
        this.graphWindow.widget.css({ "background-color": "#222222" });
        this.graphWindow.setCloseCallback(() => {
            if (this.buttons.length > 0) {
                for (let i = 0; i < this.buttons.length; i++) {
                    this.buttons[i].css({ "visibility": "hidden" });
                }
            }
            $('.bisweb-taucharts-container').empty();
            this.graphWindow.hide();
        });

        let bbar = this.graphWindow.getFooter();

        let self = this;
        this.graphWindow.close.remove();
        bbar.empty();

        let fn3 = function (e) {
            e.preventDefault();
            self.exportLastData();
        };

        //settings button should be attached next to close button
        let settingsButton = $(`<button type='button' class='bistoggle' style='float:right; -webkit-user-drag: none;'></button>'`);
        let gearIcon = $(`<span class='glyphicon glyphicon-cog'></span>`);
        settingsButton.append(gearIcon);

        let closeButton = this.graphWindow.getHeader().find('.bistoggle');
        settingsButton.insertAfter(closeButton);
        settingsButton.on('click', () => { this.createSettingsModal(); });

        if (showbuttons) {

            this.buttons = [];
            this.buttons.push(webutil.createbutton({
                name: 'Plot Timecourse',
                type: "primary",
                tooltip: '',
                css: {
                    'margin-left': '10px',
                },
                position: "right",
                parent: bbar
            }).click(() => { this.replotGraph(false).catch(() => { }); }));

            this.buttons.push(webutil.createbutton({
                name: 'Plot Single Frame',
                type: "default",
                tooltip: '',
                css: {
                    'margin-left': '10px',
                },
                position: "left",
                parent: bbar
            }).click(() => {
                let cb = (frame) => {
                    this.replotGraph(frame).catch(() => { });
                };

                this.createFrameSelectorModal(cb);

            }));
        }

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

        bbar.tooltip();

    }

    /** Main Function 1 as called by the editor tool
     * Graphs the time-averaged mean of fMRI intensity in the area painted by {@link bisweb_painttoolelement} using 
     * {@link bis_fmrimatrixconnectivity.js}. Uses chart.js for the graphics. 
     * Calls plot Graph for the actual plotting.
     * Opening the file tree panel will shrink the canvas, so we need to add the width to the desired size of the graph window to render properly.
     * 
     * @param {HTMLElement} orthoElement - The orthagonal element to take image data from.
     */
    parsePaintedAreaAverageTimeSeries(orthoElement) {

        if (!orthoElement)
            return;

        this.currentdata = null;
        let image = orthoElement.getimage();
        let objectmap = orthoElement.getobjectmap();

        if (image === null || objectmap === null) {
            webutil.createAlert('No image or objecmap in memory', true);
            return;
        }

        let matrix = null;
        try {
            matrix = fmriutil.roimean(image, objectmap);
        } catch (e) {
            webutil.createAlert('Cannot create roi:' + e, true);
            return;
        }

        let y = numeric.transpose(matrix.means);

        let dim = numeric.dim(y);
        this.numframes = dim[1];
        let x = null;

        if (this.numframes > 1) {
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

        if (orthoElement !== this.lastviewer) {
            if (this.lastviewer)
                this.lastviewer.removeResizeObserver(this);
            this.lastviewer = orthoElement;
        }

        this.formatChartData(y, matrix.numvoxels, null, false);
        this.createChart({ xaxisLabel : 'frame', yaxisLabel : 'intensity (average per-pixel value)' });
    }

    /** replots the current values
     * @param {Number} singleFrame - If set to be a number, plots a VOI for the single frame. If false, plots the timecourse.
     * @returns {Promise} - when done
     */
    replotGraph(singleFrame = false) {

        this.lastPlotFrame = singleFrame;

        if (this.currentdata.numvoxels === null) {
            singleFrame = false;
            showbuttons = false;
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

        this.renderGraphFrame();

        return new Promise((resolve) => {
            setTimeout(() => {
                this.createChart();
                resolve();
            }, 1);
        });
    }

    /**
     * Reformats the means returned by {@link bis_fmrimatrixconnectivity}.roimean to a format readable by chart.js.
     * Internal use only. 
     * @param {Array|Object} y - y-axis data (values)
     * @param {Array} numVoxels - Number of voxels included in a painted region. Also used to designate which regions should be included in the chart.
     * @param {Array} labelsArray - Names to use for each region. Should be arranged in the same order as the data array.
     * @param {Number|Boolean} singleFrame - If a positive number, plot the VOI intensity for that frame. Otherwise plot the timecourse.
     */
    formatChartData(y, numVoxels, labelsArray, singleFrame) {

        let mx = util.objectmapcolormap.length;
        let dim = numeric.dim(y);
        this.numframes = dim[1];
        let parsedDataSet = [], parsedColors = {}, label;

        //if labels are provided in signature leave them alone, otherwise we need to make them
        let makeLabels = labelsArray ? false : true;
        if (makeLabels) labelsArray = [];

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
            console.log('parsed data set', parsedDataSet, labelsArray);
            let x = Array.from({ length: y[0].length }).map(function (e, i) { return i; });
            this.currentdata = {
                x: x,
                y: y,
                numvoxels: numVoxels,
                datasets: parsedDataSet,
                colors: parsedColors,
                chartType: 'line'
            };

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
                numVoxels: numVoxels,
                datasets: parsedDataSet,
                colors: parsedColors,
                chartType: 'bar'
            };
        }
    }

    createChart(settings = null) {

        let chartData = this.currentdata;

        console.log('taskdata', this.taskdata);

        //when redrawing graph settings should be the same as the last time (no settings will be provided on redraw)
        if (settings === null) { settings = this.settings; }
        else { this.settings = settings; }

        this.renderGraphFrame();
        let frame = document.getElementById(this.graphcanvasid);

        if (chartData.chartType === 'bar') {
            this.createBarChart(chartData.datasets[0].data, chartData.colors, frame, settings);
        } else if (chartData.chartType === 'line') {
            if (this.taskdata) { this.createTaskChart(chartData.datasets, chartData.colors, frame, settings); }
            else { this.createLineChart(chartData.datasets, chartData.colors, frame, settings); }
        } else {
            console.log('Error: unrecognized chart type', chartData.chartType);
        }

        //set chart to fade slightly on hover so the tooltip is more visible
        /*$('svg.tau-chart__svg').hover(() => {
            $('.tau-chart__svg').css('opacity', 0.5);
        }, () => {
            $('.tau-chart__svg').css('opacity', 1.0);
        });*/
    }


    createBarChart(data, colors, frame) {

        new Taucharts.Chart({
            guide: {
                showAnchors: true,
                x: {
                    padding: 10,
                    label: { text: 'region' }
                },
                y: {
                    padding: 10,
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
                })],
            data: data,
        }).renderTo(frame);
    }

    createLineChart(data, colors, frame, settings) {

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
                    brewer: colors
                },
            },
            type: 'line',
            x: 'frame',
            y: 'intensity',
            color: 'label',
            settings: {
                fitModel: 'fill-height',
            },
            plugins: [
                this.fillPlugin({
                    'frame' : frame
                }),
                this.lineHoverPlugin( { 
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
        }).renderTo(frame);

    }

    createTaskChart(data, colors, frame, settings) {
        console.log('task chart');
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
                    brewer: colors
                },
            },
            type: 'line',
            x: 'frame',
            y: 'intensity',
            color: 'label',
            settings: {
                fitModel: 'fill-height',
            },
            plugins: [
                this.fillPlugin({
                    'frame' : frame
                }),
                this.lineHoverPlugin( { 
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
        }).renderTo(frame);
    }

    show() {
        this.chart.dialog.modal('show');
    }

    renderGraphFrame() {
        this.createGUI(true);
        let dm = this.getCanvasDimensions();

        if (!dm) {
            return Promise.reject("Bad Dimensions");
        }

        this.graphWindow.show();

        console.log('dm', dm);
        let cw = dm[0];
        let ch = dm[1];

        let cnv = $(`<div id="${this.graphcanvasid}" class='bisweb-taucharts-container' width="${cw}" height="${ch}" style="overflow: auto"></div>`);
        this.graphWindow.widget.append(cnv);
        cnv.css({
            'position': 'absolute',
            'left': '5px',
            'top': '8px',
            'margin': '0 0 0 0',
            'padding': '0 0 0 0',
            'height': `${ch}px`,
            'width': `${cw}px`,
        });
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

    /** save the last data to csv */
    exportLastData() {

        console.log('current data', this.currentdata);
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
            this.getCanvasDimensions();
            return;
        }


        const self = this;
        this.resizingTimer = setTimeout(() => {
            self.replotGraph(self.lastPlotFrame).catch((e) => {
                console.log(e, e.stack);
            });
        }, 200);

    }


    /** Resizes elements and returns the canvas dimensions. Adds file tree panel width if necessary
     * @returns {array} - [ canvaswidth,canvasheight ]
     */
    getCanvasDimensions() {

        let dim;
        if (this.lastviewer) {
            dim = this.lastviewer.getViewerDimensions();
        } else {
            //use the dimensions of added viewer instead
            console.log('dimensions', this.viewer.getViewerDimensions());
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
        let height = dim[1] - 20;
        let left = 10;
        let top = 40;

        this.graphWindow.dialog.css({
            'left': `${left}px`,
            'width': `${width}px`,
            'top': `${top}px`,
            'height': `${height}px`,
        });

        let innerh = height - 120;
        let innerw = width - 10;
        this.graphWindow.widget.css({
            'margin': '0 0 0 0',
            'padding': '0 0 0 0',
            'height': `${innerh}px`,
            'width': `${innerw}px`,
            "overflow-y": "hidden",
            "overflow-x": "hidden",
        });
        this.graphWindow.widgetbase.css({
            'height': `${innerh}px`,
            'width': `${innerw}px`,
            'background-color': '#222222',
            'margin': '0 0 0 0',
            'padding': '0 0 0 0',
            "overflow-y": "hidden",
            "overflow-x": "hidden",
        });

        this.graphWindow.footer.css({
            "height": "40px",
            'margin': '3 3 3 3',
            'padding': '0 0 0 0',
            "overflow-y": "hidden",
            "overflow-x": "hidden",
        });

        this.graphWindow.widget.empty();
        return [innerw, innerh - 15];
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


        console.log('frames', this.numframes);

        let frameSelectorBox = bootbox.confirm({
            'size': 'small',
            'title': 'Select a frame',
            'message': `<p>Select a frame to plot intensities for</p><br>`,
            'show': false,
            'callback': (result) => {
                console.log('slider value', sliderInput.val());
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

    createSettingsModal() {
        let settingsModal = webutil.createmodal('Change settings');
        let flipPolarityButton = $(`<div class='custom-control custom-radio'> 
                                        <input id='polarity-check' class='form-check-input' type='checkbox'></input>
                                        <label for='polarity-check'>Reverse polarity</label>
                                    </div>`);

        settingsModal.body.append(flipPolarityButton);
        settingsModal.dialog.modal('show');

        if (this.polarity === 'negative') { flipPolarityButton.find('.form-check-input').prop('checked', true); }
        settingsModal.dialog.on('hide.bs.modal', () => {

            let flipPolarity = flipPolarityButton.find('.form-check-input').prop('checked');
            if (flipPolarity) {
                this.polarity = 'negative';
            } else {
                this.polarity = 'positive';
            }

            this.replotGraph(false);
        });
    }

    /**
     * Creates a custom Taucharts plugin to disable line fill.
     */
    fillPlugin(settings) {
        let frame = settings.frame;
        return {
            init : () => { 
                console.log('initialized fill plugin'); 
            },
            onRender: () => {
                //disable line fill on lines in svg
                let lines = $(frame).find('.tau-chart__line');
                for (let line of lines) {
                    $(line).attr('fill', 'none');
                }
            }

        };
    }

    lineHoverPlugin(settings) {
        let chart = settings.frame;
        return {
            init : () => {
                console.log('initialized hover plugin');
            },
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
                    }, () => {
                        console.log('hover out');
                    });
                }   
            }
        }
    }
}

module.exports = GrapherModule;
webutil.defineElement('bisweb-graphelement', GrapherModule);


