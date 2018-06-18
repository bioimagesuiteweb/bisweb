/*global window,document,HTMLElement */

"use strict";

// imported modules from open source and bisweb repo
const bisimagesmoothreslice = require('bis_imagesmoothreslice');
const bistransformations = require('bis_transformationutil');
const BisWebImage = require('bisweb_image');
const webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const bisimagealgo = require('bis_imagealgorithms');
const bisgenericio = require('bis_genericio');
const $ = require('jquery');
const bootbox = require('bootbox');
const LinearRegistration = require('linearRegistration');
const ResliceImage = require('resliceImage');
const NonlinearRegistration = require('nonlinearRegistration');
const baseutils = require('baseutils');
const BisDataObject = require('bisweb_dataobject');
const BisWebPanel = require('bisweb_panel.js');
const jstree = require('jstree');

// carousel initialization
/*
const spect_template_string = `
						
		
		<div class="container" style="width:300px">		
			<div class='carousel' data-ride = 'carousel' id='myCarousel' data-interval = 'false'>
			
				<div class='carousel-inner' role = 'listbox'>
					<div class='active item sidd-item' id='smitem1'>
					<br><br><br>
					<button type = 'button' class='btn btn-info btn-sidd'  id='newPatientButton'> Create New Patient </button>
					<br><br>
					<button type = 'button' class='btn btn-primary btn-sidd' id='continuePatientButton'> Load Existing Patient </button>
				</div>

				<div class='item sidd-item' id='smitem2'>
					<label class='siddtextFieldLabel'>Patient ID Number-| </label><input id='sm_patientNumber' value='0000'></input> <br><br><br>
					<label class='siddtextFieldLabel'>Patient Name-------| </label><input id='sm_patientName' value='0000'></input>
					<br><br>
				</div>

				<div class='item sidd-item' id='smitem3'>
					<br>
					<div id='btn1'></div><br>	
					<div id='btn2'></div><br>
					<div id='btn3'></div><br>
				</div>

				<div class='item sidd-item' id='smitem5'>
					<div id='div1'></div>
					<div id='div1_5'></div><br>	
					<div id='div2'></div><br>
					<div id='div3'></div><br>
					<div id='div4'></div><br>
				</div>
		
				<div class='item sidd-item' id='smitem4'>
					<div id='processSpectDiv'></div>
					<div id='showTmapDiv'></div>
					<div id='hyperchartdiv'>
						<div class='chart' id='headLab'></div>
						<div class='chart' id='lab1'></div>
						<div class='chart' id='lab2'></div>
						<div class='chart' id='lab3'></div>
						<div class='chart' id='lab4'></div>
					</div>
				</div>
			</div>
			<div id='navigationButtons'> </div>
		</div>
	</div>

		`;


*/
const tree_template_string = `
		<div class="container" style="width:300px">
			<div id="treeDiv">
			</div>
		</div>
	
		`;





// ---------------------------------------------------------------
// Messages to user
// --------------------------------------------------------------
let errormessage = function (e) {
	e = e || "";
	webutil.createAlert('Error Message from diffSPECT' + e, true);
};

let resultsmessagebox = function (results) {
	results = results || "";
	bootbox.alert("<DIV>Hyperactivity Stats <PRE>" + results + "</PRE></DIV>").find('div.modal-dialog').addClass(".largeWidth");
};

//------------------------------------------------------------------
//Global Variables
//------------------------------------------------------------------

var app_state = {
			sm_carousel: null,
			viewer: null,
			patient_name: null,
			patient_number: null,
			does_have_mri: false,
			ictal: null,
			interictal: null,
			mri: null,
			ATLAS_spect: null,
			ATLAS_mri: null,
			ATLAS_stdspect: null,
			ATLAS_mask: null,
			tmap: null,
			nonlinear: false,

			intertoictal_xform: null,
			intertoictal_reslice: null,
						
			atlastointer_xform: null,
			atlastointer_reslice: null,

			atlastoictal_xform: null,
			atlastoictal_reslice: null,

			atlastomri_xform: null,
			atlastomri_reslice: null,

			mritointer_xform: null,
			mritointer_reslice: null,
						
			hyper: null
};


/** 
 * A web element to create and manage a GUI for a Diff Spect Tool (for differential spect processing for epilepsy).
 *
 * @example
 *
 * <bisweb-diffspectelement
 *    bis-menubarid="#viewer_menubar"
 *    bis-layoutwidgetid="#viewer_layout"
 *    bis-viewerid="#viewer">
 *     bis-consoleid="#bisconsole"
 * </bisweb-diffspectelement>
 *
 *
 * Attributes:
 *      bis-viewerid : the orthogonal viewer to draw in 
 *      bis-layoutwidgetid :  the layout widget to create the GUI in
 *      bis-menubarid : the menubar to insert menu items in
 *     bis-consoleid : the if of an optional <bisweb-console> element.
 */
class DiffSpectElement extends HTMLElement {


	constructor() {

		super();

		// boolean values 
		this.state_machine = {
			images_processed: false,
			images_registered: false,
			mri_loaded: false,
			ictal_loaded: false,
			interictal_loaded: false
		};

		this.elements = {
			continuePatientFile: null,
		};
		this.panel=null;
	}

