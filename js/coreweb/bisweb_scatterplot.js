const $ = require('jquery');
const d3 = require('d3');
const webutil = require('bis_webutil');
const regression = require('regression');

const globalParams = {
    Id: null,
};

class Bisweb_Scatterplot {

    /**
     * 
     * @param {Element} parentDiv 
     * @param {Array[Number]} dim 
     * @param {CanvasRenderingContext2D} ctx if you would like it to be rendered to a canvas input the ctx.
     * @param {Array[Number]} pos position for the scatterplot to be drawn to
     */
    constructor(parentDiv, dim, pos, ctx = null) {
        globalParams.Id = webutil.getuniqueid();

        //Some Size Settings
        let sizeOffset = 30;
        let svgDim = Math.min(dim[0], dim[1]);
        let innerDim = svgDim - sizeOffset;

        //Create the svg that will contain the scatter chart
        let SVG = d3.select(parentDiv).append('div')
            .attr('class', 'bis-ScatterContainer')
            .attr('style', `width: ${dim[0]}px; left: ${pos[0]}px; top: ${pos[1]}; position: absolute;`)
            .append("svg").attr("id", globalParams.Id)
            .attr('class', 'bis-scatterplotchart')
            .attr('style', 'z-index: 1000; position: relative;')
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${svgDim} ${svgDim}`);

        let scatterChart = SVG.append("g")
            .attr("transform", `translate(${sizeOffset / 2},${sizeOffset / 2})`);
        scatterChart.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', svgDim)
            .attr('height', dim[1])
            .attr('fill', '#FFFFFF')
            .attr("transform", `translate(${-sizeOffset},${-sizeOffset / 2})`);


        //Setup x-Scale and x-Axis
        let xMax = 1;
        let xMin = 0;
        let xScale = d3.scale.linear()
            .domain([-1, xMax * 1.05])
            .range([0, innerDim - sizeOffset * 1.25]);

        let xAxis = d3.svg.axis()
            .orient("bottom")
            .ticks(svgDim / 30)
            .scale(xScale);


        //Setup y-Scale and y-Axis
        let yScale = d3.scale.linear()
            .domain([0, 1])
            .range([innerDim - sizeOffset, 0]);

        let yAxis = d3.svg.axis()
            .orient("left")
            .ticks(svgDim / 30)
            .scale(yScale);

        //draw the Axes to the screen
        scatterChart.append("g")
            .attr("class", "bis-axisX")
            .attr('style', 'font-size: 10px;')
            .attr("transform", `translate(${sizeOffset},${innerDim - sizeOffset})`)
            .attr("width", "inherit")
            .call(xAxis);

        scatterChart.append("g")
            .attr("class", "bis-axisY")
            .attr('style', 'font-size: 10px;')
            .attr("transform", `translate(${sizeOffset},0)`)
            .call(yAxis);

        scatterChart.append('text')
            .text('Predicted')
            .attr("transform", `translate(${innerDim / 2},${innerDim})`)
            .attr('class', 'bis-chartlabel')
            .attr('style', 'font-size: 15px;');


        scatterChart.append('text')
            .text('Actual')
            .attr("transform", `translate(0,${innerDim / 2})rotate(-90)`)
            .attr('class', 'bis-chartlabel')
            .attr('style', 'font-size: 15px;');

        let genScatter = (points, lobf) => {
            scatterChart.selectAll('.dot').remove();
            //Add the dots to the scatterchart
            let dots = scatterChart.selectAll('circle')
                .data(points);
            dots.enter().append('circle')
                .attr('cx', function (d) {
                    return xScale(d[0]) + sizeOffset;
                })
                .attr('cy', function (d) {
                    return yScale(d[1]);
                })
                .attr('r', 0)
                .attr('class', 'dot')
                .attr('fill', "red")
                .transition()
                .attr('r', 1);

            dots.exit().remove();
            if (lobf) {
                let { m, b } = lobf;

                scatterChart.selectAll('.bis-linregressionline').remove();
                //Draw regression to the screen
                scatterChart.append("line")
                    .attr("x1", xScale(xMin) + sizeOffset)
                    .attr("y1", yScale(b))
                    .attr("x2", xScale(xMax) + sizeOffset)
                    .attr("y2", yScale(m * xMax + b))
                    .attr("class", "bis-linregressionline")
                    .attr('stroke: black; stroke-width: 3; stroke-dasharray: 4; pointer-events: none;');
            }

            console.log(SVG);
            //Draw To the canvas if ctx is not null;
            if (!ctx) return;

            ctx.clearRect(pos[0], pos[1], svgDim, svgDim);

            /*
            * SVG to Canvas code adapted from http://bl.ocks.org/armollica/99f18720eb9762351febd64236bb1b9e
            */

            let img = new Image(),
                serializer = new XMLSerializer(),
                svgStr = serializer.serializeToString(SVG[0][0]);

            img.src = 'data:image/svg+xml;base64,' + window.btoa(svgStr);

            img.addEventListener('load', () => {
                ctx.drawImage(img, pos[0], pos[1]);
                ctx.save();
            });
        };


        genScatter([], null);

        let changeData = this.changeData = (e, dataGroup) => {
            let data = dataGroup.scatterData;
            xMax = d3.max(data, d => d[0]) * 1.025;
            xMin = 0;

            //Modify X Scale
            xScale.domain([xMin, xMax]);

            xAxis.scale(xScale);
            scatterChart.selectAll('.bis-axisX').call(xAxis);

            //Modify Y Scale
            yScale.domain([Math.min(0, d3.min(data, d => d[1])), Math.max(1, d3.max(data, d => d[1]) * 1.025)]);

            yAxis.scale(yScale);
            scatterChart.selectAll('.bis-axisY').call(yAxis);

            //Run linear regression
            let reg = regression.linear(data);

            let lobf = { m: reg.equation[0], b: reg.equation[1] };
            genScatter(data, lobf);
        };

        this.destroy = () => SVG.remove();

        //On resize
        this.resize = (dim, pos) => {
            let svgDim = Math.min(dim[0], dim[1]);

            $('.bis-ScatterContainer').attr('style', `width: ${svgDim}px; left: ${pos[0]}px; top: ${pos[1]}; position: absolute;`);
            xAxis.ticks(svgDim / 25);
            scatterChart.selectAll('.bis-axisX').call(xAxis);
            yAxis.ticks(svgDim / 25);
            scatterChart.selectAll('.bis-axisY').call(yAxis);
        };

        $(`.bis-scatterplotchart`).bind('changeData', changeData);
    }
}


module.exports = Bisweb_Scatterplot;