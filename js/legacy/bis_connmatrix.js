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

/** 
 * @file Browser or Node.js module. Contains {@link ConnMatrix}.
 * @author Xenios Papademetris
 * @version 1.0
 */


"use strict";

const util=require('bis_util');
const numeric=require('numeric');
const d3=require('d3');
const bis_webutil = require('bis_webutil.js');

// -------------------------------------------------------------------------
// First ConnMatrix Structure
// -------------------------------------------------------------------------

/** A class for storing and manipulating a pair of connectivity matrices.
 * @class ConnMatrix 
 */
class ConnMatrix {

	constructor() {
		this.offset=50.0;
		this.posMatrix=null;
		this.negMatrix=null;
		this.statMatrix=null;
		this.flagMatrix=null;
		this.hasnegMatrix=false;

		this.posImageData = [null,null];
		this.negImageData = [null,null];

		this.maxsum =0;
		this.maxsumnode=-1;
	}

	/** cleans a string and convers all commas,tabs and spaces into commas, and then mutiple commas to single commas. This is used to map a randomly delimited text file into csv
	@returns {string} comma delimited string
	*/
	cleanup() {
		this.posMatrix=null;
		this.negMatrix=null;
		this.statMatrix=null;
		this.flagMatrix=null;
		this.hasnegMatrix=false;
		this.posImageData=[null,null];
		this.negImageData=[null,null];
	}

	/** Load rois from text string
	 * @param {string} inpstring - input string
	 * @param {number} mode -  0=positive,1=negative
	 * @param {string} filename -  filename of original file
	 * @param {callback} doerror -  function to call if error 
	 * @return {number} rows - the number of rows in matrix
	 */
	parsematrix(inpstring,mode,filename,doerror) {

		console.log('\n\n\n+++++ Parsing matrix '+mode+' from '+filename);


		if (mode!==0 && this.posMatrix===null) {
			doerror('Read Positive Matrix first before reading negative matrix');
			return 0;
		}

		var out_lines=null;
		try {
			out_lines=util.parseMatrix(inpstring,filename,true);
		} catch(e) {
			doerror(e);
			return;
		}

		var numcols=out_lines.length,j=0,i=0;

		console.log('+++++ Read square matrix of size '+numcols+'*'+numcols);

		if (mode!==0) {
			var npos=numeric.dim(this.posMatrix)[0];
			if (npos!==numcols) {
				doerror('Negative matrix read '+[numcols,numcols]+' has differnt dimensions from positive matrix '+[npos,npos]);
				return 0;
			}
		}


		var matrix=util.zero(numcols,numcols);
		for (i=0;i<numcols;i++) {
			for (j=0;j<numcols;j++)
				matrix[i][j]=Number.parseFloat(out_lines[i][j]);
		}

		if (mode===0) {
			this.posMatrix=matrix;

			if (this.hasnegMatrix===true) {
				doerror('Reading a new positive matrix clears the old negative matrix from memory');
			}
			this.negMatrix=null;
			this.hasnegMatrix=false;
			this.posImagedata = [null,null];
			this.negImagedata = [null,null];
		} else {
			this.negMatrix=matrix;
			this.hasnegMatrix=true;
			this.negImagedata = [null,null];
		}

		return this.createMeasureMatrix();
	}

	/** set actual matrices directly 
	 * @param{NumericJSMatrix} mat1 -- the positive matrix
	 * @param{NumericJSMatrix} mat2 -- the negative matrix
	 */
	setMatrices(mat1,mat2) {

		this.posMatrix=mat1 || null;
		this.negMatrix=mat2 || null;

		if (this.negMatrix)
			this.hasnegMatrix=true;
		else
			this.hasnegMatrix=false;


		this.posImagedata = [null,null];
		this.negImagedata = [null,null];
		return this.createMeasureMatrix();
	}


	/** Create Measure Matrix
	*/