	// function to serialize diffspect data to json and save to a file
	saveData() {

		var strIctal = "", strInterictal = "", strTmap = "";
		var strReg_AT_IN = "", strReg_IN_IC = "", strReg_AT_IC = "";

		//serializing transformations

		if (null !== app_state.atlastointer_xform)
			strReg_AT_IN = app_state.atlastointer_xform.serializeToJSON();

		if (null !== app_state.intertoictal_xform)
			strReg_IN_IC = app_state.intertoictal_xform.serializeToJSON();

		if (null !== app_state.atlastoictal_xform)
			strReg_AT_IC = app_state.atlastoictal_xform.serializeToJSON();



		//serializing images 

		if (null !== app_state.interictal)
			strInterictal = app_state.interictal.serializeToJSON();


		if (null !== app_state.ictal)
			strIctal = app_state.ictal.serializeToJSON();

		if (null !== app_state.tmap)
			strTmap = app_state.tmap.serializeToJSON();

		// json objewct to save
		var output = {
			bisformat: "diffspect",
			name: app_state.patient_name,
			number: app_state.patient_number,
			inter: strInterictal,
			ictal: strIctal,
			tmap: strTmap,
			atlastointer: strReg_AT_IN,
			intertoictal: strReg_IN_IC,
			atlastoictal: strReg_AT_IC,
			hyper: app_state.hyper
		};

		var savesuccess = function (msg) {
			webutil.createAlert('Patient data in ' + msg + ')');
		};

		var filename = output.name + "/" + output.number + ".spect";
		bisgenericio.write({
			title: 'Select filename to save patient data in ',
			filename: filename,
			filters: [{ name: "Patient Spect file", extensions: ['spect'] }]
		},
			JSON.stringify(output)).then((obj) => {
				savesuccess(obj.filename);
			}).catch((e) => {
				errormessage(e);
			});
	}


	// --------------------------------------------------------------------------------
	// Register Images
	// --------------------------------------------------------------------------------
	//
	// params.mode = 0 = rigid, 1=affine, >=2= affine+nl

	/* 
	 * computes a linear registration 
	 * @param {BISImage} reference- the reference image
	 * @param {BISImage} target - the target image
	 * @param {array} initial - initial params for the registration
	 * @param {object} params - options for the registration 
	 * @returns {BISTransformation} - the output of the registration
	 */
    computeLinearRegistration(reference, target, initial, params) {

		initial = initial || null;
		params = params || {
			intscale: 2,
			numbins: 64,
			levels: 3,
			smoothing: 0.5,
			optimization: 3,
			stepsize: 2.0,
			metric: 3,
			steps: 1,
			mode: 0,
			resolution: 1.5
		};

		if (params.mode < 0)
			params.mode = 0;

		if (params.mode >= 2)
			params.mode = 4;


		var md = 0, lv = params.levels, iter = params.iterations;
		if (params.mode !== 0)
			md = 3;
		if (params.mode > 1) {
			lv = 3;
			iter = 15;
		}

		let lin_opts = {
		    "intscale": 1,
		    "numbins": 64,
		    "levels": 3,
		    "imagesmoothing": 1,
		    "optimization": "ConjugateGradient",
		    "stepsize": 1,
		    "metric": "NMI",
		    "steps": 1,
		    "iterations": 10,
		    "mode": "Rigid",
		    "resolution": 1.5,
		    "doreslice": true,
		    "norm": true,
		    "debug": false
		};
		let input = {'reference': reference,
			     	 'target'   : target}; 
		var linear = new LinearRegistration();
		let output = {
			transformation: null,
			reslice: null
		};

		return new Promise( (resolve,reject) => {
			linear.execute(input, lin_opts).then( () => {
				output.transformation = linear.getOutputObject('output'); 
				output.reslice = linear.getOutputObject('resliced');
				if (baseutils.getLinearMode(lin_opts["mode"])) {
					console.log(output);
				    resolve(output);
				}
					resolve();
			    }).catch( (e) => {
				    console.log('This did not run');
				    console.log('error',e,e.stack);
				    reject(e);
				});
		});
    }
	
	// computes a non-linear registration
	computeNonlinearRegistration(reference, target) {
		
		let nonlinearRegModule = new NonlinearRegistration();	
		let input = { 'reference': reference,
					  'target'   : target};
		
		let nonlin_opts = 
			{
       			 "intscale": 1,
       			 "numbins": 64,
       			 "levels": 3,
		         "imagesmoothing": 1,
       			 "optimization": "ConjugateGradient",
		         "stepsize": 1,
   			     "metric": "NMI",
		         "steps": 1,
		         "iterations": 1,
		         "cps": 20,
		         "append": true,
       			 "linearmode": "Affine",
		         "resolution": 1.5,
		         "lambda": 0.001,
		         "cpsrate": 2,
		         "doreslice": true,
		         "norm": true,
       			 "debug": true
			};
		let output = { 
			transformation: null,
			reslice: null
		};
		
		return new Promise((resolve, reject) => {
			nonlinearRegModule.execute(input, nonlin_opts).then(() => {
				output.transformation = nonlinearRegModule.getOutputObject('output');
				output.reslice = nonlinearRegModule.getOutputObject('resliced');
				resolve(output);
			}).catch( (e) =>  {
				console.log("ERROR:", e, e.stack);
				reject(e);
			});

		});
	}

	// --------------------------------------------------------------------------------
	// Custom Registration Methods
	// --------------------------------------------------------------------------------
	
