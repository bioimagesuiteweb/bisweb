const $ = require('jquery');
const Taucharts = require('taucharts');
const bis_webutil = require('bis_webutil.js');

class ChartElement {

    constructor() {
        this.createChartFrame();
    }

    createChartFrame() {
        let chart = bis_webutil.createmodal('Volume Chart', 'modal-lg');
        this.chart = chart;

        let container = $(`<div class=bis-chart-container></div>`);
        this.chart.body.append(container);
    }

    createChart(xdata, ydata) {
        let length = 100;
        let data = () => {
            return Array.from({length : length})
            .map((e,i) => { return i;})
            .reduce( (memo, x) => {
                let i = x;
                return memo.concat([
                    { type: 'increase', formula: 'i', i: i, val: i},
                    { type: 'decrease', formula: 'length - i', i: i, val: length - i}
                ])
            }, []);
        };

        new Taucharts.Chart({
            data : data(),
            type : 'line',
            x : 'i', 
            y : 'val',
            color : 'type',
            guide : {
                color : {
                    brewer : { increase : '#ff0000', decrease : '#00ff00'}
                }
            }
        }).renderTo('.bis-chart-container');
    }
    
    show() {
        this.chart.dialog.modal('show');
    }
}

module.exports = ChartElement;