	/** Creates the Measure matrix which is a matrix of size numnodes*4.
	 * The first column is the `positive' degree, the second column the 'negative' degree,
	 * the third, the total (sum) degree and fourth the difference degree.
	 * These are effectively weighted degrees as we just add the matrix
	 * @return {number} rows - the number of rows in this.tatMatrix (or 0 if failed)
	 */
	createMeasureMatrix() {

		if (this.posMatrix===null) {
			console.log("Need pos matrix to be loaded");
			this.flagMatrix=null;
			this.statMatrix=null;
			return 0;
		}

		var numnodes=numeric.dim(this.posMatrix)[0];
		console.log('+++++ creating measure meatrix numnodes='+numnodes);

		if (this.negMatrix===null) 
			this.negMatrix=util.zero(numnodes,numnodes);
		this.statMatrix=util.zero(numnodes,4);

		var maxsum=0.0;
		var maxnode=-1;
		for (var row=0;row<numnodes;row++) {
			var sumpos=0.0;
			var sumneg=0.0;
			for (var col=0;col<numnodes;col++) {
				sumpos+=Math.abs(this.posMatrix[row][col]);
				sumneg+=Math.abs(this.negMatrix[row][col]);
			}
			this.statMatrix[row][0]=sumpos;
			this.statMatrix[row][1]=sumneg;
			this.statMatrix[row][2]=sumpos+sumneg;
			this.statMatrix[row][3]=sumpos-sumneg;
			if (this.statMatrix[row][2]>maxsum){
				maxsum=this.statMatrix[row][2];
				maxnode=row;
			}
		}
		console.log('+++++ Done computing sums, maxsum='+maxsum+' at node='+maxnode);
		this.maxsum =maxsum;
		this.maxsumnode=maxnode;
		return numnodes;
	}

	/** Get Nodes sorted by degree
	@param {number} index - degree to use: 0=pos,1=neg,2=sum,3=diff, (default=2)
	 * @memberof ConnMatrix.prototype
	 * @return {array} nodes sorted by degree
	 */
	getSortedNodesByDegree(index) {

		if (this.statMatrix===null) {
			console.log('Stat Matrix is null\n');
			return 0;
		}

		if (index === undefined)
			index=2;
		index=util.range(index,0,3);

		var arr=[];
		var np=numeric.dim(this.statMatrix)[0];
		for (var i=0;i<np;i++) {
			var val=this.statMatrix[i][index];
			arr.push({ node: i, degree:val });
		}

		var compareelements=function(a,b) {
			if (a.degree<b.degree)
				return -1;
			if (a.degree>b.degree)
				return 1;
			return 0;
		};
		arr.sort(compareelements);
		return arr;
	}