	// calls computeLinearRegistration to register interictal image to ictal image.
	registerInterictalToIctal() {

		app_state.intertoictal = null;

		if (app_state.interictal === null ||
			app_state.ictal === null) {
			errormessage('Bad spect Images can not register');
			return;
		}

		var opts = {
			intscale: 1,
			numbins: 64,
			levels: 3,
			smoothing: 0.5,
			optimization: 3,
			stepsize: 2.0,
			metric: 3,
			steps: 1,
			mode: 0,
			resolution: 1.5
		};

		return this.computeLinearRegistration(app_state.interictal, app_state.ictal, null, opts).then( (output) => {
			console.log(output);
			app_state.intertoictal_xform = output.transformation;
			app_state.intertoictal_reslice = output.reslice;
			console.log(app_state.intertoictal_xform);
			console.log(app_state.intertoictal_reslice);
		});
	}
	

	// calls either computeNonlinearRegistration or computeLinearRegistration to register ATLAS image to MRI image
	registerAtlasToMRI() {
		if (app_state.mri===null ||
			app_state.ATLAS_spect === null) {
			
			errormessage("bad images!");
			return;
		}

		if (app_state.nonlinear) {
			return this.computeNonlinearRegistration(app_state.ATLAS_spect, app_state.mri).then( (output) => {
				console.log(output);
				app_state.atlastomri_xform = output.transformation;
				app_state.atlastomri_reslice = output.reslice;
			});
		}



		return this.computeLinearRegistration(app_state.ATLAS_spect, app_state.mri, null, null).then( (output) => {
			app_state.atlastomri_xform = output.transformation;
			app_state.atlastomri_reslice = output.reslice;
		});
	}

	// calls computeLinearRegistration to register MRI to interictal image
	registerMRIToInterictal() {
		if (app_state.mri === null ||
			app_state.interictal === null) {

			errormessage("bad images");
			return;
		}

		return this.computeLinearRegistration(app_state.mri, app_state.interictal, null, null).then( (output) => {
			app_state.mritointer_xform = output.transformation;
			app_state.atlastomir_reslice = output.reslice;
		});

	}

	// calls computeLinearRegistration of computeNonlinearRegistration to register ATLAS image to interictal image
	registerAtlasToInterictal(fast = false) {

		app_state.atlastointer = null;

		if (app_state.interictal === null ||
			app_state.ATLAS_spect === null) {
			errormessage('Bad Atlas and/or interictal spect, can not register');
			return;
		}

		var opts = {
			intscale: 1,
			numbins: 64,
			levels: 3,
			smoothing: 0.5,
			optimization: 3,
			stepsize: 2.0,
			metric: 3,
			steps: 1,
			mode: 1,
			resolution: 1.5
		};

		if (!fast)
			opts.mode = 2;


		if (app_state.nonlinear) {
			return this.computeNonlinearRegistration(app_state.ATLAS_spect, app_state.interictal).then( (output) => {
				console.log(output);
				app_state.atlastointer_xform = output.transformation;
				app_state.atlastointer_reslice = output.reslice;
				console.log(app_state.atlastointer_xform);
				console.log(app_state.atlastointer_reslice);	
			});
		}

		return this.computeLinearRegistration(app_state.ATLAS_spect, app_state.interictal, null, opts).then( (output) => {
			console.log(output);
			app_state.atlastointer_xform = output.transformation;
			app_state.atlastointer_reslice = output.reslice;
			console.log(app_state.atlastointer_xform);
			console.log(app_state.atlastointer_reslice);
		});

	}

	// calls all of the above custom registration methods in correct order and reslices images as necessary
	computeRegistrationOfImages() {
		if (!app_state.does_have_mri) {
			    
			let p= [ this.registerAtlasToInterictal(true),
			this.registerInterictalToIctal() ];
				
			Promise.all(p).then( () => {

				let input = {
					'input'    : app_state.ictal,
					'xform'    : app_state.atlastointer_xform,
					'xform2'   : app_state.intertoictal_xform,
					'reference': app_state.ATLAS_spect
				};
				let reslicer = new ResliceImage();

				reslicer.execute(input).then( () => {
					app_state.atlastoictal_reslice = reslicer.getOutputObject('output');
				});

			});
		} else {
			
			let p1 = [this.registerAtlasToMRI(), this.registerMRIToInterictal(), this.registerInterictalToIctal()];

			let reslicer = new ResliceImage();

			Promise.all(p1).then( () => {
				let input = {
					'input' : app_state.ictal,
					'xform' : app_state.atlastomri_xform,
					'xform2': app_state.mritointer_xform,
					'xform3': app_state.intertoictal_xform,
					'reference': app_state.ATLAS_spect
				};

				reslicer.execute(input).then( () => {
					app_state.atlastoictal_reslice =reslicer.getOutputObject('output');
				});
			});

			let p2 = [this.registerAtlasToMRI(), this.registerMRIToInterictal()];
			
			Promise.all(p2).then( () => {

				let input = {
					'input' : app_state.interictal,
					'xform' : app_state.atlastomri_xform,
					'xform2': app_state.mritointer_xform,
					'reference': app_state.ATLAS_spect
				};

				reslicer.execute(input).then( () => {
					app_state.atlastointer_reslice = reslicer.getOutputObject('output');
				});

			});
		}
	}

