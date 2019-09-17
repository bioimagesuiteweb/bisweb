const $ = require('jquery');
const d3 = require('d3');

const bis_webutil = require('bis_webutil.js');

class Bisweb_Histogramplot {
    constructor(parentDiv, dim = [400, 400], binCnt = 30) {
        let chartId = bis_webutil.getuniqueid();

        //Size Settings
        let sizeOffset = 29;
        let svgWidth = dim[0];
        let svgHeight = dim[1];
        let innerWidth = svgWidth - sizeOffset;
        let innerHeight = svgHeight - sizeOffset;
    
        //create the svg Parent and the graphic div that everything will be drawn to
        let histoChart = d3.select(parentDiv).append('div')
            .attr('class', 'bis-histogramContainer')
            .attr('style', `width: ${dim[0]}px; left: '0px'; top: '0px'; position: absolute;`)
            .append('svg').attr("class", 'bis-histogramChart')
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .attr('style', 'z-index: 1000; position: relative;')
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .attr('viewbox', `0 0 ${svgWidth} ${svgHeight}`)
            .append("g")
            .attr("id", chartId)
            .attr("transform", `translate(${sizeOffset},${sizeOffset / 2})`);
        
        histoChart.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('fill', '#FFFFFF')
            .attr("transform", `translate(${-sizeOffset},${-sizeOffset / 2})`);

        //Create X Scale
        let xScale = d3.scale.linear()
                .range([0,innerWidth-sizeOffset*1.25])
                .domain([-1, 1]);
    
        //Get maximum and minimum y value
        let yMax = 1;
    
    
        //Create Y Scale
        var yScale = d3.scale.linear()
                .range([innerHeight-sizeOffset,0])
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
                .attr("transform", `translate(${sizeOffset},${innerHeight-sizeOffset})`)
                .call(xAxis);
    
        histoChart.append("g")
                .attr("class", "bis-axisY")
                .attr("transform",`translate(${sizeOffset},0)`)
                .call(yAxis);
        
        
        //Add labels to the chart
        histoChart.append('text')
                .text("Correlation (R)")
                .attr("transform", `translate(${svgWidth/2},${innerHeight})`)
                .attr('class','bis-label');
    
        histoChart.append('text')
                .text("Count")
                .attr("transform", `translate(0,${innerHeight/2})rotate(-90)`)
                .attr('class','bis-label');
    
        //Add legend group to the histogram
        let legend = histoChart.append('g').attr('class','legend');
    
        //Create infobox for hover data if it doesnt exist
        if(!d3.select('.bis-chartInfoBox')[0][0])
            d3.select("body").append('div')
                .attr("class","bis-chartInfoBox");
        
        //-------------------------------------
        //       Generate graph
        //-------------------------------------
        let genGraph = (bins, groupColor, means)=>{
            histoChart.selectAll('.bis-histobar').remove();
            for(let i in bins){
                let bin = bins[i];
                let currBar = histoChart.selectAll(`.g${bin.group.replace(/\s/g,"")}.bis-histobar`).data(bin);
                
                currBar.enter().append("rect")
                        .attr("x", d=>xScale(d.x)+sizeOffset)
                        .attr("transform", `translate(0,${yScale(0)})`)
                        .attr("width", (innerWidth-sizeOffset*1.25)/bin.length)
                        .attr("class", `g${bin.group.replace(/\s/g,"")} bis-histobar`)
                        .attr("fill", groupColor[bin.group])
                        .on("mousemove", function(d) {
                            //Get elements
                            let target = d3.event.target;
                            let info = d3.select('.bis-chartInfoBox');
    
                            //Get height of infobox so that it is above the mouse
                            let heightOffset = $('.bis-chartInfoBox').height();
    
                            //Move the infobox to the pointer
                            info.style('transform',`translate(${d3.event.x}px,${d3.event.y-heightOffset}px)`);
    
                            //If mouse is still on the same element dont update text and style
                            if(info.attr("data-attatched") == target.id) return;
    
                            //Set text
                            info.html(`x:${d.x.toFixed(2)}<br>y:${d.y.toFixed(2)}</br>`);
    
                            //get New Height after text insertion
                            heightOffset = $('.bis-chartInfoBox').height();
    
                            //Change some styles
                            info.style('transform',`translate(${d3.event.x}px,${d3.event.y-heightOffset}px)`);
                            info.style('display',"block");
                            info.style('background-color',groupColor[bin.group]);
    
                            //attatch infobox to element
                            info.attr("data-attatched", target.id);
                        })
                        .on("mouseout", function() {		
                            //hide the box
                            let info = d3.select('.bis-chartInfoBox');
                            info.style('display',"none");
    
                            //Detatch infobox
                            info.attr("data-attatched", 0);
                        }).attr("height",0)
                        .transition().duration(1000).ease('sin-in-out')
                        .attr("height", (d) => innerHeight-sizeOffset-yScale(d.y))
                        .attr("transform", d => `translate(0,${yScale(d.y)})`);
                currBar.exit().remove();
            }
    
            //Sort bars so that smaller ones are in front of the larger ones
            histoChart.selectAll(`.bis-histobar`)
            .sort((a,b)=>{
                return b.y-a.y;
            });
    
            //Add mean lines to the histogram
            histoChart.selectAll('.bis-histoMeanLine').remove();
    
            let meanline = histoChart.selectAll('.bis-histoMeanLine').data(means);
            
            meanline.enter().append('line')
                    .attr("class", d => `g${d.group} bis-histoMeanLine`)
                    .attr("id", d => d.id)
                    .attr("x1", d => xScale(d.value+bins[0][0].dx/2)+sizeOffset)
                    .attr("x2", d => xScale(d.value+bins[0][0].dx/2)+sizeOffset)
                    .attr("y1", yScale(0))
                    .attr("y2", yScale(yMax));
    
            meanline.exit().remove();
    
            //Add the tag displays the mean of each group
            histoChart.selectAll('.meanTag').remove();
    
            let meanTag = histoChart.selectAll('.meanTag').data(means);
    
            meanTag.enter().append('text')
                    .text(d => `Mean: ${d.value.toFixed(2)}`)
                    .attr("fill", d => groupColor[d.group])
                    .attr("transform", d => `translate(${xScale(d.value)+sizeOffset},0)`)
                    .attr('class','meanTag');
    
            meanTag.exit().remove();
    
            //convert object to Object[]
            let groupColorArr = [];
            for(let i in groupColor)
                groupColorArr.push({name:i,color:groupColor[i]});
    
            //Move legend to the front
            legend.each(function(){
                
                this.parentNode.appendChild(this);
            });
    
            //Add a color dot for each group to the legend
            let colorTag = legend.selectAll('.colorTag').data(groupColorArr);
            colorTag.enter().append('circle')
                    .attr('r', 3)
                    .attr('fill', d => d.color)
                    .attr('transform', (d,i) => `translate(${sizeOffset*2},${(i+1)*12})`)
                    .attr('class','colorTag');
    
            colorTag.exit().remove();
    
            //Add a name to the legend for each color dot
            let groupTag = legend.selectAll('.groupTag').data(groupColorArr);
            groupTag.enter().append('text')
                    .text(d=>d.name)
                    .attr('transform', (d,i) => `translate(${sizeOffset*2+5},${(i+1)*12+2})`)
                    .attr('class','groupTag');
                        
            groupTag.exit().remove();
        };
    
        genGraph([], [], []);
    
        $('#histogramChart').bind('changeData', (e, newData)=>{
            let { colors = ['#1995e8','#e81818'], data } = newData;
            
            //Map colors to group names for use in styling
            let groupColor = {};
            let colorCnt = 0;
            for(let group of data.groups){
                    let color;
                    if(!colors[colorCnt])
                        color = `rgb(${Math.random() * 256}, ${Math.random() * 256}, ${Math.random() * 256})`; 
                    else
                        color = colors[colorCnt];
                    colorCnt++;
                    groupColor[group] = color;
            }
    
            //Modify X Scale
            xScale.domain([Math.min(0, d3.min(data.data_array, d => d3.min(d))),d3.max(data.data_array, d=> d3.max(d))*1.025]);
        
            xAxis.scale(xScale);
            histoChart.selectAll('.bis-axisX').call(xAxis);
    
            //Create Histogram Generator
            let hist = d3.layout.histogram()
                        .bins(xScale.ticks(binCnt));
    
            //Create the bins
            let bins = [];
            for(let g in data.data_groups){
                let tempbin = hist(data.data_groups[g]);
                tempbin['group'] = g;
                bins.push(tempbin);
            }
    
            //Get maximum y value
            yMax = d3.max(bins, d1=> d3.max(d1, d => d.length));
    
            //Modify Y Scale
            yScale.domain([0, yMax * 1.025]);
    
            yAxis.scale(yScale);
            histoChart.selectAll('bis-axisY').call(yAxis);
    
    
        
            //calcuale the mean of each datagroup
            let means = [];
            for(let binGroup in bins){
                let a = 0;
                let cnt = 0;
                for(let g of bins[binGroup]){
                    if(g.y > 0){
                        a += g.x;
                        cnt++;
                    }
                }
                means.push({
                    value: a/cnt,
                    group: bins[binGroup].group,
                    id: `avg${cnt}`
                });
            }
        
            genGraph(bins, groupColor, means);
        });

         //On resize
         this.resize = (dim, pos) => {
            console.log('dim', dim, 'pos', pos);
            let svgDim = Math.min(dim[0], dim[1]);
            $('.bis-histogramChart').css('width', `${svgDim}px`);
            $('.bis-histogramChart').css('left', `${pos[0]}px`);

            xAxis.ticks(svgDim / 25);
            histoChart.selectAll('.bis-axisX').call(xAxis);
            yAxis.ticks(svgDim / 25);
            histoChart.selectAll('.bis-axisY').call(yAxis);
        };

    }
}

module.exports = Bisweb_Histogramplot;