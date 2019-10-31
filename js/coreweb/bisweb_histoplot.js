const $ = require('jquery');
const d3 = require('d3');
const webutil = require('bis_webutil');

const globalParams = {
    Id: null,
    Ticks: null
};

/**
 * Histogram plot by kol. Uses data contained in testdata/histogram/kol_plots_data.json (as of 10/31/19)
 * Pretty straightforward. Plots a bar graph for the histogram described by the dataset with options to save and a cursor that can tell you the X and Y values for each bar.
 * 
 * Known issues: 
 *  -Resizing the chart currently produces some strangeness, haven't tested it extensively on other aspect ratios and screen sizes. Try reloading the page with the console open to see what I mean.
 *  -When some errors occur in the histogram it will produce another row of buttoms (i.e. file, scatter, histogram) on the top menu. I didn't prioritize solving this because it only occurs on unhandled logic exceptions, most of which I handled.
 *  -Some flickering can occur when hovering on the bar items of the histogram. I wasn't sure how important those data provided by hovering were to begin with, so I didn't prioritize this.
 * 
 * Did not write test scripts.
 * 
 * -Zach, 10/31/19
 */
class Bisweb_Histoplot {

    constructor(parentDiv, dim, pos, binCnt = 50) {
        globalParams.Id = webutil.getuniqueid();
        globalParams.Ticks = binCnt;

        //Size Settings
        let sizeOffset = 29;
        let svgWidth = dim[0] / 2;
        let chartWidth = dim[0] / 4;
        let svgHeight = dim[1] - 150;
        let innerWidth = svgWidth - sizeOffset;
        let innerHeight = svgHeight - sizeOffset;
        let currentlyHoveredElement = null;

        //create the svg Parent and the graphic div that everything will be drawn to (pos[1] currently unused)
        let histoChart = d3.select(parentDiv).insert('div', ':first-child')
            .attr('class', 'bis-HistoContainer')
            .attr('style', `width: ${dim[0]}px; height: ${dim[1]}px; left: ${pos[0]}px; position: absolute;`)
            .append("svg")
            .attr("class", 'bis-histogramchart')
            .attr('style', 'z-index: 1000; position: relative;')
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
            .append("g")
            .attr("id", globalParams.Id)
            .attr("transform", `translate(${sizeOffset},${sizeOffset / 2})`);


        //Create X Scale
        let xScale = d3.scale.linear()
            .range([0, (innerWidth - sizeOffset * 1.25) / 2])
            .domain([-1, 1]);

        //Get maximum and minimum y value
        let yMax = 1;


        //Create Y Scale
        var yScale = d3.scale.linear()
            .range([innerHeight - sizeOffset, 0])
            .domain([0, yMax * 1.025]);


        //Create Axes
        let xAxis = d3.svg.axis()
            .orient("bottom")
            .scale(xScale);

        let yAxis = d3.svg.axis()
            .orient("left")
            .scale(yScale);

        //Add the Axes to the chart
        histoChart.append("g")
            .attr("class", "bis-axisX")
            .attr("transform", `translate(${sizeOffset},${innerHeight - sizeOffset})`)
            .call(xAxis);

        histoChart.append("g")
            .attr("class", "bis-axisY")
            .attr("transform", `translate(${sizeOffset},0)`)
            .call(yAxis);


        //Add labels to the chart
        histoChart.append('text')
            .text("Correlation (R)")
            .attr("transform", `translate(${chartWidth / 2},${innerHeight})`)
            .attr('class', 'bis-label')
            .attr('style', 'font-size: 10px');

        histoChart.append('text')
            .text("Count")
            .attr("transform", `translate(0,${innerHeight / 2})rotate(-90)`)
            .attr('class', 'bis-label')
            .attr('style', 'font-size: 10px');

        //Add legend group to the histogram
        let legend = histoChart.append('g').attr('class', 'legend');

        //Create infobox for hover data if it doesnt exist
        if (!d3.select('.bis-chartInfoBox')[0][0])
            d3.select('.bis-histogramchart').append('text')
                .attr("class", "bis-chartInfoBox");

        //-------------------------------------
        //       Generate graph
        //-------------------------------------
        let genGraph = (bins, groupColor, means) => {
            histoChart.selectAll('.bis-histobar').remove();
            for (let i in bins) {
                let bin = bins[i];
                let currBar = histoChart.selectAll(`.g${bin.group.replace(/\s/g, "")}.bis-histobar`).data(bin);

                currBar.enter().append("rect")
                    .attr("x", d => xScale(d.x) + sizeOffset)
                    .attr("transform", `translate(0,${yScale(0)})`)
                    .attr("width", (innerWidth - sizeOffset * 1.25) / (bin.length * 1.5))
                    .attr("class", `g${bin.group.replace(/\s/g, "")} bis-histobar`)
                    .attr("fill", groupColor[bin.group])
                    .attr("opacity", "0.7")
                    .attr("stroke", "black")
                    .attr("stroke-width", "1")
                    .on("mouseover", function (d) {
                        if (!currentlyHoveredElement) { currentlyHoveredElement = this; }
                        else { return; }

                        //Get elements
                        let target = d3.event.target;
                        let info = d3.select('.bis-chartInfoBox');

                        let histogramDOMElement = $('.bis-histogramchart')[0];
                        let cursorLocation = d3.mouse(histogramDOMElement);

                        //Move the infobox to the pointer
                        info.style('transform', `translate(${cursorLocation[0]}px,${cursorLocation[1]}px)`);

                        //If mouse is still on the same element dont update text and style
                        if (info.attr("data-attatched") == target.id) return;

                        //Set text
                        info.html(`x:${d.x.toFixed(2)} y:${d.y.toFixed(2)}`);

                        //Change some styles
                        info.style('display', "block");
                        info.style('background-color', groupColor[bin.group]);

                        //attatch infobox to element
                        info.attr("data-attatched", target.id);
                    })
                    .on("mouseout", function () {
                        //hide the box
                        let info = d3.select('.bis-chartInfoBox');
                        info.style('display', "none");

                        //Detatch infobox
                        info.attr("data-attatched", 0);
                        currentlyHoveredElement = null;
                    }).attr("height", 0)
                    .transition().duration(1000).ease('sin-in-out')
                    .attr("height", (d) => innerHeight - sizeOffset - yScale(d.y))
                    .attr("transform", d => `translate(0,${yScale(d.y)})`);
                currBar.exit().remove();
            }

            //Sort bars so that smaller ones are in front of the larger ones
            histoChart.selectAll(`.bis-histobar`)
                .sort((a, b) => {
                    return b.y - a.y;
                });

            //Add mean lines to the histogram
            histoChart.selectAll('.bis-histoMeanLine').remove();

            let meanline = histoChart.selectAll('.bis-histoMeanLine').data(means);

            meanline.enter().append('line')
                .attr("class", d => `g${d.group} bis-histoMeanLine`)
                .attr("id", d => d.id)
                .attr("x1", d => xScale(d.value + bins[0][0].dx / 2) + sizeOffset)
                .attr("x2", d => xScale(d.value + bins[0][0].dx / 2) + sizeOffset)
                .attr("y1", yScale(0))
                .attr("y2", yScale(yMax));

            meanline.exit().remove();

            console.log('means', means, groupColor);
            //convert object to Object[]
            let groupColorArr = [];
            for (let i in groupColor) {
                let mean = means.find((e) => { return e.group === i; });
                groupColorArr.push({ name: i, color: groupColor[i], mean: mean });
            }


            //Move legend to the front
            legend.each(function () {
                this.parentNode.appendChild(this);
            });

            //Add a color dot for each group to the legend
            let colorTag = legend.selectAll('.bis-colortag').data(groupColorArr);
            colorTag.enter().append('circle')
                .attr('r', 3)
                .attr('fill', d => d.color)
                .attr('transform', (d, i) => `translate(${chartWidth} ${(i + 1) * 12})`)
                .attr('class', 'bis-colortag');

            colorTag.exit().remove();

            let offsetChartWidth = chartWidth + 5;
            //Add a name to the legend for each color dot
            let groupTag = legend.selectAll('.bis-grouptag').data(groupColorArr);
            groupTag.enter().append('text')
                .text(d => d.name + ' (mean ' + d.mean.value.toFixed(3) + ')')
                .attr('transform', (d, i) => `translate(${offsetChartWidth}, ${(i + 1) * 18 + 2}) rotate(45)`)
                .attr('class', 'bis-grouptag');

            groupTag.exit().remove();
        };

        genGraph([], [], []);

        let changeData = this.changeData = (e, newData) => {
            let { colors = ['#1995e8', '#e81818'], data } = newData;
            let groups = newData.data.groups || newData;

            //Map colors to group names for use in styling
            let groupColor = {};
            let colorCnt = 0;
            for (let group of groups) {
                let color;
                if (!colors[colorCnt])
                    color = `rgb(${Math.random() * 256}, ${Math.random() * 256}, ${Math.random() * 256})`;
                else
                    color = colors[colorCnt];
                colorCnt++;
                groupColor[group] = color;
            }

            //Modify X Scale
            xScale.domain([Math.min(0, d3.min(data.data_array, d => d3.min(d))), d3.max(data.data_array, d => d3.max(d)) * 1.025]);

            xAxis.scale(xScale);
            histoChart.selectAll('.x.bis-axis').call(xAxis);

            //Create Histogram Generator
            let hist = d3.layout.histogram()
                .bins(xScale.ticks(binCnt));

            //Create the bins
            let bins = [];
            for (let g in data.data_groups) {
                let tempbin = hist(data.data_groups[g]);
                tempbin['group'] = g;
                bins.push(tempbin);
            }

            //Get maximum y value
            yMax = d3.max(bins, d1 => d3.max(d1, d => d.length));

            //Modify Y Scale
            yScale.domain([0, yMax * 1.025]);

            yAxis.scale(yScale);
            histoChart.selectAll('.y.bis-axis').call(yAxis);

            //calcuale the mean of each datagroup
            let means = [];
            for (let binGroup in bins) {
                let a = 0;
                let cnt = 0;
                for (let g of bins[binGroup]) {
                    if (g.y > 0) {
                        a += g.x;
                        cnt++;
                    }
                }
                means.push({
                    value: a / cnt,
                    group: bins[binGroup].group,
                    id: `avg${cnt}`
                });
            }

            genGraph(bins, groupColor, means);
        };

        //On resize
        this.resize = (dim, pos) => {
            let svgDim = Math.min(dim[0], dim[1]);

            $('.bis-HistoContainer').attr('style', `width: ${svgDim}px; height: ${dim[1]}; left: ${pos[0]}px; top: ${pos[1]}; position: absolute;`);
            xAxis.ticks(svgDim / globalParams.Ticks);
            histoChart.selectAll('.bis-axisX').call(xAxis);
            yAxis.ticks(svgDim / globalParams.Ticks);
            histoChart.selectAll('.bis-axisY').call(yAxis);
        };

        $('.bis-histogramchart').on('changeData', changeData);

        return $('.bis-HistoContainer');
    }
}

module.exports = Bisweb_Histoplot;