	/*
	 * processes spect images (diff spect)
	 * @param {BISImage} interictal - the registered and resliced interictal image
	 * @param {BISImage} ictal - the registered and and resliced ictal image
	 * @param {BISImage} stdev - the standard deviation image across 12 patients
	 * @param {BISImage} stdev - the masking image
	 * @param {float} pvalue - p-value
	 * @param {float} clustersize - cluster size
	 * @returns {object} - the output object
	 * @returns {string} obj.hyper - the hyper cluster statistics
	 * @returns {string} obj.hypo - the hypo cluster statistics
	 * @returns {BISImage} obj.tmap - the tmap image
	 */
	processSpect(interictal, ictal, stdev, mask, pvalue, clustersize) {

		var params = {
			pvalue: pvalue || 0.05,
			clustersize: clustersize || 100,
		};

		var sigma = 16 * 0.4248, d = {};
		var final = [0, 0];

		var names = ['interictal', 'ictal'];
		var images = [interictal, ictal, stdev, mask];

		//  code to verify images all have same size. .getDimensions on each image
		var showerror = false;

		var dim0 = images[0].getDimensions();
		for (var m = 1; m < images.length; m++) {
			var dim1 = images[m].getDimensions();
			var q = Math.abs(dim0[0] - dim1[0]) + Math.abs(dim0[1] - dim1[1]) + Math.abs(dim0[2] - dim1[2]);

			if (q > 0) {
				console.log('Image ' + m + ' is different ' + dim0 + ' , ' + dim1);
				showerror = true;
			}
		}
		if (showerror)
			errormessage('Images Not Of Same Size!');
		// end code to verify that all images have same size.



		for (var i = 0; i <= 1; i++) {
			var masked = bisimagealgo.multiplyImages(images[i], images[3]);
			var smoothed = bisimagesmoothreslice.smoothImage(masked, [sigma, sigma, sigma], true, 6.0, d);
			var normalized = bisimagealgo.spectNormalize(smoothed);
			console.log('+++++ normalized ' + names[i]);
			final[i] = normalized;
		}

		var tmapimage = bisimagealgo.spectTmap(final[0], final[1], images[2], null);
		var outspect = [0, 0];
		var sname = ['hyper', 'hypo'];

		for (i = 0; i <= 1; i++) {
			outspect[i] = bisimagealgo.processDiffSPECTImageTmap(tmapimage, params.pvalue, params.clustersize, (i === 0));
			var stats = outspect[i].stats;
			var str = '#' + sname[i] + ' cluster statistics\n';
			str += '#\tx\ty\tz\tsize\tmaxt\tclusterP\tcorrectP\n';
			for (var j = 0; j < stats.length; j++) {
				str += stats[j].string + '\n';
			}
			console.log(str);
		}
		return {
			tmap: tmapimage, // image
			hyper: outspect[0].stats, // strings
			hypo: outspect[1].stats, // strings
		};
	}


	

	// processes registered SPECT images and generates hyperperfusion and hypoperfusion stats
	computeSpectNoMRI() {
		console.log("compute spect no MRI");
		var resliced_inter = app_state.atlastointer_reslice;
		var resliced_ictal = app_state.atlastoictal_reslice;

		var results = this.processSpect(resliced_inter, resliced_ictal, app_state.ATLAS_stdspect, app_state.ATLAS_mask);

		console.log(results);
		//	console.log('Hyperactivity :'+results.hyper[0].string + results.hyper[1].string + results.hyper[2].string + results.hyper[3].string);
		//	console.log('Hypoactivity :'+results.hypo[0].string + results.hypo[1].string + results.hypo[2].string + results.hypo[3].string);

		console.log();
		console.log();

		var hyper_str = '';
		hyper_str += '#\tI\tJ\tK\tsize\tmaxT\tclusterP\tactualP\n';
		for (var i = 0; i < results.hyper.length; i++) {
			hyper_str += results.hyper[i].string + '\n';
		}
		app_state.hyper = hyper_str;

		var hypo_str = 'hypo cluster statistics \n';
		hypo_str += '#\tx\ty\tz\tsize\tmaxT\tclusterP\tactualP\n';
		for (var k = 0; k < results.hypo.length; k++) {
			hypo_str += results.hypo[k].string + '\n';
		}

		console.log(hyper_str);
		console.log();
		console.log();
		console.log(hypo_str);
		this.displayData(hyper_str);
		app_state.tmap = results.tmap;
	}

	// button callback for computing diff spect data
	computeSpect() {
		console.log("compute spect callback");
		this.computeSpectNoMRI();

		this.showTmapImage();
	}

	// shows diff spect output data table
	displayData(hyper) {
		resultsmessagebox(hyper);
	}

	// --------------------------------------------------------------------------------
	// Load lots of images
	// --------------------------------------------------------------------------------
	loadimagearray(imgnames, alldone) {

		var numimages = imgnames.length;
		var images = new Array(numimages);

		for (let i = 0; i < numimages; i++)
			images[i] = new BisWebImage();

		let p = [];
		for (let i = 0; i < numimages; i++)
			p.push(images[i].load(imgnames[i]));
		Promise.all(p)
			.then(function () { alldone(images); })
			.catch((e) => { errormessage(e); });
	}

	// --------------------------------------------------------------------------------
	// Read Interictal
	// --------------------------------------------------------------------------------
	handleGenericFileSelect(imgfile, img, show, comment, nextfunction) {

		const self = this;

		var imageread = ((vol) => {
			console.log('Image read :' + vol.getDescription(''));
			app_state[img] = vol;
			if (show) {
				console.log('loaded ' + img + '--> (' + comment + ') ' + app_state[img].getDescription());
				nextfunction();
			}
		});

		let newimage = new BisWebImage();
		newimage.load(imgfile, false).then(
			function () { imageread(newimage); });
		//						.catch( (e) => { errormessage(e); });
	}

	handlePatientFileSelect(file) {
		const self = this;
		console.log('this', this, file);
		app_state.sm_carousel.carousel('next');
		bisgenericio.read(file).then((contents) => {
			let a = contents.data;
			try {
				let obj = JSON.parse(a);
			} catch (e) {
				errormessage(e);
			}
			self.fillFields(a);
		}).catch((e) => { errormessage(e); });
	}

