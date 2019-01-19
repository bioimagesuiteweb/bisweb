module.exports=function() {


    // fixed rom data.gui source
    const css=`

/** Main type */
 .dg {
	 color: #111;
	 font: 11px 'Lucida Grande', sans-serif;
	/** Auto place */
	/* Controller row, 
 */
	/** Controllers */
}
 .dg.main {
	/** Scrollbar */
}
 .dg.main::-webkit-scrollbar {
	 width: 5px;
	 background: #e5e5e5;
}
 .dg.main::-webkit-scrollbar-corner {
	 height: 0;
	 display: none;
}
 .dg.main::-webkit-scrollbar-thumb {
	 border-radius: 5px;
	 background: #fff;
}
 .dg li:not(.folder) {
	 background: #e5e5e5;
	 border-bottom: 1px solid #d3d3d3;
}
 .dg li.save-row {
	 line-height: 25px;
	 background: #252a34;
	 border: 0;
}
 .dg li.save-row select {
	 margin-left: 5px;
	 width: 108px;
}
 .dg li.save-row .button {
	 margin-left: 5px;
	 margin-top: 1px;
	 border-radius: 2px;
	 font-size: 9px;
	 line-height: 7px;
	 padding: 4px 4px 5px 4px;
	 background: #3a4252;
	 color: #fff;
	 box-shadow: 0 -1px 0 #252a34;
	 cursor: pointer;
}
 .dg li.save-row .button.gears {
	 background: #3a4252;
	 height: 7px;
	 width: 8px;
}
 .dg li.save-row .button:hover {
	 background-color: #303643;
	 box-shadow: 0 -1px 0 #252a34;
}
 .dg li.folder {
	 border-bottom: 0;
}
 .dg li.title {
	 padding-left: 16px;
	 background-color: #f0f0f0;
	 cursor: pointer;
	 border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
 .dg .closed li.title {
	background-color: #f0f0f0;
}
 .dg .cr.boolean {
	 border-left: 3px solid #7f9878;
}
 .dg .cr.color {
	 border-left: 3px solid;
}
 .dg .cr.function {
	 border-left: 3px solid #19e2a0;
}
 .dg .cr.number {
	 border-left: 3px solid #2fa1d6;
}

 .dg .cr.number input[type=text] {
	 color: #000022;
}
 .dg .cr.string {
	 border-left: 3px solid #e12c90;
}
 .dg .cr.string input[type=text] {
	 color: #e12c90;
}
 .dg .cr.function:hover, .dg .cr.boolean:hover {
	 background: #e0e0e0;
}
 .dg .c input[type=text] {
	 background: #cfcfcf;
	 outline: none;
}
 .dg .c input[type=text]:hover {
	 background: #dcdcdc;
}
 .dg .c input[type=text]:focus {
	 background: #e9e9e9;
	 color: #fff;
}
 .dg .c .slider {
	 background: #cfcfcf;
	 cursor: ew-resize;
}
 .dg .c .slider-fg {
	 background: #2fa1d6;
	 max-width: 100%;
}
 .dg .c .slider:hover {
	 background: #dcdcdc;
}
 .dg .c .slider:hover .slider-fg {
	 background: #2fa1d6;
}

body {
    background-color : #ffffff;
    color : #111111;
}


.dg .c select {
    background-color: #dddddd;
    color : #111111;
}

.bistoggle {
    background-color : #efefef;
    float : right;
    border : 2px;
    border-color : rgb(211,211,211);
    border-style : solid;
    color : rgb(0,0,0);
    position : relative;
    font-size : 17px;
    margin-left : 5px;
}


`;


    let style = document.createElement('style');
    
    style.setAttribute('type', 'text/css');
    style.innerHTML = css;
    document.head.appendChild(style);
    console.log('++++ dat.gui bright theme applied');
};