	/** Creates the Flag  a matrix of size numnodes*2 in preparation for drawing line pairs.
	 * Column 1 is for positive matrix and column 2 for negative matrix.
	 * Each element takes value 2 -- must use (used in cases where mode=1 and this is the node),
	 * mode=1 -- include this node as it satisfies the criteria
	 * mode=0 -- exclude this node
	 * @param {Parcellation} parc -  the underlying parcellation object
	 * @param {number} mode -  0=all nodes,1=single node ,2=singleattribute
	 * @param {number} singlevalue -  the node (if mode=1) or value of attribute (mode=2) to use
	 * @param {number} attribcomponent - which attribute to use for filtering (if mode==2). Typically 0=lobe, 2=network and 3=BA area
	 * @param {number} degreethreshold - if mode!=1 then this is the degree threshold >= this we set the flag to 1.
	 * &param {number} incolumn -- which degree measure to use for thresholding. Default=2 (SUM)
	 * @return {number} success - 0 if failed, 1 if success
	 */
	createFlagMatrix(parc,
		mode, //0=all,1=singlenode,2=singleattribute,
		singlevalue, // if mode=1 or 2 specify node or lobe or network
		attribcomponent,
		degreethreshold,
		in_column) {// select which degree to use default=2 sum) 

		if (this.statMatrix===null) {
			console.log('Stat Matrix is null\n');
			return 0;
		}


		var debug=0;
		var np=numeric.dim(this.statMatrix)[0];
		var np2=parc.rois.length;
		var numcomp=parc.rois[0].attr.length;

		if (np2!=np) {
			console.log("Different matrix size="+np+" and parcellation numnodes="+np2);
			this.flagMatrix=null;
			return 0;
		}

		//var s= [ "Pos", "Neg","Sum","Diff" ];
		//var s2= [ "Lobe","EBA","Network","Broadmann","","",""];

		console.log('+++++ Drawing lines, mode='+mode+' singlevalue='+singlevalue+', attribcomponent='+attribcomponent);

		this.flagMatrix=util.zero(np,4);

		// Fix column
		var column=util.range(in_column,0,3);
		var component=util.range(attribcomponent,0,numcomp);
		if (component===1)
		component=3;

		var compvalue=0;
		if (mode===1)
		compvalue=util.range(singlevalue,0,np-1);
		else
		compvalue=singlevalue;


		var maxsum=this.statMatrix[0][column];
		var i=0;
		for (i=1;i<np;i++) 
		maxsum=Math.max(maxsum, this.statMatrix[i][column]);

		//console.log("+++++ Maximum Number of Connections in column "+s[column]+" = "+maxsum+" degreethreshold="+degreethreshold);
		if (degreethreshold>maxsum) {
			console.log("+++++ Reducing degreethreshold to "+maxsum);
			degreethreshold=maxsum;
		}

		var row=0,att=0,v=0,ia,col=0;

		if (mode===2) {
			compvalue=Math.floor(compvalue);
			//              console.log("+++++ Filtering by connection strength (column= "+s[column]+" > "+degreethreshold+") AND "+s2[component]+"="+compvalue+' rows='+np);
			for (row=0;row<np;row++) {
				att=Math.floor(parc.rois[row].attr[component]);
				v=this.statMatrix[row][column];
				if (row%10===0 && debug>0)
					console.log('row='+row+'\t v='+v+'\tdesired='+compvalue+'\tactual='+att+', all_att='+parc.rois[row].attr);


				if (att===compvalue && v>=degreethreshold) {
					for (ia=0;ia<=3;ia++)
						this.flagMatrix[row][ia]=2;

					if (debug>0)
						console.log("\t\t Node "+row+" qualifies as 2");
				}
			}
		} else if (mode===1) {
			for (ia=0;ia<=3;ia++)
				this.flagMatrix[compvalue][ia]=2;
			//              console.log("+++++ Filtering based on singlenode="+compvalue+1+", totals: pos="+this.statMatrix[compvalue][0]+", neg="+this.statMatrix[compvalue][1]);
		} else {
			//  console.log("Filtering by just connection strength (column= "+s[column]+" > "+degreethreshold);
			for (row=0;row<np;row++) {

				v=this.statMatrix[row][column];

				if (v>=degreethreshold) {
					if (debug>0) 
						console.log("\t\t Node "+row+" qualifies v="+v+" vs threshold="+degreethreshold+' raw='+this.statMatrix[row]);
					for (ia=0;ia<=3;ia++)
						this.flagMatrix[row][ia]=2;
				}
			}
		}

		//          console.log('Now set connections '+np);

		// Now set connections of connections
		// 2=I belong,1 = I belong because I have a friend that does
		var num = [ 0,0,0];
		for (row=0;row<np;row++)   {
			if (this.flagMatrix[row][0]<2) {
				for (col=0;col<np;col++) {
					if (this.flagMatrix[col][0]>1) {
						var v1=this.posMatrix[row][col];
						if (v1<0)
							v1=-v1;
						var v2=this.negMatrix[row][col];
						if (v2<0)
							v2=-v2;
						var v3=v1+v2;
						if (v1>0.0) 
							this.flagMatrix[row][0]=1;
						if (v2>0.0)
							this.flagMatrix[row][1]=1;
						if (v3>0.0) {
							this.flagMatrix[row][2]=1;  
							this.flagMatrix[row][3]=1;
						}
					}
				}
			}
			v=util.range(this.flagMatrix[row][2],0,2);
			num[v]=num[v]+1;
		}
		//          console.log("\t\t Stats : Exluded Nodes="+num[0]+", Neighbor nodes="+num[1]+", core nodes="+num[2]);
		return 1;
	}

