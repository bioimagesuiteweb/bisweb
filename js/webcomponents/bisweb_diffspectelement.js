/*global window,document,HTMLElement */

"use strict";

const bisimagesmoothreslice = require('bis_imagesmoothreslice');
const bistransformations = require('bis_transformationutil');
const bisweb_image = require('bisweb_image');
const webutil = require('bis_webutil');
const webfileutil = require('bis_webfileutil');
const bisimagealgo = require('bis_imagealgorithms');
const bisgenericio = require('bis_genericio');
const $ = require('jquery');
const numeric = require('numeric');
const bootbox = require('bootbox');
const LinearRegistration = require('linearRegistration');
const NonlinearRegistration = require('nonlinearRegistration');
const baseutils = require('baseutils');

const spect_template = `
						
			<template id='carousel_template'>
			<div class="container" style="width:570px">		
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
		</template>
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
	}

	// --------------------------------------------------------------------------------
	saveData() {

		console.log('this =', this);
		var strIctal = "", strInterictal = "", strTmap = "";
		var strReg_AT_IN = "", strReg_IN_IC = "", strReg_AT_IC = "";

		//serializing transformations
		if (null !== app_state.atlastointer)
			strReg_AT_IN = window.btoa(app_state.atlastointer.serializeToJSON());

		if (null !== app_state.intertoictal)
			strReg_IN_IC = window.btoa(app_state.intertoictal.serializeToJSON());

		if (null !== app_state.atlastoictal)
			strReg_AT_IC = window.btoa(app_state.atlastoictal.serializeToJSON());

		console.log('here 1');
		//serializing images 

		if (null !== app_state.interictal)
			strInterictal = app_state.interictal.serializeToJSON();

		console.log('here 2');

		if (null !== app_state.ictal)
			strIctal = app_state.ictal.serializeToJSON();

		if (null !== app_state.tmap)
			strTmap = app_state.tmap.serializeToJSON();


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
	 * computes a registration 
	 * @param {BISImage} reference- the reference image
	 * @param {BISImage} target - the target image
	 * @param {array} initial - initial params for the registration
	 * @param {object} params - options for the registration 
	 * @returns {BISTransformation} - the output of the registration
	 */
    computeRegistration(reference, target, initial, params) {

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

	// --------------------------------------------------------------------------------
	// Custom Registration Methods
	// --------------------------------------------------------------------------------
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

		this.computeRegistration(app_state.interictal, app_state.ictal, null, opts).then( (output) => {
			console.log(output);
			app_state.intertoictal_xform = output.transformation;
			app_state.intertoictal_reslice = output.reslice;
			console.log(app_state.intertoictal_xform);
			console.log(app_state.intertoictal_reslice);
			});
	}

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



		this.computeRegistration(app_state.ATLAS_spect, app_state.interictal, null, opts).then( (output) => {
			console.log(output);
			app_state.atlastointer_xform = output.transformation;
			app_state.atlastointer_reslice = output.reslice;
			console.log(app_state.atlastointer_xform);
			console.log(app_state.atlastointer_reslice);
		    });

	}


	computeRegistrationOfImages() {
		if (!app_state.does_have_mri) {
			if (!app_state.nonlinear) {
				let mat1;
				let mat2;

				// asynchronous definition for registerAtlasToInterictal 
				let reg1_promise = new Promise((resolve, reject) => {
					try {
						this.registerAtlasToInterictal(true);
					} catch(e) {
						reject(e);
					}
				});


				// asynchronous definition for registerInterictalToIctal
				let reg2_promise = new Promise((resolve, reject) => {
					try {
						this.registerInterictalToIctal();
					} catch(e) {
						reject(e);
					}
				});
				

				let multiply_promise = new Promise((resolve, reject) => {
				  try{
					reg1_promise.then(() => {
						mat1 = app_state.atlastointer.getMatrix();	
					});
					reg2_promise.then(() => {
						mat2 = app_state.atlastointer.getMatrix();	
					});
					let output ={ matrix1:mat1, matrix2:mat2};
					resolve(output);
				  } catch(e) {reject(e);}
					
				//	combo_xform.setMatrix(combo);
				//	app_state.atlastoictal = combo_xform;
				});

				multiply_promise.then((output) => {
					console.log(output);
					let combomat = numeric.dot(output.matrix1, output.matrix2);
					let combo_xform = bistransformations.createLinearTransformation(0);
					combo_xform.setMatrix(combomat);
					app_state.atlastoictal = combo_xform;
				});
				
			}
			else {
				var params = {
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
				this.registerAtlasToInterictal(false);
				var resliced_interictal = new bisweb_image();
				resliced_interictal.cloneImage(app_state.ATLAS_spect);
				bisimagesmoothreslice.resliceImage(app_state.interictal, resliced_interictal, app_state.atlastointer, 1);
				var reg = bisregister.createLinearRegistration(app_state.ictal, resliced_interictal, null, params);
				reg.run();
				app_state.atlastoictal = reg.getTransformation();
			}
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

	createAtlasToInterictal() {
		var resliced_inter;
		this.registerAtlasToInterictal(true);
		resliced_inter = new bisweb_image();
		resliced_inter.cloneImage(app_state.ATLAS_spect);
		console.log(app_state.interictal);
		console.log(app_state.atlastointer);

		bisimagesmoothreslice.resliceImage(app_state.interictal, resliced_inter, app_state.atlastointer, 1);
		console.log('Interictal to atlas: ' + resliced_inter.getDimensions());
		return resliced_inter;
	}

	createAtlasToIctal() {

		if (!app_state.nonlinear) {
			var resliced_ictal;
			var mat1 = app_state.atlastointer.getMatrix();
			var mat2 = app_state.intertoictal.getMatrix();
			console.log('Interictal to ictal new: ' + app_state.intertoictal.getMatrix());
			var combined = numeric.dot(mat1, mat2);
			var combo = bistransformations.createLinearTransformation(0);
			combo.setMatrix(combined);
			app_state.atlastoictal = combo;
			resliced_ictal = new bisweb_image();
			resliced_ictal.cloneImage(app_state.ATLAS_spect);
			bisimagesmoothreslice.resliceImage(app_state.ictal, resliced_ictal, combo, 1);
			console.log('Ictal to atlas: ' + resliced_ictal.getDimensions());
			return resliced_ictal;
		}
		var params = {
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


		var resliced_inter = new bisweb_image();
		resliced_inter.cloneImage(app_state.ATLAS_spect);

		bisimagesmoothreslice.resliceimage(app_state.interictal, resliced_inter, app_state.atlastointer, 1);
		var resliced_ictal2 = new bisweb_image();
		resliced_ictal2.cloneImage(resliced_inter);
		var reg = bisregister.createLinearRegistration(resliced_inter, app_state.ictal, null, params);
		var out = reg.run();

		bisimagesmoothreslice.resliceimage(app_state.ictal, resliced_ictal2, out, 1);
		return resliced_ictal2;
	}



	computeSpectNoMRI() {

		var resliced_inter = this.createAtlasToInterictal();
		var resliced_ictal = this.createAtlasToIctal();

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


	computeSpectWithMRI() {



	}

	computeSpect() {
		if (!app_state.does_have_mri)
			this.computeSpectNoMRI();
		else
			this.computeSpectWithMRI();

		this.showTmapImage();
	}

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
			images[i] = new bisweb_image();

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

		let newimage = new bisweb_image();
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
			interictal = new bisweb_image();
			interictal.parseFromJSON(input.inter);
			this.state_machine.interictal_loaded = true;
		}

		if (input.ictal !== "") {
			ictal = new bisweb_image();
			ictal.parseFromJSON(input.ictal);
			this.state_machine.ictal_loaded = true;
		}

		if (input.tmap !== "") {
			tmap = new bisweb_image();
			tmap.parseFromJSON(input.tmap);
			this.state_machine.images_processed = true;
		}
		console.log(input.intertoictal);
		if (input.intertoictal !== "") {
			intertoictal = bistransformations.createLinearTransformation();
			intertoictal.parseFromJSON(input.intertoictal);
			this.state_machine.images_registered = true;
		}
		console.log(input.atlastointer);
		if (input.atlastointer !== "") {
			atlastointer = bistransformations.createLinearTransformation();
			atlastointer.parseFromJSON(input.atlastointer);
		}

		if (input.atlastoictal !== "") {
			atlastoictal = bistransformations.createLinearTransformation();
			atlastoictal.parseFromJSON(input.atlastointer);
		}

		if (null !== input.hyper)
			hyper = input.hyper;

		app_state.patient_name = input.name;
		app_state.patient_number = input.number;
		app_state.interictal = interictal;
		app_state.ictal = ictal;
		app_state.tmap = tmap;
		app_state.intertoictal = intertoictal;
		app_state.atlastointer = atlastointer;
		app_state.atlastoictal = atlastoictal;
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
		self.loadAtlas();

		var sm_carousel = $('#myCarousel');
		app_state.sm_carousel = sm_carousel;

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
		

		/*
		 * spins the carousel to the next slide
		 */
		newPatientButton.click(function () {
			console.log('newPatientButton was clicked');
			sm_carousel.carousel('next');
		});

		// -------------------------------------------------
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
				self.computeRegistrationOfImages();
				webutil.enablebutton(sm_showAtlasToInter, true);
				webutil.enablebutton(sm_showAtlasToIctal, true);
				webutil.enablebutton(sm_showInterictalToIctal, true);
				self.state_machine.images_registered = true;
				self.showInterictalToIctalRegistration();
			}
		});
		webutil.createcheckbox({
			name: 'Nonlinear for ATLAS to Interictal?',
			type: 'warning',
			parent: $('#div1_5'),
			css: { 'margin-left': '15px' },
			callback: function () {
				if (!app_state.nonlinear)
					app_state.nonlinear = true;
				else
					app_state.nonlinear = false;
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
				self.computeSpect();
				self.state_machine.images_processed = true;
				webutil.enablebutton(sm_showTmapButton, self.state_machine.images_processed);
				self.createChart();
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
		app_state.viewer.setobjectmap(app_state.atlastointer_reslice);
	}

	showInterictalToIctalRegistration() {
		console.log(this);
		console.log(app_state);
		app_state.viewer.setimage(app_state.interictal);
		app_state.viewer.setobjectmap(app_state.intertoictal_reslice);
	}

	showAtlasToIctalRegistration() {
			app_state.viewer.setimage(app_state.ATLAS_spect);
			app_state.viewer.setobjectmap(app_state.atlastoictal_reslice);
	}

	showTmapImage() {
		app_state.viewer.setimage(app_state.ATLAS_mri);
		app_state.viewer.setobjectmap(app_state.tmap, true);
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

	};


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
			' </ul>' +
			'</li>');

		let layoutid = this.getAttribute('bis-layoutwidgetid');
		let layoutcontroller = document.querySelector(layoutid);
		app_state.viewer = document.querySelector(this.getAttribute('bis-viewerid'));

		let spectToolsDiv = layoutcontroller.createToolWidget('Diff Spect Tool', true);
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
		let newDiv = document.createElement("div");
		newDiv.innerHTML = spect_template;
		var sm_template = newDiv.querySelector('#carousel_template');

		var clone = document.importNode(sm_template.content, true);
		var div = webutil.creatediv({ parent: spectToolsDiv });
		div[0].appendChild(clone);

		this.initializeSpectTool();	
	}
}

webutil.defineElement('bisweb-diffspectelement', DiffSpectElement);
