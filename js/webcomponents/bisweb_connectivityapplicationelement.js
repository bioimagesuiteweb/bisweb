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

"use strict";

/*global document,HTMLElement */


const bisweb_image = require('bisweb_image');
const webutil=require('bis_webutil');
const FastClick=require('fastclick');
const $=require('jquery'); 	
const bootbox=require('bootbox');
const numeric=require('numeric');
const util=require('bis_util');

/**
 * A Application Level Element that creates a Connectivity Application
 * 
 * @example
 *   <bisweb-connectivityapplication
 *      bis-menubarid="#viewer_menubar"
 *      bis-connectivitycontrolid="#conncontrol"
 *      bis-viewerid="#viewer">
 *   </bisweb-connectivityapplication>
 *
 * Attributes
 *     bis-menubarid : theid a <bisweb-topmenubar> element
 *     bis-connectivitycontrolid : the id of an optional  <bisweb-connectivitycontrolelement>
 *     bis-viewerid : the id of the underlying <bisweb-orthogonalviewer>  element
 */
class ConnectivityApplicationElement extends HTMLElement {
		
		connectedCallback() {

				
        var VIEWER = {
						inBrowser : true,
						viewer : 0,
						dialog : 0,
						dialogtext: 0,
						dialogtitle: 0,
				};
				
				/** Callback to load an image
				 * @alias BisMain_ConnectivityViewer~imageread
				 * @param {bis_image} vol - the image to load
				 */
				var objectmapread = function ( vol ) {
						console.log('+++++ Objectmap :',vol.getDescription());
						var d=vol.getDimensions();
						var s=vol.getSpacing();
						var truedim = [  181,217,181,1 ] ;
						var truespa = [  1.0,1.0,1.0,1.0 ];
						d[3]=truedim[3];
						s[3]=truespa[3];
						var diff=numeric.norminf(numeric.sub(d,truedim));
						var diff2=numeric.norminf(numeric.sub(s,truespa));
						var orient=vol.getOrientation().name;
						if (diff>0 || diff2>0.01 || orient!=="RAS") {
								bootbox.alert("Bad Parcellation Image for creating a Parcellation file. Must be RAS 181x217x181 and 1x1x1 mm (i.e. MNI 1mm space)."+
															"This image has orientation "+orient+", dimensions="+[d[0],d[1],d[2]]+" voxel size="+
															[ util.scaledround(s[0],10),util.scaledround(s[1],10),util.scaledround(s[2],10) ]);
								return 0;
						}
						VIEWER.viewer.setobjectmap(vol,true);
				};
				
				var imageread = function ( vol ) {
						VIEWER.viewer.setimage(vol);
						VIEWER.viewer.setcoordinates([90,126,72]);
						let image1 = new bisweb_image();
						image1.load('images/gray_highres_groupncut150_right5_left1_emily_reord_new.nii.gz',true)
								.then(function() {
										objectmapread(image1);
								})
								.catch( (e) => { myerror(e); });
				};
				
				var myerror =function(e) {
						e= e || "";
						bootbox.alert("Error loading"+e);
				};


				// --------------------------------------------------------------------------------
				// Main Application
				// --------------------------------------------------------------------------------
				
				const menubarid=this.getAttribute('bis-menubarid');
				const viewerid=this.getAttribute('bis-viewerid');
				const controlid=this.getAttribute('bis-connectivitycontrolid');
				
				VIEWER.viewer=document.querySelector(viewerid);
				VIEWER.viewer.finalizeTools();

				var viewer=VIEWER.viewer;
				let control=document.querySelector(controlid);
				let menubar=document.querySelector(menubarid).getMenuBar();

				var fmenu=webutil.createTopMenuBarMenu("File",menubar).attr('id','bisfilemenu');
				webutil.createMenuItem(fmenu,'Load Node Definition File',
															 function(e) {  control.loadparcellationfile(e);},
															 '.parc',
															 { title : 'Node Definition File',
																 save : false,
																 filters : [ { name: 'JSON formatted Node definition file', extensions: ['parc']}],
															 });
				webutil.createMenuItem(fmenu,''); // separator
				
				webutil.createMenuItem(fmenu,'Load Positive Matrix',
															 function(f) {  control.loadmatrix(0,f);},
															 '.csv,.txt',
															 { title : 'Postive Connectivity Matrix',
																 save : false,
																 filters : [ { name: 'Text or CSV formatted matrix file', extensions: ['txt', 'csv']}],
															 });
				
				
				webutil.createMenuItem(fmenu,'Load Negative Matrix',
															 function(f) {  control.loadmatrix(1,f);},
															 '.csv,.txt',
															 { title : 'Negative Connectivity Matrix',
																 save : false,
																 filters : [ { name: 'Text or CSV formatted matrix file', extensions: ['txt', 'csv']}],
															 });
				
				webutil.createMenuItem(fmenu,''); // separator
				
				webutil.createMenuItem(fmenu,'Clear Matrices',function() { control.clearmatrices() ; 
																																 });
				
				
				// ------------------------------------ Edit Menu ----------------------------
				var editmenu=webutil.createTopMenuBarMenu("Edit",menubar);
				webutil.createMenuItem(editmenu,'Undo',function() {  control.undo(); });
				webutil.createMenuItem(editmenu,'Redo',function() {  control.redo(); });
				webutil.createMenuItem(editmenu,''); // separator
				webutil.createMenuItem(editmenu,'Reset Display Parameters',function(){ control.resetdefault();});
				
				
				// ------------------------------------ View Menu ----------------------------
				var viewmenu=webutil.createTopMenuBarMenu("View",menubar);
				webutil.createMenuItem(viewmenu,'Info about Loaded Data',function() {  control.info(); });
				webutil.createMenuItem(viewmenu,'Show High Degree Nodes',function() {  control.viewInteresting(); });
				webutil.createMenuItem(viewmenu,''); // separator
				webutil.createMenuItem(viewmenu,'Show Matrices',function() {  control.showmatrices(); });
				webutil.createMenuItem(viewmenu,''); // separator
				webutil.createMenuItem(viewmenu,'Set 3D View To Front',function() {  viewer.set3dview(1,true); });
				webutil.createMenuItem(viewmenu,'Set 3D View To Back',function() {  viewer.set3dview(1,false); });
				webutil.createMenuItem(viewmenu,''); // separator
				webutil.createMenuItem(viewmenu,'Set 3D View To Top',function() { viewer.set3dview(2,false); });
				webutil.createMenuItem(viewmenu,'Set 3D View To Bottom',function() { viewer.set3dview(2,true); });
				webutil.createMenuItem(viewmenu,''); // separator
				webutil.createMenuItem(viewmenu,'Set 3D View To Left',function() { viewer.set3dview(0,false); });
				webutil.createMenuItem(viewmenu,'Set 3D View To Right',function() { viewer.set3dview(0,true); });
				
				// ------------------------------------ Advanced Menu ----------------------------
				
				var advmenu=webutil.createTopMenuBarMenu("Advanced",menubar);
				webutil.createMenuItem(advmenu,'Import Node Positions Text File (in MNI coordinates)',
															 function(f) {  control.importparcellationtext(f);},
															 '.txt,.csv',
															 { title : 'Node definitions file',
																 save : false,
																 filters : [ { name: 'Text or CSV formatted file', extensions: ['txt', 'csv']}],
															 });
				
				webutil.createMenuItem(advmenu,'Import Node Definition (Parcellation) Image',
															 function(f) {
																	 let img=new bisweb_image();
																	 img.load(f,false)
																			 .then(function() {
																					 control.importparcellation(img);
																			 })
																			 .catch( (e) => { myerror(e); });
															 },'NII',
															 { title : 'Node definitions image',  save : false});
				
				
				// ------------------------------------ Help Menu ----------------------------
				
				var helpmenu=webutil.createTopMenuBarMenu("Help",menubar);
				webutil.createMenuItem(helpmenu,'About this application',function() {  control.about(); });
				webutil.createMenuItem(helpmenu,''); // separator
				helpmenu.append($("<li><a href=\"https://www.nitrc.org/frs/?group_id=51\" target=\"_blank\"\">Download Parcellation</a></li>"));
				webutil.createMenuItem(helpmenu,''); // separator
				webutil.createMenuItem(helpmenu,'Load Sample Matrices',function() {
						control.loadsamplematrices(['images/pos_mat.txt','images/neg_mat.txt']);
				});
				
				webutil.createMenuItem(helpmenu,''); // separator

				let bisconsole=document.createElement('bisweb-console');
				bisconsole.addtomenu(helpmenu);
				
				
				// ------------------------------------ Initialize ---------------------------
				
				let image0 = new bisweb_image();
				image0.load('images/MNI_T1_1mm_stripped_ras.nii.gz',false)
						.then(function() { imageread(image0); })
						.catch( (e) => { myerror(e); });
				new FastClick(document.body);
	    	
				var HandleFiles = function(files) {
						var filename=files[0].name;
						var ext=filename.split('.').pop();
						console.log('filename='+filename+' extension='+ext);
						if (ext==="parc" || ext==="json") {
								control.loadparcellationfile(files[0]);
						} else if (ext==="txt" || ext==="csv") {
								control.loadmatrix(-1,files[0]);
						}
				};
				webutil.createDragAndCropController(HandleFiles);
				
				
				//	window.onbeforeunload = function() {
				//	    return "Are you sure you want to exit?";
				//	};	
				
		}
}

webutil.defineElement('bisweb-connectivityapplication', ConnectivityApplicationElement);