	/** Use the current flag matrix to create line pairs
	 * @param {number} negative - (if 1 or true use negative matrix, else positive matrix)
	 * @param {number} matrixthreshold - if value in connection matrix is >= this, line is added. For binary matrices just use 1.
	 * @return {array} [ [node1,node2 ], [ node1,node2 ] -- array of nodepairs to drawlines
	 */
	createLinePairs(negative,matrixthreshold) {

		if (negative === 1 || negative===true)
			negative=true;
		else
			negative=false;

		if (this.posMatrix===null ||
			this.negMatrix===null ||
			this.statMatrix===null ||
			this.flagMatrix===null) {
			console.log('Bad Matrices');
			return [];
		}



		var n=numeric.dim(this.posMatrix)[0];
		var n2=numeric.dim(this.negMatrix)[0];
		var n3=numeric.dim(this.statMatrix)[0];
		var n4=numeric.dim(this.flagMatrix)[0];

		if ( n!=n2 || n!=n3 || n!=n4) {
			console.log("Bad matrix dimensions cannot create lines. ("+[n,n2,n3,n4]+")");
			return null;
		}

		var output=[];

		var column=0;
		if (negative)
			column=1;

		//console.log("+++++ Creating Line pairs numnodes="+n+" column="+column+' val(matrix) threshold > abs('+matrixthreshold+')');

		for (var row=0;row<n-1;row++) {
			var rowval=this.flagMatrix[row][column];

			for (var col=row+1;col<n;col++) {    
				var colval=this.flagMatrix[col][column];

				if ((rowval+colval)>2) {              
					var v=0.0;
					if (negative)
						v=this.negMatrix[row][col];
					else
						v=this.posMatrix[row][col];

					v=Math.abs(v);
					if (v>=matrixthreshold) {
						output.push([row,col]);
					}

				}
			}
		}
		return output;
	}

	/** draw lines connecting nodes in parcellation on canvas whose context is set
	 * @param {Parcellation} parc - the underlying parcellation
	 * @param {array} pairs -- the line pairs created by {@link ConnMatrix.createLinePairs}
	 * @param {string} scolor - the color to draw
	 * @param {CanvasContext2D} context - the context in which to draw
	 * @param {number} normallegnth - length of normal for lines
	 * @param {number} thickness - thickness 
	 * @return {number} number of lines drawn
	 */
	drawLines(parc,pairs,scolor,context,normallength,thickness) {

		if (parc===null || pairs===null || context===null) {
			console.log("Bad inputs in drawLines");
			return 0;
		}

		var n=pairs.length;
		for (var index=0;index<n;index++) {
			var a_node=pairs[index][0];
			var b_node=pairs[index][1];
			var node=Math.floor(parc.indexmap[a_node]);
			var othernode=Math.floor(parc.indexmap[b_node]);

			var x1=parc.rois[node].cx, y1=parc.rois[node].cy;
			var n1=parc.rois[node].nx, n2=parc.rois[node].ny;
			var x2=x1-normallength*n1, y2=y1-normallength*n2 ;
			var x4=parc.rois[othernode].cx, y4=parc.rois[othernode].cy;
			var n3=parc.rois[othernode].nx, n4=parc.rois[othernode].ny;
			var x3=x4-normallength*n3, y3=y4-normallength*n4;
			if (y2<0 || y3<0) {
				console.log("error in adding $node,$othernode "+[x1,y1,n1,n2]+', '+[x2,y2]+', '+[x3,y3]+', '+[x4,y4,n3,n4]);
			}

			context.strokeStyle=scolor;
			context.linewidth=thickness;
			context.beginPath();
			context.moveTo(x1,y1);
			context.bezierCurveTo(x2,y2,x3,y3,x4,y4);
			context.stroke();
			//console.log(x1,y1,x2,y2,x3,y3,x4,y4);
		}
	}

