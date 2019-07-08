const $=require('jquery');
const bootbox=require('bootbox');
const genericio=require('bis_genericio');
const d3=require('d3');
const webutil=require('bis_webutil');
const saveSvgAsPng=require('save-svg-as-png');
const filesaver = require('FileSaver');

// -------------------------------
// Todo ---
// Which lines pos, neg, both ??
// Need summary by lobe in addition to network?
// nets and matrix fix
// -------------------------------


// -------------------------------
// Global State
// -------------------------------


const globalParams = {
    internal : null,
    displayDialog : null,
    Id : null,
    Id2: null,
    mode : 'chord'
};

const network_colors=[
    "#9ACD32",
    "#377DB8",
    "#F5DEB3",
    "#EE82EE",
    "#40E0D0",
    "#FF6347",
    "#D8BFD8",
    "#D2B48C",
    "#4682B4",
    "#00FF7F",
    "#FFCC22",
];

const filter_modes = [ 'PosDegree', 'NegDegree', 'Sum', 'Difference' ];

var initialize=function(internal) {
    globalParams.internal=internal;
};

// Fix gaps in WSHU network indices
var fixNetworkIndex=function(n) {

    // Yale networks are OK
    if (globalParams.internal.networkAttributeIndex===4)
        return n;
    
    if (n<=1)
        return n;
    if (n<=5)
        return n-1;
    return n-2;
};