	fillFields(b, url) {

		var file;
		file = url;
		var input = b;
		var interictal = null, ictal = null, tmap = null, hyper = null, intertoictal = null, atlastointer = null, atlastoictal = null;

		if (input.inter !== "") {
			interictal = new BisWebImage();
			interictal.parseFromJSON(input.inter);
			this.state_machine.interictal_loaded = true;
		}

		if (input.ictal !== "") {
			ictal = new BisWebImage();
			ictal.parseFromJSON(input.ictal);
			this.state_machine.ictal_loaded = true;
		}

		if (input.tmap !== "") {
			tmap = new BisWebImage();
			tmap.parseFromJSON(input.tmap);
			this.state_machine.images_processed = true;
		}

		if (input.intertoictal !== "") {
			intertoictal = bistransformations.createLinearTransformation();
			intertoictal.parseFromJSON(input.intertoictal);
		}

		console.log(input.atlastointer);
		if (input.atlastointer !== "") {
			atlastointer = bistransformations.createLinearTransformation();
			atlastointer.parseFromJSON(input.atlastointer);
		}

		if (input.atlastoictal !== "") {
			atlastoictal = bistransformations.createLinearTransformation();
			atlastoictal.parseFromJSON(input.atlastoictal);
		}

		if (null !== intertoictal &&
			null !== atlastointer &&
			null !== atlastoictal)
			this.state_machine.images_registered = true;

		if (null !== input.hyper)
			hyper = input.hyper;

		app_state.patient_name = input.name;
		app_state.patient_number = input.number;
		app_state.interictal = interictal;
		app_state.ictal = ictal;
		app_state.tmap = tmap;
		app_state.intertoictal_xform = intertoictal;
		app_state.atlastointer_xform = atlastointer;
		app_state.atlastoictal_xform = atlastoictal;
		app_state.hyper = hyper;
		if (null !== app_state.hyper)
			createChart();
		if (null !== app_state.tmap) {
			app_state.viewer.setimage(app_state.ATLAS_mri);
			app_state.viewer.setobjectmap(app_state.tmap, false, 'overlay');
		}

		$('#sm_patientName').val(input.name);
		$('#sm_patientNumber').val(input.number);

	}
	// --------------------------------------------------------------------------------


	// --------------------------------------------------------------------------------
	// Load Atlas Images
	// --------------------------------------------------------------------------------

	loadAtlas() {


		var alldone = ((images) => {

			console.log("~~~~~~~~~~~~~~~~~~~~~~~");
			for (var i =0; i < 4; i++) {
				console.log(images[i]);
			}
			console.log("~~~~~~~~~~~~~~~~~~~~~~~");

			app_state.ATLAS_spect = images[0];
			app_state.ATLAS_mri = images[1];
			app_state.ATLAS_stdspect = images[2];
			app_state.ATLAS_mask = images[3];
			app_state.viewer.setimage(app_state.ATLAS_mri);
			console.log('ATLAS images loaded');
			webutil.createAlert('The SPECT Tool is now ready. The core data has been loaded.<BR> Click either "Create New Patient" or "Load Existing Patient" to begin.');
		});

		this.loadimagearray(['../../images/ISAS_SPECT_Template.nii.gz',
			'images/MNI_T1_2mm_stripped_ras.nii.gz',
			'../../images/ISASHN_Standard_Deviation.nii.gz',
			'../../images/ISAS_SPECT_Mask.nii.gz'
		], alldone);


	}

	// --------------------------------------------------------------------------------
	// GUI Callbacks
	// -------------------------------------------------------------------------------
	createNewPatient(patientname, patientnumber) {
		if ('' === patientname ||
			'' === patientnumber ||
			null === patientname ||
			null === patientnumber) {
			errormessage('please enter a name and ID number for the new patient');
			return false;
		}

		app_state.patient_name = patientname;
		app_state.patient_number = patientnumber;
		return true;

	}

	// --------------------------------------------------------------------------------
	// Create the SPECT Tool GUI
	// --------------------------------------------------------------------------------