    //didn't remove the unused parameters because they might be used later? 
	// -Zach
	plotCorrMap(parc,pairs,scolor,context,normallength,thickness) {
		/*function readTextFile(file){
			var rawFile = new XMLHttpRequest();
			rawFile.open("GET", file, false);
			var matrix ;
			rawFile.onreadystatechange = function ()
			{
				if(rawFile.readyState === 4)
				{
					if(rawFile.status === 200 || rawFile.status == 0)
					{
						var rows = rawFile.responseText.split('\n');
						matrix = new Array(rows.length-1);
						for(i=0;i<rows.length-1;i++){
							matrix[i] = new Array(rows.length-1);
							tokens = rows[i].split(',');
							for(j=0;j<rows.length-1;j++){
								matrix[i][j]=parseInt(tokens[j]);
							}

						}
					}
				}
			}
			rawFile.send(null);
			return matrix;
		}*/
		//var correlationMatrix = readTextFile('data/heatMat.mask.NBSFDR.ucla.175.antiDepression.csv');
		var correlationMatrix = [
			[1, 0.3, 0, 0.8, 0, 0.2, 1, 0.5, 0, 0.75],
			[0.3, 1, 0.5, 0.2, 0.4, 0.3, 0.8, 0.1, 1, 0],
			[0, 0.5, 1, 0.4, 0, 0.9, 0, 0.2, 1, 0.3],
			[0.8, 0.2, 0.4, 1, 0.3, 0.4, 0.1, 1, 0.2, 0.9],
			[0, 0.4, 0, 0.3, 1, 0.1, 0.4, 0, 0.6, 0.7],
			[0.2, 0.3, 0.9, 0.4, 0.1, 1, 0, 0.1, 0.4, 0.1],
			[1, 0.8, 0, 0.1, 0.4, 0, 1, 0.5, 0, 1],
			[0.5, 0.1, 0.2, 1, 0.1, 0, 0.5, 1, 0, 0.4],
			[0, 1, 1, 0.2, 0.6, 0.4, 0, 0, 1, 0.6],
			[0.75, 0, 0.3, 0.9, 0.7, 0.1, 1, 0.4, 0.6, 1]
		];

		var labels = ['MF', 'FP', 'DMN', 'Mot', 'VI', 'VII', 'VAs', 'Limb', 'BG', 'CBL'];

		
		/*var arc = d3.svg.arc()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius);

		var layout = d3.layout.chord()
			.padding(.04)
			.sortSubgroups(d3.descending)
			.sortChords(d3.ascending);

		var path = d3.svg.chord()
			.radius(innerRadius);
		*/
		/*var svg = d3.select('.modal-body').append("svg")
			.attr("width", svgWidth)
			.attr("height", svgHeight)
			.append("g")
			.attr("id", "circle")
			.attr("transform", "translate(" + svgWidth / 2 + "," + svgHeight / 2 + ")");

		svg.append("circle")
			.attr("r", outerRadius);
		*/
			
		// heatMap part
		var svg  = Matrix({
			container : '#visualcontainer',
			data      : correlationMatrix,
			labels    : labels,
			start_color : '#ffffff',
			end_color : '#ff0000'// #3498db'
		});

		function Matrix(options) {
			var margin = {top: 50, right: 50, bottom: 100, left: 100},
				width = 350,
				height = 350,
				data = options.data,
				container = options.container,
				labelsData = options.labels,
				startColor = options.start_color,
				endColor = options.end_color;

			var widthLegend = 100;

			if(!data){
				throw new Error('Please pass data');
			}

			if(!Array.isArray(data) || !data.length || !Array.isArray(data[0])){
				throw new Error('It should be a 2-D array');
			}

			var maxValue = d3.max(data, function(layer) { return d3.max(layer, function(d) { return d; }); });
			var minValue = d3.min(data, function(layer) { return d3.min(layer, function(d) { return d; }); });

			var numrows = data.length;
			var numcols = data[0].length;
			
			var svg = d3.select('.modal-body').append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			var background = svg.append("rect")
				.style("stroke", "white")
				.style("stroke-width", "2px")
				.attr("width", width)
				.attr("height", height);

			var x = d3.scale.ordinal()
				.domain(d3.range(numcols))
				.rangeBands([0, width]);

			var y = d3.scale.ordinal()
				.domain(d3.range(numrows))
				.rangeBands([0, height]);

			var colorMap = d3.scale.linear()
				.domain([minValue,maxValue])
				.range([startColor, endColor]);

			var row = svg.selectAll(".row")
				.data(data)
				.enter().append("g")
				.attr("class", "row")
				.attr("transform", function(d, i) {return "translate(0," + y(i) + ")"; });

			var cell = row.selectAll(".cell")
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
				.style("fill", function(d, i) {if(d== 0 && x(i)==y(i)) return  'white';return d >= maxValue/2 ? 'white' : 'black'; })
				.text(function(d, i) { return d; });

			row.selectAll(".cell")
				.data(function(d, i) { return data[i]; })
				.style("fill", colorMap);

			var labels = svg.append('g')
				.attr('class', "labels");

			var columnLabels = labels.selectAll(".column-label")
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
				.text(function(d, i) { return d; });

			var rowLabels = labels.selectAll(".row-label")
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
				.text(function(d, i) { return d; });

			var key = d3.select("#visuallegend")
				.append("svg")
				.attr("width", widthLegend)
				.attr("height", height + margin.top + margin.bottom);

			var legend = key
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

			var y = d3.scale.linear()
				.range([height, 0])
				.domain([minValue, maxValue]);

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("right");

			key.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate(41," + margin.top + ")")
				.call(yAxis);
			return svg;
		}
		return svg;
	}

