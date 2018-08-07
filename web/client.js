"use strict";

/*jshint browser: true*/
/*jshint undef: true, unused: true */
/*global window */


const $ = require('jquery');
const bootbox = require('bootbox');
const webutil = require('bis_webutil');
const genericio = require('bis_genericio');
var user = {
    hash: '',
};


var filedialog = {
    modal: null,
    dialog: null,
    fileselect: null,
    directory: null,
    lastdata: null,
    lastselected: null,
};

var getdata = function (dir, done) {

    dir = dir || '';
    done = done || console.log;

    if (user.hash === '') {
        console.log('no user specified\n');
        return;
    }
    var url = 'http://localhost:8088/_files?mode=json&path=' + dir;
    console.log('going for ' + url);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'text';
    console.log('user.hash=', user.hash);
    xhr.setRequestHeader("Authorization", user.hash);
    xhr.onload = function () {
        console.log('Loaded', this.status);
        if (this.status == 200) {
            done(xhr.response);
        } else {
            console.log('Error' + xhr.response);
        }
        return false;
    };

    xhr.onerror = function () {
        console.log('Failed to get url=' + url);
    };

    xhr.send();
    return false;
};


var connect = function (username, password, done) {
    var xhr = new XMLHttpRequest();
    var url = 'http://localhost:8088/login';
    console.log([url, true, username, password]);
    xhr.open('GET', url, true);
    xhr.responseType = 'text';
    var s = username + ':' + password;
    console.log('s=', s, window.btoa(s));
    var q = "Basic " + window.btoa(s);
    xhr.setRequestHeader("Authorization", q);
    xhr.onload = function () {
        if (this.status == 200) {
            user.hash = q;
            console.log('user.hash=', user.hash);
            done();
        } else {
            console.log('FAILED=' + xhr.response);
        }
        return false;
    };

    xhr.onerror = function () {
        console.log('Failed to get url=' + url);
    };

    xhr.send();
    return false;
};

var authenticate = function (done, servername) {

    servername = servername || 'localhost';

    var nid = new Date().getTime();
    var nameid = 'name' + nid;
    var passid = 'password' + nid;
    var message = '<div class="row">  ' +
        '<div class="col-md-12"> ' +
        '<form class="form-horizontal"> ' +
        '<div class="form-group"> ' +
        '<label class="col-md-4 control-label" for="name">Name</label> ' +
        '<div class="col-md-4"> ' +
        '<input name="name" id="' + nameid + '" type="text" placeholder="Your name" class="form-control input-md"> ' +
        '</div> ' +
        '</div> ' +
        '<div class="row">  ' +
        '<div class="col-md-12"> ' +
        '<form class="form-horizontal"> ' +
        '<div class="form-group"> ' +
        '<label class="col-md-4 control-label" for="password">Password</label> ' +
        '<div class="col-md-4"> ' +
        '<input id="' + passid + '" name="password" type="password" placeholder="" class="form-control input-md"> ' +
        '</div> ' +
        '</div> ' +
        '</form> </div>  </div>';

    bootbox.dialog({
        title: "Please enter username and password to log in to " + servername + " local file server",
        message: message,
        buttons: {
            success: {
                label: "Log in",
                className: "btn-default",
                callback: function () {
                    var name = $('#' + nameid).val();
                    var password = $('#' + passid).val();
                    connect(name, password, done);
                }
            }
        }
    });
};

var showdata = function (jsonstring) {

    var obj = JSON.parse(jsonstring);
    var dir = obj.basedir;
    var data = obj.data;
    filedialog.lastdata = obj;

    console.log('obj=', obj.basedir, obj.childdir);

    filedialog.fileselect.empty();
    var l = data.length, i = 0;

    var dirmode = true, e, b;

    var n = 'Directory=' + dir;
    filedialog.directory.text(n);

    for (var pass = 0; pass <= 1; pass++) {
        if (pass === 1)
            dirmode = false;
        for (i = 0; i < l; i++) {
            e = data[i];
            if (e.IsDirectory === dirmode) {
                if (dirmode === true)
                    b = $("<option value=\"" + i + "\">[" + e.Name + "]</option>");
                else
                    b = $("<option value=\"" + i + "\">" + e.Name + "</option>");
                filedialog.fileselect.append(b);
            }
        }
    }
};

var loaded = function (data, url) {
    bootbox.alert(data.length + ' bytes read from\n\t ' + filedialog.lastdata.basedir + url);
    return false;
};

var selectedfile = function (e) {
    console.log('directory=', e.target.value);
    var elem = filedialog.lastdata.data[e.target.value];
    if (elem.IsDirectory) {
        getdata(elem.Path, showdata);
    } else {
        filedialog.lastselected = elem.Path;
    }
};

var loadfile = function () {
    var p = filedialog.lastselected;
    console.log('here p=', p);
    genericio.readbinarydatafromurl(p, loaded, console.log);
    filedialog.modal.dialog.modal('hide');
};


var createfiledialog = function () {

    if (filedialog.modal !== null) {
        filedialog.modal.dialog.modal('show');
        return;
    }

    filedialog.modal = webutil.createmodal('Server File Browser');

    webutil.createbutton({
        type: "success",
        name: "Load",
        callback: loadfile,
        parent: filedialog.modal.footer,
    });

    var nid = new Date().getTime();
    var fileid = 'password' + nid;
    var dirid = 'dir' + nid;
    var message = '<div class="row">  ' +
        '<div class="col-md-12"> ' +
        '<form class="form-horizontal"> ' +
        '<div class="form-group"> ' +
        '<label class="col-md-6 control-label" for="File" id="' + dirid + '">Select File</label> ' +
        '<div class="col-md-6"> ' +
        '<select id="' + fileid + '" size="10" name="File" type="File" placeholder="" class="form-control input-md"></select> ' +
        '</div> ' +
        '</div> ' +
        '</form> </div>  </div>';

    var m = $(message);
    console.log(m.html());
    filedialog.modal.body.append(m);
    filedialog.fileselect = $('#' + fileid);
    filedialog.directory = $('#' + dirid);

    filedialog.fileselect.change(function (e) {
        e.preventDefault(); // cancel default behavior
        selectedfile(e);
    });

    console.log(filedialog.directory);
    filedialog.modal.dialog.modal('show');
};

var loggedin = function () {

    if (user.hash !== '') {
        console.log('we are good to go');
        createfiledialog();
        getdata('', showdata);
    } else {
        authenticate(loggedin, 'localhost');
    }


};

window.onload = function () {

    authenticate(loggedin, 'localhost');

};