	initializeSpectTool() {

		const self = this;
		self.loadAtlas()
		var sm_carousel = $('#myCarousel');
		app_state.sm_carousel = sm_carousel;
		console.log(app_state.sm_carousel);

		// TABS Carousel
		// New Or Existing, Patient Setup, Load InterIctal, Load ICTAL, MRI?, Process
		// HTML defined in template in spectviewer.html

		//--------------------------------------------------
		// Navigation Buttons -- Move between tabs
		//--------------------------------------------------
		var prevButton = webutil.createbutton({
			name: 'Prev',
			type: 'danger',
			css: { 'width': '265px' },
			parent: $('#navigationButtons'),
			callback: function () { sm_carousel.carousel('prev'); }
		});



		var nextButton = webutil.createbutton({
			name: 'Next',
			type: 'success',
			css: { 'width': '265px' },
			parent: $('#navigationButtons'),
			callback: function () { sm_carousel.carousel('next'); }
		});
		webutil.addtooltip(prevButton);
		webutil.addtooltip(nextButton);
		// -------------------------------------------------
		// Tab 1/6 -- New or Existing patient
		// -------------------------------------------------



		var newPatientButton = $('#newPatientButton');
		console.log(newPatientButton);
		self.elements.continuePatientButton = $('#continuePatientButton');
		self.elements.continuePatientButton.click(function () {
			sm_carousel.carousel(1);
			if (!webutil.inElectronApp()) {
				webfileutil.webFileCallback(
					{
					title: 'Load Spect Patient File',
					save: false,
					suffix : ".spect",
					},
					function(f) {
						self.handlePatientFileSelect(f);
					});
			} else {
				webfileutil.electronFileCallback({
					title: 'Load Spect Patient File',
					save: false,
					filters: [{ name: "Patient Spect file", extensions: ['spect'] },
					{ name: "Old Patient Spect file", extensions: ['json'] }],
					defaultpath: '',
				},
					self.handlePatientFileSelect);
			}
		});
		

		
		 /* spins the carousel to the next slide*/
		 
		newPatientButton.click(() =>  {
			console.log('newPatientButton was clicked');
			sm_carousel.carousel('next');
		});

		console.log(newPatientButton);

		// -------------------------------------------------

		console.log(newPatientButton);
		// Tab 2/6 New Patient Info
		// -------------------------------------------------
		var sm_patientname = $('sm_patientName'), sm_patientnumber = $('sm_patientNumber');
		var sm_item2 = $('#smitem2');
		$('#nextslidefromloadedimage').hide();

		// using bis_webutil to create custom buttons with callback onclick
		// button will eventually save self patients data by name and patient ID
		var sm_registerPatient = webutil.createbutton({
			type: 'primary',
			name: 'Create Patient',
			css: { 'width': '275px' },
			parent: sm_item2,
			callback: function () {
				if (self.createNewPatient(sm_patientname.val(), sm_patientnumber.val()))
					sm_carousel.carousel('next');

				console.log('button pressed');
			}
		}
		);

		webutil.tooltip(sm_registerPatient);
		// -------------------------------------------------
		// Tab 3/6 Load All Images
		// -------------------------------------------------

		var interictalLoaded = (() => {
			self.state_machine.interictal_loaded = true;
			app_state.viewer.setimage(app_state.interictal);
			webutil.enablebutton(showInterictal, true);
			console.log(app_state.interictal);
		});

		var handleInterictalFileSelect = ((evt) => {
			self.handleGenericFileSelect(evt,
				'interictal',
				true, // Whether to show to viewer
				'Inter-Ictal', // Name
				interictalLoaded); // function to call when successful
		});

		webfileutil.attachFileCallback(
			webutil.createbutton({
			type: 'primary',
			name: 'Load Interictal',
			parent: $('#btn1'),
			css: { 'width': '150px' },
			callback: handleInterictalFileSelect,
			accept: "NII",
		}, {
				filename: '',
				title: 'Select file to load Interictal SPECT from',
				filters: "NII",
				save: false,
			}), handleInterictalFileSelect);


/*
-----------------------------------------------------------------------------------------------
		Handle Loading Ictal SPECT image
-----------------------------------------------------------------------------------------------
 */

		var ictalLoaded = function () {
			self.state_machine.ictal_loaded = true;
			app_state.viewer.setimage(app_state.ictal);
			webutil.enablebutton(showIctal, true);
			console.log(app_state.ictal);
		};
		var handleIctalFileSelect = function (evt) {
			self.handleGenericFileSelect(evt,
				'ictal',
				true, // Whether to show to viewer
				'Ictal', // Name
				ictalLoaded); // function to call when successful
		};


		webfileutil.attachFileCallback(
			webutil.createbutton({
				type: 'primary',
				name: 'Load Ictal',
				parent: $('#btn2'),
				css: { 'width': '150px' },
				accept: "NII",
			}, {
				filename: '',
				title: 'Select file to load Ictal SPECT from',
				filters: "NII",
				save: false,
			}), handleIctalFileSelect);
/*
------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------
 */





/*
------------------------------------------------------------------------------------------------
		Handle Loading MRI 
------------------------------------------------------------------------------------------------
 */
		var MRILoaded = function () {
			app_state.does_have_mri = true;
			app_state.viewer.setimage(app_state.mri);
			self.state_machine.mri_loaded = true;
			webutil.enablebutton(showMRI, true);
		};

		var handleMRIFileSelect = function (evt) {
			self.handleGenericFileSelect(evt, 'mri', true, 'MRI', MRILoaded);
		};


		webfileutil.attachFileCallback(	webutil.createbutton({
			type: 'primary',
			name: 'Load MRI',
			css: { 'width': '150px' },
			parent: $('#btn3'),
			accept: "NII",
		}, {
				filename: '',
				title: 'Select file to load MRI image from',
				filters: "NII",
				save: false,
			}),
			handleMRIFileSelect);
/*
------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------
 */
		var showInterictal = webutil.createbutton({
			type: 'primary',
			name: 'Show',
			css: { 'width': '150px' },
			parent: $('#btn1'),
			callback: function () {
				app_state.viewer.setimage(app_state.interictal);
			}
		});
		webutil.enablebutton(showInterictal, false);

		var showIctal = webutil.createbutton({
			type: 'primary',
			name: 'Show',
			css: { 'width': '150px' },
			parent: $('#btn2'),
			callback: function () {
				app_state.viewer.setimage(app_state.ictal);
			}
		});
		webutil.enablebutton(showIctal, false);

		var showMRI = webutil.createbutton({
			type: 'primary',
			name: 'Show',
			css: { 'width': '150px' },
			parent: $('#btn3'),
			callback: function () {
				app_state.viewer.setimage(app_state.mri);
			}
		});
		webutil.enablebutton(showMRI, false);

		//----------------------------------------------------------------------------------------
		//Register Images
		//----------------------------------------------------------------------------------------
		var registerImages = webutil.createbutton({
			type: 'primary',
			name: 'Register Images',
			parent: $('#div1'),
			css: { 'width': '275px' },
			callback: function () {
				bootbox.alert("Please wait while your images are registered");
				console.log('call back reached');
				self.computeRegistrationOfImages();
				console.log('registering');
				webutil.enablebutton(sm_showAtlasToInter, true);
				webutil.enablebutton(sm_showAtlasToIctal, true);
				webutil.enablebutton(sm_showInterictalToIctal, true);
				console.log('buttons shown');
				self.state_machine.images_registered = true;
			}
		});
		webutil.createcheckbox({
			name: 'Nonlinear for ATLAS to Interictal',
			type: 'warning',
			parent: $('#div1_5'),
			css: { 'margin-left': '15px' },
			callback: function () {
				if (!app_state.nonlinear)
					app_state.nonlinear = true;
				else
					app_state.nonlinear = false;

				console.log(app_state.nonlinear);
			}
		});

		var sm_showAtlasToInter = webutil.createbutton({
			type: 'info',
			name: 'Show Atlas To Interictal Registration',
			parent: $('#div2'),
			css: { 'width': '275px' },
			callback: self.showAtlasToInterictalRegistration
		});
		webutil.enablebutton(sm_showAtlasToInter, false);
		var sm_showAtlasToIctal = webutil.createbutton({
			type: 'info',
			name: 'Show Atlas To Ictal Registration',
			css: { 'width': '275px' },
			parent: $('#div3'),
			callback: self.showAtlasToIctalRegistration
		});
		webutil.enablebutton(sm_showAtlasToIctal, false);
		var sm_showInterictalToIctal = webutil.createbutton({
			type: 'info',
			name: 'Show Interictal To Ictal Registration',
			css: { 'width': '275px' },
			parent: $('#div4'),
			callback: self.showInterictalToIctalRegistration
		});
		webutil.enablebutton(sm_showInterictalToIctal, false);

		//----------------------------------------------------------------------------------------------------
		// Process Diff Spect
		//----------------------------------------------------------------------------------------------------
		var sm_processspectbutton = webutil.createbutton({
			type: 'primary',
			name: 'Process Diff SPECT',
			parent: $('#processSpectDiv'),
			tooltip: 'Self may take a while...',
			css: { 'width': '275px' },
			position: 'left',
			callback: function () {
				bootbox.alert("Please wait while the images are processes");
				console.log("started spect processing");
				self.computeSpect();
				self.state_machine.images_processed = true;
				webutil.enablebutton(sm_showTmapButton, self.state_machine.images_processed);
				//self.createChart();
				//console.log("finished spect processing");
			}
		});


		var sm_showTmapButton = webutil.createbutton({
			type: 'info',
			name: 'Show Tmap Image',
			parent: $('#showTmapDiv'),
			css: { 'width': '275px' },
			callback: self.showTmapImage
		});
		webutil.enablebutton(sm_showTmapButton, false);

		sm_carousel.on('slide.bs.carousel', function () {
			webutil.enablebutton(registerImages, (self.state_machine.ictal_loaded && self.state_machine.interictal_loaded));
			webutil.enablebutton(showIctal, self.state_machine.ictal_loaded);
			webutil.enablebutton(showInterictal, self.state_machine.interictal_loaded);
			webutil.enablebutton(sm_processspectbutton, self.state_machine.images_registered);
			webutil.enablebutton(sm_showAtlasToInter, self.state_machine.images_registered);
			webutil.enablebutton(sm_showInterictalToIctal, self.state_machine.images_registered);
			webutil.enablebutton(sm_showAtlasToIctal, self.state_machine.images_registered);
			webutil.enablebutton(sm_showTmapButton, self.state_machine.images_processed);
			app_state.patient_name = $('#sm_patientName').val();
			app_state.patient_number = $('#sm_patientNumber').val();
		});

		webutil.addtooltip(sm_showTmapButton);
		webutil.addtooltip(sm_processspectbutton);
		webutil.addtooltip(sm_showAtlasToInter);
		webutil.addtooltip(sm_showAtlasToIctal);

		var HandleFiles = function (files) {
			sm_carousel.carousel(1);
			handlePatientFileSelect(files[0]);
		};
		webutil.createDragAndCropController(HandleFiles);


		$('#treeDiv').jstree(
			{
				"json_data": 
				{
					"data": [
						{
							"data": "Images",
							"children": []
						},
						{
							"data": "Registrations",
							"children": []
						},
						{
							"data": "Diff SPECT",
							"children": []
						}
								
					],
				},
				"plugins": ["themes", "json_data", "ui"]

			}
		).bind("select_node.jstree", (e,data) => {

		});


		
	}

