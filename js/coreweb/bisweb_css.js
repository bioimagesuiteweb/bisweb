const darkcolors= {
    "name" : "dark",
    "activecolor" : "#440000",
    "background" : "#000000",
    "background2" : "#202020",
    "background3" : "#505050",
    "background4" : "#444444",
    "foreground" : "#ffffff",
    "passivecolor" : "#303030",
    "passivecolor0" : "#282828",
    "passivecolor2" : "#383838",
};

const brightcolors = {
    "name" : "bright",
    "activecolor" : "#ffcfcf",
    "background" : "#ffffff",
    "background2" : "#dddddd",
    "background3" : "#cecece",
    "background4" : "#bbbbbb",
    "foreground" : "#111111",
    "passivecolor" : "#e8dfdf",
    "passivecolor0" : "#f0e8e8",
    "passivecolor2" : "#e0d7d7",
};


const obj= {


    // -----------------------------------------------------------
    // Common css stuff
    // -----------------------------------------------------------
    commoncss : function(colors) {

        
        let st=`

/* biswebinternal ${colors.name} */
.bisflip {
    -moz-transform: scale(-1, 1);
    -webkit-transform: scale(-1, 1);
    -o-transform: scale(-1, 1);
    -ms-transform: scale(-1, 1);
    transform: scale(-1, 1);
}

.biswebdock {
  background-color: ${colors.passivecolor0};
}

.biswebpanel {
  background-color: ${colors.passivecolor};
}

.biswebpanel2 {
  background-color: ${colors.passivecolor2};
}

.biswebactive {
  background-color: ${colors.activecolor};
}

.biswebelement {
  color : ${colors.foreground};
  background-color : ${colors.background2};
  font-size:11px;
}

.biswebselect { 
  background-color : ${colors.background3};
  color : ${colors.foreground};
}

.biswebdropdownitem {
  font-size: 13px; 
  margin-bottom: 2px;
}

.biswebfiledialog {
  color : ${colors.foreground};
  background-color": ${colors.background4};
}

.dg {
	 font: 11px "Helvetica Neue",Helvetica,Arial,sans-serif;
}
`;
        return st;

        

    },

    // -----------------------------------------------------------
    // Override dat.gui css styles and some other changes
    // -----------------------------------------------------------
    brightmode : function() {


        // fixed rom data.gui source
        return `

body {
    background-color : #cccccc;
}

/** Main type */
 .dg {
	 color: #111;
	 font: 11px "Helvetica Neue",Helvetica,Arial,sans-serif;
     text-shadow: 0 0px 0 #eeeeee;
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
    background: #c8c8c8 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;
	 cursor: pointer;
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
    },

    // ------------------------------- darmode -------------------
    // Mostly defaults here so only minor changes
    // -----------------------------------------------------------

    darkmode : function() {

        return `

.dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear;border:0;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button.close-top{position:relative}.dg.main .close-button.close-bottom{position:absolute}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-y:visible}.dg.a.has-save>ul.close-top{margin-top:0}.dg.a.has-save>ul.close-bottom{margin-top:27px}.dg.a.has-save>ul.closed{margin-top:0}.dg.a .save-row{top:0;z-index:1002}.dg.a .save-row.close-top{position:relative}.dg.a .save-row.close-bottom{position:fixed}.dg li{-webkit-transition:height .1s ease-out;-o-transition:height .1s ease-out;-moz-transition:height .1s ease-out;transition:height .1s ease-out;-webkit-transition:overflow .1s linear;-o-transition:overflow .1s linear;-moz-transition:overflow .1s linear;transition:overflow .1s linear}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li>*{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px;overflow:hidden}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .c{float:left;width:60%;position:relative}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:7px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .cr.color{overflow:visible}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.color{border-left:3px solid}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2FA1D6}.dg .cr.number input[type=text]{color:#2FA1D6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2FA1D6;max-width:100%}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}


.dg .c select {
    background-color: #222222;
}

.dg .cr.number input[type=text] {
    color : #dddddd;
}


.bistoggle {
    background-color : rgb(72,72,72);
    float : right;
    border : 2px;
    border-color : rgb(24,24,24);
    border-style : solid;
    color : rgb(255,255,255);
    position : relative;
    font-size : 17px;
    margin-left : 5px;
}


`;

    }
};


/**
 * @param {Boolean} darkmode - if true set darkmode
 */

module.exports=function(darkmode) {

    let st='';
    
    if (darkmode)
        st=obj.commoncss(darkcolors)+obj.darkmode();
    else
        st=obj.commoncss(brightcolors)+obj.brightmode();

    return st;
};