	drawChords(parc,pairs,scolor,context,normallength,thickness) {

		if (parc===null || pairs===null || context===null) {
			console.log("Bad inputs in drawLines");
			return 0;
		}

		var connectome = [];
		var net_map = {};
		var matrix = [];
		var nets = new Set();
		d3.csv("../data/network.csv",function(data) {
			var net_map = {};
			var nets = new Set();
			data.map(function(d)
				{	
					net_map[d.node-1] = d.network-1;
					nets.add(d.network-1);
				});
			var matrix =  new Array(nets.size);
			for(var i = 0; i < nets.size; i++){
				matrix[i] = new Array(nets.size);
				for(var j = 0; j < nets.size; j++){
					matrix[i][j]=0;	
				}
			}
			var n=pairs.length;
			for (var index=0;index<n;index++) {
				var a_node=pairs[index][0];
				var b_node=pairs[index][1];

				var node=Math.floor(parc.indexmap[a_node]);
				var othernode=Math.floor(parc.indexmap[b_node]);
				matrix[net_map[node-1]][net_map[othernode-1]]+=1;
			}


			d3.csv("../data/network_names.csv", function(cities) {
				console.log(matrix);
				layout.matrix(matrix);

				// Add a group per neighborhood.
				var group = svg.selectAll(".group")
					.data(layout.groups)
					.enter().append("g")
					.attr("class", "group")
					.on("mouseover", mouseover);

				// Add the group arc.
				var groupPath = group.append("path")
					.attr("id", function(d, i) { return "group" + i; })
					.attr("d", arc)
					.style("fill", function(d, i) { return cities[i].color; });

				// Add a text label.
				var groupText = group.append("text")
					.attr("x", 6)
					.attr("dy", 15)
					.style("text-align", "center");

				groupText.append("textPath")
					.attr("xlink:href", function(d, i) { return "#group" + i; })
					.text(function(d, i) { return cities[i].name; });

				// Remove the labels that don't fit. :(
				groupText.filter(function(d, i) { return groupPath[0][i].getTotalLength() / 2 - 16 < this.getComputedTextLength(); })
					.remove();

				// Add the chords.
				var chord = svg.selectAll(".chord")
					.data(layout.chords)
					.enter().append("path")
					.attr("class", "chord")
					.style("fill", function(d) { return cities[d.source.index].color; })
					.attr("d", path);


				// Add an elaborate mouseover title for each chord.
				chord.append("title").text(function(d) {
					return cities[d.source.index].name
						+ " → " + cities[d.target.index].name
						+ ": " + formatPercent(d.source.value)
						+ "\n" + cities[d.target.index].name
						+ " → " + cities[d.source.index].name
						+ ": " + formatPercent(d.target.value);
				});

				function mouseover(d, i) {
					chord.classed("fade", function(p) {
						return p.source.index != i
							&& p.target.index != i;
					});
				}

			});
		});


		//create modal the size of the doc and size chord drawing to it
		let dim = [parseInt($('canvas').width() - 50), parseInt($('canvas').height() - 50)];
		console.log('dim', dim);

		let chordDialog = bis_webutil.createdialog('Chords', dim[0], dim[1], 0, 0, 100, () => {
			let frame = chordDialog.getContainingFrame();
			frame.remove();
		});

		let width = dim[0] - 50,
			height = dim[1] - 50,
			svgModal = $(chordDialog.getContainingFrame().find('.modal-body')),
			svgWidth = svgModal.width(),
			svgHeight = svgModal.height(),
			outerRadius = Math.min(svgWidth, svgHeight) / 2 - 10,
			innerRadius = outerRadius - 24;

		console.log('width', width, 'height', height, 'svg width', svgWidth, 'svg height', svgHeight);
		var formatPercent = d3.format(".1%");

		var arc = d3.svg.arc()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius);