	createChart() {
		const self = this;

		var coordinates = self.parseCoordinates(app_state.hyper);
		var substrs = self.parseNewLine(app_state.hyper);
		for (var i = 0; i < substrs.length; i++)
			substrs[i] = substrs[i].fontsize(0.001);

		var heading = '#\tI\tJ\tK\tsize\tmaxT\tclusterP\tactualP';
		heading = heading.fontsize(0.0001);

		var head = $('#headLab'), one = $('#lab1'), two = $('#lab2'), three = $('#lab3'), four = $('#lab4');
		head.html('<PRE>' + heading + '</PRE>');
		one.html('<PRE>' + substrs[0] + '</PRE>');
		two.html('<PRE>' + substrs[1] + '</PRE>');
		three.html('<PRE>' + substrs[2] + '</PRE>');
		four.html('<PRE>' + substrs[3] + '</PRE>');


		one.click(function () {
			var coordinate = coordinates[0];
			app_state.viewer.setcoordinates([coordinate.I, coordinate.J, coordinate.K]);
			one.css('border', '2px solid #246BB2');
			two.css("border", "0px");
			three.css("border", "0px");
			four.css("border", "0px");
		});

		two.click(function () {
			var coordinate = coordinates[1];
			app_state.viewer.setcoordinates([coordinate.I, coordinate.J, coordinate.K]);
			one.css("border", "0px");
			two.css("border", "2px solid #246BB2");
			three.css("border", "0px");
			four.css("border", "0px");
		});

		three.click(function () {
			var coordinate = coordinates[2];
			app_state.viewer.setcoordinates([coordinate.I, coordinate.J, coordinate.K]);
			one.css("border", "0px");
			two.css("border", "0px");
			three.css("border", "2px solid #246BB2");
			four.css("border", "0px");
		});

		four.click(function () {
			var coordinate = coordinates[3];
			app_state.viewer.setcoordinates([coordinate.I, coordinate.J, coordinate.K]);
			one.css("border", "0px");
			two.css("border", "0px");
			three.css("border", "0px");
			four.css("border", "2px solid #246BB2");
		});
	}


