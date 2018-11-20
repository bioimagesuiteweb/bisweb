/* globals test, fixture, $, document */

import { Selector, t } from 'testcafe';
import { ClientFunction } from 'testcafe';
import fs from 'fs';

fixture`Overlay Tests`.page`https://git.yale.edu/pages/zls5/webapp/connviewer.html`;

test('Open Menus', async t => {
	const viewerControlsMenu = Selector('a').withText('Viewer Controls');
	const viewerSnapshot = Selector('a').withText('Viewer Snapshot');
	const connectivityControl = Selector('a').withText('Connectivity Control');

	await t
		.click(viewerControlsMenu)
		.click(viewerSnapshot)
		.click(connectivityControl)
		.takeSnapshot('check_conn/OpenMenus.png')
		.click(viewerControlsMenu)
		.click(viewerSnapshot)
		.click(connectivityControl)
		.takeSnapshot('check_conn/CloseMenus.png');
});