		var layout = d3.layout.chord()
			.padding(.04)
			.sortSubgroups(d3.descending)
			.sortChords(d3.ascending);

		var path = d3.svg.chord()
			.radius(innerRadius);

		var svg = d3.select('.modal-body').append("svg")
			.attr("width", svgWidth)
			.attr("height", svgHeight)
			.append("g")
			.attr("id", "circle")
			.attr("transform", "translate(" + svgWidth / 2 + "," + svgHeight / 2 + ")");

		svg.append("circle")
			.attr("r", outerRadius);

		chordDialog.getWidget().find('.modal-body').append(svg);
		chordDialog.show();

	}


	/** draw 3D lines connecting nodes in parcellation in 3D 
	 * @param {Parcellation} parc - the underlying parcellation
	 * @param {array} poslines -- array of  line pairs created by {@link ConnMatrix.createLinePairs}
	 * @param {array} neglines -- array of  line pairs created by {@link ConnMatrix.createLinePairs}
	 * @param {number} radius -- the sphere size for each node
	 * @param {number} power -- the scale for each node
	 * @returns {Bis_3dCrosshairGeometry.preGeometry} out 
	 */
	draw3DLines(parc,poslines,neglines,radius,power) {

		radius=radius || 2.0;
		power =power  || 1.0;

		if (parc===null || poslines===null || neglines===null ) {
			console.log("Bad inputs in draw3DLines");
			return 0;
		}

		var pairsarray= [ poslines,neglines ];
		var lst = [],arr=0,index=0,n,i,j;
		var MNI = [ 90, 126, 72 ];
		var out = [];
		for (arr=0;arr<=1;arr++) {
			var pairs=pairsarray[arr];
			n=pairs.length;

			if (n>0) {
				var vertices = new Float32Array(2*3*n);
				var indices = new Uint16Array(n*2);
				var v_index=0;

				for (index=0;index<n;index++) {
					var a_node=pairs[index][0];
					var b_node=pairs[index][1];
					lst.push(a_node);
					lst.push(b_node);
					var node=Math.floor(parc.indexmap[a_node]);
					var othernode=Math.floor(parc.indexmap[b_node]);

					var pt = [[ parc.rois[node].x,parc.rois[node].y, parc.rois[node].z ],
						[ parc.rois[othernode].x,parc.rois[othernode].y, parc.rois[othernode].z ]];
					var lobe = [ parc.rois[node].attr[0], parc.rois[othernode].attr[0] ];
					// Offset the point by MNI shift


					for (i=0;i<=1;i++) {
						for (j=0;j<=2;j++) {
							if (j!==0) {
								vertices[v_index]=pt[i][j]+MNI[j];
							} else {
								vertices[v_index]=180.0-(pt[i][j]+MNI[j]);
								if (lobe[i]<11)
									vertices[v_index]-=this.offset;
								else
									vertices[v_index]+=this.offset;
							}
							++v_index;
						}
					}
					indices[index*2]=index*2;
					indices[index*2+1]=index*2+1;
				}
				out.push({
					vertices : vertices,
					indices  : indices ,
				});
			} else {
				out.push({ vertices: null, indices:null});
			}
		}

		if (lst.length===0) {
			console.log('No Spheres ... Done\n');
			return out;
		}

		//          console.log('+++++ I have '+lst.length+' Spheres '+lst);
		lst = lst.filter(function (e, i, arr) {
			return arr.lastIndexOf(e) === i;
		});

		var poslst0 = [],neglst0= [],poslst1=[],neglst1=[];

		var maxp=0.25*this.maxsum;

		for (i=0;i<lst.length;i++) {
			var nd0=parc.indexmap[lst[i]];
			var lob=parc.rois[nd0].attr[0];
			if (this.statMatrix[lst[i]][0]>=this.statMatrix[lst[i]][1] && poslines.length>0) {
				if (lob<11)
					poslst0.push(lst[i]);
				else
					poslst1.push(lst[i]);
			} else {
				if (lob<11)
					neglst0.push(lst[i]);
				else
					neglst1.push(lst[i]);
			}
		}

		var posarray = [ poslst0,neglst0,poslst1,neglst1 ];
		var obj = [null,null,null,null];
		for (arr=0;arr<=3;arr++) {
			obj[arr]={
				positions : [],
				scales : [],
			};
			var nodeindices=posarray[arr];
			n=nodeindices.length;
			if (n>0) {
				for (index=0;index<n;index++) {
					var nd=nodeindices[index];
					var int_nd=Math.floor(parc.indexmap[nd]);
					var px=[ parc.rois[int_nd].x,
						parc.rois[int_nd].y, 
						parc.rois[int_nd].z ];
					var lb=parc.rois[int_nd].attr[0];
					for (var ia=0;ia<=2;ia++) {
						if (ia!==0)
							px[ia]=px[ia]+MNI[ia];
						else
							px[ia]=180.0-(px[ia]+MNI[ia]);
					}
					if (lb<11)
						px[0]-=this.offset;
					else
						px[0]+=this.offset;
					obj[arr].positions.push(px);
					var r=radius*Math.pow(this.statMatrix[nd][2]/maxp,power);
					obj[arr].scales.push(Math.max(radius,r));
				}
			}
			out.push(obj[arr]);
		}
		//          console.log('Returning '+out.length+' objects');
		return out;
	}


	/** gets the matrix as an ImageData structure for rendering on canvas
	 * @param {number} ispositive -  if 1 or true use positive matrix
	 * @param {number} isordered -  if 1 or true order rows to match sorting of parcelllation
	 * @param {CanvasContext2D} context - the context in which to draw
	 * @param {Parcellation} parc - the underlying parcellation
	 * @return {ImageData} ImageData structur containing colored image matrix
	 */
	getImageData(ispositive,isordered,context,parcellation) {

		var index=0;
		if (isordered===1 || isordered===true)
			index=1;

		if (ispositive===0 || ispositive===false)
			ispositive=false;
		else
			ispositive=true;

		if (ispositive) {
			if (this.posMatrix===null)
				return null;
			if (this.posImageData[index]!==null)
				return this.posImageData[index];
		} else {
			if (this.negMatrix===null || this.hasnegMatrix===false)
				return null;
			if (this.negImageData[index]!==null)
				return this.negImageData[index];
		}

		//          console.log('recomputing pos='+ispositive+' ordered='+isordered);

		var arr=this.negImageData;
		var matrix=this.negMatrix;
		if (ispositive) {
			arr=this.posImageData;
			matrix=this.posMatrix;
		}

		var numrows=numeric.dim(matrix)[0];
		var imgData=context.createImageData(numrows,numrows);
		var yesc=[255,0,0,255],noc=[192,224,224,224];
		let px=0;

		for (var j=0;j<numrows;j++) {
			var ja=j;
			if (isordered)
				ja=parcellation.indexmap[j];

			for (var i=0;i<numrows;i++) {
				var ia=i;
				if (isordered) 
					ia=parcellation.indexmap[i];

				var val=matrix[ia][ja];
				if (val>0) {
					imgData.data[px+0]=yesc[0];
					imgData.data[px+1]=yesc[1];
					imgData.data[px+2]=yesc[2];
					imgData.data[px+3]=yesc[3];
				}  else {
					imgData.data[px+0]=noc[0];
					imgData.data[px+1]=noc[1];
					imgData.data[px+2]=noc[2];
					imgData.data[px+3]=noc[3];
				}
				px=px+4;
			}
		}

		arr[index]=imgData;
		return arr[index];
	}
}

module.exports = ConnMatrix;
