const $ = require('jquery');
const Taucharts = require('taucharts');
const bis_webutil = require('bis_webutil.js');

class ChartElement {

    constructor() {
        this.createChartFrame();
    }

    createChartFrame() {
        this.graphWindow = document.createElement('bisweb-dialogelement');
        this.graphWindow.create("VOI Tool", this.desired_width, this.desired_height, 20, 100, 100, false);
        this.graphWindow.widget.css({ "background-color": "#222222" });
        this.graphWindow.setCloseCallback(() => {
            if (this.buttons.length > 0) {
                for (let i = 0; i < this.buttons.length; i++) {
                    this.buttons[i].css({ "visibility": "hidden" });
                }
            }
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

        if (showbuttons) {

            this.buttons = [];
            this.buttons.push(webutil.createbutton({
                name: 'Plot VOI Values',
                type: "primary",
                tooltip: '',
                css: {
                    'margin-left': '10px',
                },
                position: "right",
                parent: bbar
            }).click(() => { this.rePlotGraph(false).catch(() => { }); }));

            this.buttons.push(webutil.createbutton({
                name: 'Plot VOI Volumes',
                type: "default",
                tooltip: '',
                css: {
                    'margin-left': '10px',
                },
                position: "left",
                parent: bbar
            }).click(() => { this.rePlotGraph(true).catch(() => { }); }));
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
}

module.exports = ChartElement;