// -----------------------------------------------------
// Save as PNG
// -----------------------------------------------------
var saveSnapshot=function(inimglist,initialfilename='snapshot.png') {

    let w=inimglist[0].width;
    let h=inimglist[0].height;
    let x=0;
    
    if (inimglist.length>1) {
        for (let i=1;i<inimglist.length;i++) {
            w+=inimglist[i].width+10;
            if (inimglist[i].height>h)
                h=inimglist[i].height;
        }
        w=w+10;
        x=10;
    }
    
    let outcanvas = document.createElement('canvas');
    outcanvas.width = w;
    outcanvas.height = h;
    
    let ctx = outcanvas.getContext('2d');
    //if (globalParams.mode==='chord') 
    //ctx.fillStyle = "#000000";
    //else
    ctx.fillStyle = "#ffffff";
    ctx.globalCompositeOperation = "source-over";
    ctx.fillRect(0, 0, outcanvas.width, outcanvas.height);


    for (let i=0;i<inimglist.length;i++) {
        let w=inimglist[i].width;
        let h=inimglist[i].height;
        ctx.drawImage(inimglist[i], x, 0, w,h);
        x=x+w+10;
    }

    let outimg = outcanvas.toDataURL("image/png");

    let dispimg = $('<img id="dynamic">');
    dispimg.attr('src', outimg);
    dispimg.width(300);
    
    let a = webutil.creatediv();
    a.append(dispimg);
    
    bootbox.dialog({
        title: 'Save snapshot (size=' + outcanvas.width + 'x' + outcanvas.height + ').<BR> Click SAVE to output as png.',
        message: a.html(),
        buttons: {
            ok: {
                label: "Save To File",
                className: "btn-success",
                callback: function () {
                    let blob = genericio.dataURLToBlob(outimg);
                    if (webutil.inElectronApp()) {
                        let reader = new FileReader();
                        reader.onload = function () {
                            let buf = this.result;
                            let arr = new Int8Array(buf);
                            genericio.write({
                                filename: initialfilename,
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
};

var saveAsPNG = function() {

    const globalw=document.getElementById(globalParams.Id) || null;
    
    
    if (globalw===null) {
        bootbox.alert('Please create a plot before attempting to save it');
        return;
    }

    if (globalParams.mode==='chord')  {
        let par=$('#'+globalParams.Id).parent();
        saveSvgAsPng.svgAsDataUri(par[0], "plot.png").then( (p) => {
            let img = document.createElement('img');
            img.onload=function() { saveSnapshot([img]); };
            img.src=p;
        }).catch( (e) => {
            console.log(e,e.stack);
        });
    } else {
        let par=$('#'+globalParams.Id);
        let par2=$('#'+globalParams.Id2);
        
        saveSvgAsPng.svgAsDataUri(par[0], "plot.png").then( (p) => {
            let img = document.createElement('img');
            img.onload=function() {
                saveSvgAsPng.svgAsDataUri(par2[0], "plot2.png").then( (q) => {
                    let img2 = document.createElement('img');
                    img2.onload=function() {
                        saveSnapshot([img2,img]); };
                    img2.src=q;
                }).catch( (e) => {
                    console.log(e,e.stack);
                });
            };
            img.src=p;
        }).catch( (e) => {
            console.log(e,e.stack);
        });
    }
        
};

// -----------------------------------------------------
// Create Nets and Matrix
// -----------------------------------------------------
var createNets=function() {


    let nets = new Set();
    const rois=globalParams.internal.parcellation.rois;
    console.log('Creating nets attr=',globalParams.internal.networkAttributeIndex);

    for (let i=0;i<rois.length;i++) {
        let n=rois[i].attr[globalParams.internal.networkAttributeIndex];
        nets.add(fixNetworkIndex(n));
    }

    return nets;
};

var createMatrix=function(nets,pairs,symm=false) {

    const parc=globalParams.internal.parcellation;
    const rois=globalParams.internal.parcellation.rois;
    
    let matrix =  new Array(nets.size);
    for(let i = 0; i < nets.size; i++){
        matrix[i] = new Array(nets.size);
        for(let j = 0; j < nets.size; j++){
            matrix[i][j]=0; 
        }
    }
    let n=pairs.length;
    
    for (let index=0;index<n;index++) {
        let a_node=pairs[index][0];
        let b_node=pairs[index][1];
        
        let node=Math.floor(parc.indexmap[a_node]);
        let othernode=Math.floor(parc.indexmap[b_node]);

        let network1=fixNetworkIndex(rois[node].attr[globalParams.internal.networkAttributeIndex]);
        let network2=fixNetworkIndex(rois[othernode].attr[globalParams.internal.networkAttributeIndex]);

        matrix[network1-1][network2-1]+=1;
        if (symm)
            matrix[network2-1][network1-1]+=1;
    }

    if (symm) {
        for(let i = 0; i < nets.size; i++) {
            for(let j = 0; j < nets.size; j++){
                if(j>i)
                    matrix[i][j]=0.01; 
            }
        }
    }
    
    return matrix;
};


var createLinePairsFromLastState=function() {

    let lset=[];
    let linestodraw =globalParams.internal.laststate.linestodraw;

    if (linestodraw == globalParams.internal.gui_Lines[0] ||
        linestodraw == globalParams.internal.gui_Lines[2] ) {
        lset.push(globalParams.internal.conndata.createLinePairs(0,globalParams.internal.laststate.matrixthreshold));

    }
    if (linestodraw == globalParams.internal.gui_Lines[1] ||
        linestodraw == globalParams.internal.gui_Lines[2] ) {
        lset.push(globalParams.internal.conndata.createLinePairs(1,globalParams.internal.laststate.matrixthreshold));

    }

    if (lset.length<2)
        return lset[0];

    return lset[0].concat(lset[1]);
};

// -----------------------------------------------------
// Create and Destroy Dialog
// -----------------------------------------------------

var destroyDisplayDialog=function() {
    if (globalParams.displayDialog) {
        if (globalParams.displayDialog.getContainingFrame()) {
            globalParams.displayDialog.getContainingFrame().remove();
        }
        globalParams.displayDialog=null;
    }
};

var createDisplayDialog=function(name,height=-1,width=-1) {


    let canvas=globalParams.internal.layoutmanager.getcanvas();
    let dim = [parseInt(canvas.width) - 100, parseInt(canvas.height) - 100];
    if (height>0)
        dim[1]=height;
    if (width>0)
        dim[0]=width;
    if (globalParams.displayDialog) {
        destroyDisplayDialog();
    }

    let linestodraw =globalParams.internal.laststate.linestodraw;
    name+=' (mode='+linestodraw+')';
    
    globalParams.displayDialog = webutil.createdialog(name, dim[0], dim[1], 0, 0, 800,false);
    globalParams.displayDialog.setCloseCallback( () => { destroyDisplayDialog(); });
    globalParams.displayDialog.removeCloseButton();
    
    webutil.createbutton({
        name: 'Export as PNG',
        type: "info",
        parent: globalParams.displayDialog.getFooter(),
    }).click( (e) => {
        e.preventDefault();
        saveAsPNG();
    });
    
    
    return dim;
};
// -----------------------------------------------------
//
// Javid's added code
//
// -----------------------------------------------------


// -------------------------------------------------------------------------------------------
//
// Chords Code
//
// -------------------------------------------------------------------------------------------
var createChordsSVG=function(parentDiv,parc,pairs,dim) {
    
    if (parc===null || pairs===null ) {
        console.log("Bad inputs in createChordSVG");
        return 0;
    }

    globalParams.Id=webutil.getuniqueid();
    
    let width = dim[0] - 50,
        height = dim[1] - 150;
    let svgWidth = width,
        svgHeight = height,
        outerRadius = Math.min(svgWidth, svgHeight) / 2 - 10,
        innerRadius = outerRadius - 24;
    
    let formatPercent = d3.format(".1%");
    
    let arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);
    
    let layout = d3.layout.chord()
        .padding(.04)
        .sortSubgroups(d3.descending)
        .sortChords(d3.ascending);
    
    let path = d3.svg.chord()
        .radius(innerRadius);
    
    let svg = d3.select(parentDiv[0]).append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .append("g")
        .attr("id", globalParams.Id)
        .attr("transform", "translate(" + svgWidth / 2 + "," + svgHeight / 2 + ")");
    
    svg.append(globalParams.Id)
        .attr("r", outerRadius);

    //var connectome = [];
    //        var net_map = {};
    //var matrix = [];
    //        var nets = new Set();

    const nets=createNets();
    const matrix=createMatrix(nets,pairs);
    let network_labels= [];
    for (let i=0;i<globalParams.internal.gui_Networks_Names.length;i++) {
        network_labels.push({
            "name" : globalParams.internal.gui_Networks_Names[i],
            "color": network_colors[i],
        });
    }

    layout.matrix(matrix);
    
    // Add a group per neighborhood.
    let group = svg.selectAll(".group")
        .data(layout.groups)
        .enter().append("g")
        .attr("class", "group")
        .on("mouseover", mouseover);
    
    // Add the group arc.
    let groupPath = group.append("path")
        .attr("id", function(d, i) { return "group" + i; })
        .attr("d", arc)
        .style("fill", function(d, i) { return network_labels[i].color; });
    
    // Add a text label.
    let groupText = group.append("text")
        .attr("x", 6)
        .attr("dy", 15)
        .style("text-align", "center");
    
    groupText.append("textPath")
        .attr("xlink:href", function(d, i) { return "#group" + i; })
        .text(function(d, i) { return network_labels[i].name; });
    
    // Remove the labels that don't fit. :(
    groupText.filter(function(d, i) { return groupPath[0][i].getTotalLength() / 2 - 16 < this.getComputedTextLength(); })
        .remove();
    
    // Create the fill gradient for the chords (based on https://bl.ocks.org/JulienAssouline/2847e100ac7d4d3981b0f49111e185fe)
    function getGradID(d){ return "linkGrad-" + d.source.index + "-" + d.target.index; }
    
    let grads = svg.append("defs")
        .selectAll("linearGradient")
        .data(layout.chords)
        .enter()
        .append("linearGradient")
        .attr("id", getGradID)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", function(d){ return innerRadius * Math.cos((d.source.endAngle-d.source.startAngle) / 2 + d.source.startAngle - Math.PI/2); })
        .attr("y1", function(d){ return innerRadius * Math.sin((d.source.endAngle-d.source.startAngle) / 2 + d.source.startAngle - Math.PI/2); })
        .attr("x2", function(d){ return innerRadius * Math.cos((d.target.endAngle-d.target.startAngle) / 2 + d.target.startAngle - Math.PI/2); })
        .attr("y2", function(d){ return innerRadius * Math.sin((d.target.endAngle-d.target.startAngle) / 2 + d.target.startAngle - Math.PI/2); });
    
    // Set the starting color (at 0%)
    grads.append("stop")
        .attr("offset", "-50%")
        .attr("stop-color", function(d){ return network_labels[d.source.index].color;});
    
    // Set the ending color (at 100%)
    grads.append("stop")
        .attr("offset", "150%")
        .attr("stop-color", function(d){ return network_labels[d.target.index].color;});
    
    
    // Add the chords 
    let chord = svg.selectAll(".chord")
        .data(layout.chords)
        .enter()
        .append("path")
        .attr("class", function(d) {
            // The first chord allows us to select all of them. The second chord allows us to select each individual one. 
            return "chord chord-" + d.source.index + " chord-" + d.target.index;
        })  
        .style("fill", function(d){ return "url(#" + getGradID(d) + ")"; })
        .attr("d", path);
    
    // Add an elaborate mouseover title for each chord.
    chord.append("title").text(function(d) {
        return network_labels[d.source.index].name
            + " → " + network_labels[d.target.index].name
            + ": " + formatPercent(d.source.value)
            + "\n" + network_labels[d.target.index].name
            + " → " + network_labels[d.source.index].name
            + ": " + formatPercent(d.target.value);
    });
    
    function mouseover(d, i) {
        chord.classed("fade", function(p) {
            return p.source.index != i
                && p.target.index != i;
        });
    }
    
    return svg;
};


var drawchords = function() {

    if (globalParams.internal.laststate === null) {
        bootbox.alert('Please create lines before attempting to draw a chord diagram');
        return;
    }
    
    let name = 'All Chords';
    if (globalParams.internal.laststate.guimode!=='All') {
        name='Chords for '+globalParams.internal.laststate.guimode;
    }
    let dim=createDisplayDialog(name);

    let linePairs=createLinePairsFromLastState();
    let svgModal=globalParams.displayDialog.getWidgetBase();

    svgModal.css({'background-color':"#ffffff"});
    
    globalParams.mode='chord';
    
    // This call returns svg
    createChordsSVG(svgModal,
                    globalParams.internal.parcellation,
                    linePairs,
                    dim);

    globalParams.displayDialog.show();
};

// -------------------------------------------------------------------------------------------
// Correlation Map Code
// -------------------------------------------------------------------------------------------
var createCorrMapSVG=function(parentDiv,
                              svgWidth,svgHeight,
                              id1,id2,parc,pairs) {


    globalParams.Id=webutil.getuniqueid();
    globalParams.Id2=webutil.getuniqueid();
    
    const nets=createNets();
    const margin = {top: 50, right: 50, bottom: 50, left: 50};
    const width = 350;
    const height = 350;
    const data = createMatrix(nets,pairs,true);
    const labelsData = globalParams.internal.gui_Networks_ShortNames;
    let startColor = '#ffffff';
    let endColor =  '#ff0000';
    let linestodraw =globalParams.internal.laststate.linestodraw;
    if (linestodraw == globalParams.internal.gui_Lines[2] ) {
        endColor="#ff8800";
    } else if (linestodraw == globalParams.internal.gui_Lines[1] ) {
        endColor =  '#0044ff';
    }    

    
    
    const widthLegend = 100;
    
    if(!data){
        throw new Error('Please pass data');
    }
    
    if(!Array.isArray(data) || !data.length || !Array.isArray(data[0])){
        throw new Error('It should be a 2-D array');
    }
    
    let maxValue = d3.max(data, function(layer) { return d3.max(layer, function(d) { return d; }); });
    let minValue = d3.min(data, function(layer) { return d3.min(layer, function(d) { return d; }); });
    
    let numrows = data.length;
    let numcols = data[0].length;
    
    let svg = d3.select(parentDiv).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("id", globalParams.Id)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    //            var background =
    svg.append("rect")
        .style("stroke", "white")
        .style("stroke-width", "2px")
        .attr("width", width)
        .attr("height", height);
    
    let x = d3.scale.ordinal()
        .domain(d3.range(numcols))
        .rangeBands([0, width]);
    
    let y = d3.scale.ordinal()
        .domain(d3.range(numrows))
        .rangeBands([0, height]);
    
    let colorMap = d3.scale.linear()
        .domain([minValue,maxValue])
        .range([startColor, endColor]);
    
    let row = svg.selectAll(".row")
        .data(data)
        .enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) {return "translate(0," + y(i) + ")"; });
    
    let cell = row.selectAll(".cell")
        .data(function(d) { return d; })
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", function(d, i) { return "translate(" + x(i) + ", 0)"; });
    
    cell.append('rect')
        .attr("width", x.rangeBand())
        .attr("height", y.rangeBand())
        .style("stroke-width", 0);
    
    cell.append("text")
        .attr("dy", ".32em")
        .attr("x", x.rangeBand() / 2)
        .attr("y", y.rangeBand() / 2)
        .attr("text-anchor", "middle")
        .style("fill", function(d) {if(d== 0.01) return  'white';return d >= maxValue/2 ? 'white' : 'black'; })
        .text(function(d) { return d; });
    
    row.selectAll(".cell")
        .data(function(d, i) { return data[i]; })
        .style("fill", colorMap);
    
    let labels = svg.append('g')
        .attr('class', "labels");
    
    let columnLabels = labels.selectAll(".column-label")
        .data(labelsData)
        .enter().append("g")
        .attr("class", "column-label")
        .attr("transform", function(d, i) { return "translate(" + x(i) + "," + height + ")"; });
    
    columnLabels.append("line")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .attr("x1", x.rangeBand() / 2)
        .attr("x2", x.rangeBand() / 2)
        .attr("y1", 0)
        .attr("y2", 5);
    
    columnLabels.append("text")
        .attr("x", 0)
        .attr("y", y.rangeBand() / 2)
        .attr("dy", ".82em")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-60)")
        .text(function(d) { return d; });
    
    let rowLabels = labels.selectAll(".row-label")
        .data(labelsData)
        .enter().append("g")
        .attr("class", "row-label")
        .attr("transform", function(d, i) { return "translate(" + 0 + "," + y(i) + ")"; });
    
    rowLabels.append("line")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .attr("x1", 0)
        .attr("x2", -5)
        .attr("y1", y.rangeBand() / 2)
        .attr("y2", y.rangeBand() / 2);
    
    rowLabels.append("text")
        .attr("x", -8)
        .attr("y", y.rangeBand() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "end")
        .text(function(d) { return d; });
    
    let key = d3.select("#"+id2)
        .append("svg")
        .attr("id",globalParams.Id2)
        .attr("width", widthLegend)
        .attr("height", height + margin.top + margin.bottom);
    
    let legend = key
        .append("defs")
        .append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "100%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");
    
    legend
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", endColor)
        .attr("stop-opacity", 1);
    
    legend
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", startColor)
        .attr("stop-opacity", 1);
    
    key.append("rect")
        .attr("width", widthLegend/2-10)
        .attr("height", height)
        .style("fill", "url(#gradient)")
        .attr("transform", "translate(0," + margin.top + ")");
    
    y = d3.scale.linear()
        .range([height, 0])
        .domain([minValue, maxValue]);
    
    let yAxis = d3.svg.axis()
        .scale(y)
        .orient("right");
    
    key.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(41," + margin.top + ")")
        .call(yAxis);
    return svg;
};

// ------------------------------------------------------------------------------
//
//  Corr Map Table
//
// ------------------------------------------------------------------------------

var corrmap = function() {
    
    if (globalParams.internal.laststate === null) {
        bootbox.alert('Please create lines before attempting to draw a chord diagram');
        return;
    }

    let name = 'All Nodes';
    if (globalParams.internal.laststate.guimode !=='All') {
        name='Heatmap for '+globalParams.internal.laststate.guimode;
    }
    let dim=createDisplayDialog(name,650,650);
    


    let svgModal=globalParams.displayDialog.getWidgetBase();
    let linePairs=createLinePairsFromLastState();
    let id1=webutil.getuniqueid();
    let id2=webutil.getuniqueid();
    
    let container=$(`<div style="display:inline-block; float:right" id="${id1}"></div>`);
    svgModal.append(container);
    let legend=$(`<div style="display:inline-block; float:left" id="${id2}"></div>`);
    svgModal.append(legend);
    
    svgModal.css({'background-color':"#ffffff"});

    globalParams.mode='corr';
    
    createCorrMapSVG(svgModal[0],
                     dim[0],dim[1],
                     id1,id2,
                     globalParams.internal.parcellation,
                     linePairs);

    
    globalParams.displayDialog.show();
};

// ------------------------------------------------------------------------------
// Regular 2D Lines
// ------------------------------------------------------------------------------

var createlines = function() {

    if (globalParams.internal.conndata.statMatrix===null) {
        bootbox.alert('No connectivity data loaded');
        return;
    }


    let getKeyByValue = function( obj,value,base ) {
        for( let prop in obj ) {
            if( obj.hasOwnProperty( prop ) ) {
                if( obj[prop ] === value )
                    return prop;
            }
        }
        return base;
    };
    globalParams.internal.lastopisclear = false;
    //          globalParams.internal.parcellation.drawCircles(globalParams.internal.context);
    
    
    
    let mode=2;
    if (globalParams.internal.parameters.mode===globalParams.internal.gui_Modes[0]) // All
        mode=0;
    if (globalParams.internal.parameters.mode==globalParams.internal.gui_Modes[1]) // Single Node
        mode=1;

    let singlevalue=-1,attribcomponent=0;
    if (mode === 1) {
        singlevalue=Math.round(globalParams.internal.parameters.node)-1;
        //          console.log('GUI Input singlevalue='+singlevalue+' HUMAN = '+(singlevalue+1));
    } else if (mode===2 ) {
        if (globalParams.internal.parameters.mode===globalParams.internal.gui_Modes[2]) { // Lobe
            attribcomponent=0;
            singlevalue=getKeyByValue(globalParams.internal.gui_Lobes,globalParams.internal.parameters.lobe,1);
        } else {
            // Siwtch this to xilin networks 2->4
            attribcomponent=globalParams.internal.networkAttributeIndex;
            singlevalue=getKeyByValue(globalParams.internal.gui_Networks,globalParams.internal.parameters.network,1);
        }
    }
    

    let degreethreshold=Math.round(globalParams.internal.parameters.degreethreshold);
    let matrixthreshold=globalParams.internal.parameters.matrixthreshold;
    let filter=filter_modes.indexOf(globalParams.internal.parameters.filter);
    if (filter<0)
        filter=2;
    console.log('Filter',filter);
    
    let state = { mode: mode,
                  guimode : globalParams.internal.parameters.mode,
                  node : globalParams.internal.parameters.node,
                  lobe : globalParams.internal.parameters.lobe,
                  network : globalParams.internal.parameters.network,
                  degreethreshold : degreethreshold,
                  poscolor : globalParams.internal.parameters.poscolor,
                  negcolor : globalParams.internal.parameters.negcolor,
                  length : globalParams.internal.parameters.length,
                  thickness: globalParams.internal.parameters.thickness,
                  linestodraw : globalParams.internal.parameters.linestodraw,
                  opacity : globalParams.internal.parameters.opacity,
                  singlevalue: singlevalue,
                  attribcomponent : attribcomponent,
                  filter: filter,
                  radius : globalParams.internal.parameters.radius,
                  matrixthreshold : matrixthreshold};

    if (globalParams.internal.hadlinesonce)
        globalParams.internal.addStateToUndo();
    globalParams.internal.hadlinesonce=true;
    globalParams.internal.linestack.push(state);
    globalParams.internal.updateFn();
};

var drawlines=function(state) {

    let ok=globalParams.internal.conndata.createFlagMatrix(globalParams.internal.parcellation,
                                              state.mode, // mode
                                              state.singlevalue, // singlevalue
                                              state.attribcomponent, // attribcomponent
                                              state.degreethreshold, // metric threshold
                                              state.filter); // sum

    if (ok===0) {
        bootbox.alert('Failed to create flag matrix for connectivity data!');
        return 0;
    }
    

    let total=0;

    if (state.linestodraw == globalParams.internal.gui_Lines[0] ||
        state.linestodraw == globalParams.internal.gui_Lines[2] ) {
        let pos=globalParams.internal.conndata.createLinePairs(0,state.matrixthreshold);
        //console.log('\n\n +++ Created '+pos.length+' positive linepairs\n'+JSON.stringify(pos));
        total+=pos.length;
        globalParams.internal.conndata.drawLines(globalParams.internal.parcellation,pos,
                                    state.poscolor,
                                    globalParams.internal.context,
                                    state.length*globalParams.internal.parcellation.scalefactor,
                                    state.thickness);
    }
    if (state.linestodraw == globalParams.internal.gui_Lines[1] ||
        state.linestodraw == globalParams.internal.gui_Lines[2] ) {

        let neg=globalParams.internal.conndata.createLinePairs(1,state.matrixthreshold);
        //          console.log('+++ Created '+neg.length+' negagive linepairs\n'+JSON.stringify(neg)+'\n');
        total+=neg.length;
        globalParams.internal.conndata.drawLines(globalParams.internal.parcellation,neg,
                                    state.negcolor,
                                    globalParams.internal.context,
                                    state.length*globalParams.internal.parcellation.scalefactor,
                                    state.thickness);
    }

    globalParams.internal.laststate = state;
    
    if (total===0)
        return -1;
    return total;
};


var removelines = function() {
    if (globalParams.internal.conndata.statMatrix===null) {
        bootbox.alert('No connectivity data loaded');
        return;
    }

    globalParams.internal.addStateToUndo();
    globalParams.internal.linestack = [];
    globalParams.internal.updateFn();
};



// ----------------------------------
// export stuf
// ----------------------------------
module.exports = {
    initialize : initialize,
    drawchords : drawchords,
    corrmap : corrmap,
    createlines : createlines,
    drawlines : drawlines,
    removelines : removelines,
    filter_modes : filter_modes,
};
