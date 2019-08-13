const $=require('jquery');
const d3=require('d3');
const webutil=require('bis_webutil');
const regression = require('regression');

const globalParams = {
    Id : null,
};

/**
 * 
 * @param {Element} parentDiv 
 * @param {number[]} dim 
 * @param {CanvasRenderingContext2D} ctx if you would like it to be rendered to a canvas input the ctx.
 * @param {number[]} pos position for the scatterplot to be drawn to on the canvas
 */
let scatterplot = function(parentDiv, dim, ctx = null, pos = null){
    globalParams.Id=webutil.getuniqueid();
    
    //Some Size Settings
    let sizeOffset = 30;
    let svgDim = Math.min(dim[0]/2, dim[1] - 150);
    let innerDim = svgDim - sizeOffset;
    
    //Create the svg that will contain the scatter chart
    let scatterChart = d3.select(parentDiv).append("svg").attr("id", globalParams.Id)
                        .attr("width", svgDim)
                        .attr("height", svgDim)
                        .append("g")
                        .attr("transform", `translate(${sizeOffset},${sizeOffset/2})`);


    //Setup x-Scale and x-Axis
    let xMax = 1;
    let xMin = 0;
    let xScale = d3.scale.linear()
                .domain([-1, xMax*1.05])
                .range([0,innerDim-sizeOffset*1.25]);
    
    let xAxis = d3.svg.axis()
                .orient("bottom")
                .scale(xScale);
    
                
    //Setup y-Scale and y-Axis
    let yScale = d3.scale.linear()
                .domain([0, 1])
                .range([innerDim-sizeOffset,0]);

    let yAxis = d3.svg.axis()
                    .orient("left")
                    .scale(yScale);
    
    //draw the Axes to the screen
    scatterChart.append("g")
                .attr("class", "x axis")
                .attr("transform", `translate(${sizeOffset},${innerDim-sizeOffset})`)
                .call(xAxis);

    scatterChart.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${sizeOffset},0)`)
                .call(yAxis);

    scatterChart.append('text')
                .text('Predicted')
                .attr("transform", `translate(${svgDim/2},${innerDim})`)
                .attr('class','x label');

scatterChart.append('text')
                .text('Actual')
                .attr("transform", `translate(0,${innerDim/2})rotate(-90)`)
                .attr('class','y label');

    let genScatter = (points, lobf) =>{
        scatterChart.selectAll('.dot').remove();
        //Add the dots to the scatterchart
        let dots = scatterChart.selectAll('circle')
                    .data(points);
                dots.enter().append('circle')
                    .attr('cx',function(d){
                        return xScale(d[0])+sizeOffset;
                    })
                    .attr('cy',function(d){
                        return yScale(d[1]);
                    })
                    .attr('r',0)
                    .attr('class','dot')
                    .attr('fill', "red")
                    .transition()
                    .attr('r', 1);

        dots.exit().remove();
            if(!lobf) return;
            let { m, b } = lobf;

            scatterChart.selectAll('.LOBF').remove();
            //Draw regression to the screen
            scatterChart.append("line")
                    .attr("x1", xScale(xMin)+sizeOffset)
                    .attr("y1", yScale(b))
                    .attr("x2", xScale(xMax)+sizeOffset)
                    .attr("y2", yScale(m*xMax+b))
                    .attr("class","LOBF");

        //Draw To the canvas if ctx is not null;
        if(!ctx) return;

        ctx.clearRect(pos[0], pos[1], svgDim, svgDim);

        /*
        * SVG to Canvas code adapted from http://bl.ocks.org/armollica/99f18720eb9762351febd64236bb1b9e
        */
        let DOMURL = window.URL || window.webkitURL || window;

        let svgString = $(`#${globalParams.Id}`)[0].outerHTML;
	
        let image = new Image();
        let svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        let url = DOMURL.createObjectURL(svgBlob);

        image.onload = function() {
            ctx.drawImage(image, pos[0], pos[1]);
            DOMURL.revokeObjectURL(url);
        };

        image.src = url;
    };


    genScatter([],null);

    let changeData = this.changeData = (e, dataGroup) => {
        let data = dataGroup.scatterData;
        xMax = d3.max(data, d=> d[0])*1.025;
        xMin = 0;

        //Modify X Scale
        xScale.domain([xMin,xMax]);
    
        xAxis.scale(xScale);
        scatterChart.selectAll('.x.axis').call(xAxis);

        //Modify Y Scale
        yScale.domain([Math.min(0, d3.min(data, d => d[1])),d3.max(data, d=> d[1])*1.025]);

        yAxis.scale(yScale);
        scatterChart.selectAll('.y.axis').call(yAxis);

        //Run linear regression
        let reg = regression.linear(data);
        
        let lobf = {m: reg.equation[0], b: reg.equation[1]};
        genScatter(data, lobf);
    };

    $(`#${globalParams.Id}`).bind('changeData', changeData);


};

module.exports = {
    scatterplot,
};