	showAtlasToInterictalRegistration() {
		
		console.log(app_state.ATLAS_spect);
		app_state.viewer.setimage(app_state.ATLAS_spect);
		app_state.viewer.setobjectmap(app_state.atlastointer_reslice,false,'overlay');
	}

	showInterictalToIctalRegistration() {
		app_state.viewer.setimage(app_state.interictal);
		app_state.viewer.setobjectmap(app_state.intertoictal_reslice,false,'overlay');
	}

	showAtlasToIctalRegistration() {
			app_state.viewer.setimage(app_state.ATLAS_spect);
			app_state.viewer.setobjectmap(app_state.atlastoictal_reslice,false,'overlay');
	}

	showTmapImage() {
		app_state.viewer.setimage(app_state.ATLAS_mri);
		app_state.viewer.setobjectmap(app_state.tmap, false);
	}

	parseNewLine(str) {
		var indeciesOfNewLine = [];
		var substrs = [];
		for (var i = 0; i < str.length; i++)
			if (str.charAt(i) === "\n")
				indeciesOfNewLine.push(i);

		for (var j = 0; j < indeciesOfNewLine.length; j++)
			substrs.push(str.substring(indeciesOfNewLine[j] + 1, indeciesOfNewLine[j + 1]));

		return substrs;
	}

	parseCoordinates(str) {

		var substrs = parseNewLine(str);
		console.log(substrs[0]);
		var coordinates = [];
		for (var q = 0; q < substrs.length; q++) {
			var newstr = substrs[q];

			var indeciesOfTab = [];
			var k = 0;
			for (var s = 0; s < newstr.length; s++) {
				if (newstr.charAt(s) === "\t") {
					indeciesOfTab.push(s);
					k++;
				}
				if (k > 3)
					break;


			}

			coordinates.push({
				I: newstr.substring(indeciesOfTab[0] + 1, indeciesOfTab[1]),
				J: newstr.substring(indeciesOfTab[1] + 1, indeciesOfTab[2]),
				K: newstr.substring(indeciesOfTab[2] + 1, indeciesOfTab[3])
			});
		}
		return coordinates;

	}


	connectedCallback() {
		// --------------------------------------------------------------------------------
		// Finally the actual function
		// --------------------------------------------------------------------------------

		const self = this;
		const menubarid = this.getAttribute('bis-menubarid');
		let menubar = document.querySelector(menubarid).getMenuBar();
		const consoleid = this.getAttribute('bis-consoleid') || null;

		menubar.append('<li class="dropdown">' +
			'<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">File <span class="caret"></span></a>' +
			' <ul class="dropdown-menu" role="menu">' +
			'   <li><a href="#" id="newpatient">New Patient</a></li>' +
			'  <li class="divider"></li>' +
			'   <li><a href="#" id="loadpatient">Load Patient</a></li>' +
			'   <li><a href="#" id="savepatient">Save Patient</a></li>' +
			'   <li><a href="#" id="showpanel">Show Spect Tool</a></li>' +
			' </ul>' +
			'</li>');

		let layoutid = this.getAttribute('bis-layoutwidgetid');
		let layoutcontroller = document.querySelector(layoutid);
		
		app_state.viewer = document.querySelector(this.getAttribute('bis-viewerid'));


		
		this.panel=new BisWebPanel(layoutcontroller,
					  {  name  : 'Diff Spect Tool',
					     permanent : false,
					     width : '300',
					     dual : false,
					     mode : 'sidebar'
					  });
		let spectToolsDiv = this.panel.getWidget();
		console.log(this.panel);
		app_state.viewer.collapseCore();

		$('#loadpatient').click(function () {
			self.elements.continuePatientButton.click();
		});

		$('#savepatient').click(function () {
			self.saveData();
		});

		if (consoleid !== null) {
			let console = document.querySelector(consoleid);
			console.addtomenubar(menubar);
		}



		$('#newpatient').click(function () {
			var pn = spectToolsDiv.parent();
			pn.collapse('show');
			app_state.sm_carousel.carousel(0);
			$('#newPatientButton').click();

		});






		// stamp template

		//let sm_div=$(spect_template_string);
		let tree_div=$(tree_template_string)
		//spectToolsDiv.append(sm_div);
		spectToolsDiv.append(tree_div);

		this.initializeSpectTool();	
		this.panel.show();

		$('#showpanel').click( () => {
			this.panel.show();
		    });

	}
}

webutil.defineElement('bisweb-diffspectelement', DiffSpectElement);
