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

'use strict';

const BisWebDataObjectCollection = require('bisweb_dataobjectcollection.js');
const webutil = require('bis_webutil.js');

class DatabaseTable extends BisWebDataObjectCollection {

	constructor() {
		super();
	}

	addItem(dataobj, id, metadata = {}) {
		metadata.id = id;
		super.addItem(dataobj, metadata);
	}

	makeItemAndAdd(name, input, type, metadata = null) {
		let dict = {
			'data': input,
			'metadata': {
				'id': webutil.getuniqueid(),
				'description': 'Created ' + webutil.createTimestamp(),
				'name': name,
				'type': type
			}
		};

		//Add additional metadata parameters to the object before pushing it
		if (metadata) {
			for (let key of Object.keys(metadata)) {
				dict.metadata[key] = metadata[key];
			}
		}

        this.itemlist.push(dict);
        return dict;
	}

	getItemById(id) {
		for (let i = 0; i < this.itemlist.length; i++) {
			if (this.itemlist[i].metadata.id === id) {
				return this.itemlist[i];
			}
		}
	}

	removeItemById(id) {
		for (let i = 0; i < this.itemlist.length; i++) {
			if (this.itemlist[i].metadata.id === id) {
				this.removeItem(i);
				return;
			}
		}
	}

	/**
	 * Tries to find an entry in itemlist with a specified id and update it with new data and metadata.
	 * Returns true if successful, false if not.
	 */
	updateItemById(id, data, metadata) {
		for (let i = 0; i < this.itemlist.length; i++) {
			if (this.itemlist[i].metadata.id === id) {
				let entry = this.itemlist[i];
				for (let key of Object.keys(metadata)) {
					console.log('updating item with name', entry.metadata.name, 'for key', key, 'to have value', metadata[key]);
					entry.metadata[key] = metadata[key];
				}

				if (data !== null) {
					entry.data = data;
				}
				return entry;
			}
		}

		return false;
	}

	updateNameById(id, name) {
		this.updateItemById(id, null, { 'name' : name });
	}

}

module.exports = DatabaseTable;

