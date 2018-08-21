// IGNORING BIS stuff this is node only
"use strict";
var _ = require('lodash');
var path = require('path');
var fs = require('fs');


/**
 * @file Node.js module. Contains {@link Serverutil}.
 * @author Xenios Papademetris
 * @version 1.0
 */


/** Function to parse a directory and return an array with info for server-assisted file access
    @alias Serverutil.getDirectoryInfo
    @param {string} basedir - absolute base directory
    @param {string} childdir - relative directory to base directory
    @param {callback} done - function to call when ready
*/
var getDirectoryInfo = function (basedir, childdir, done) {
    var data = [];
    fs.readdir(basedir, function (err, files) {
        if (err) {
            throw err;
        }

        data.push({ Name: "..", IsDirectory: true, Path: path.join(childdir, "..") });

        files.filter(function () {
            return true;
        }).forEach(function (file) {
            try {
                var isDirectory = fs.statSync(path.join(basedir, file)).isDirectory();
                if (isDirectory) {
                    data.push({ Name: file, IsDirectory: true, Path: path.join(childdir, file) });
                } else {
                    var lst = file.split('.');
                    var ext = lst.pop();
                    if (ext === "gz")
                        ext = lst.pop() + ".gz";
                    var last = file.slice(-1), first = file.slice(0, 1);
                    if (first === "#" || last === "#" || last === "~" || first === ".")
                        return;

                    var stats = fs.statSync(path.join(basedir, file));
                    var fileSizeInBytes = stats["size"];

                    data.push({ Name: file, Ext: ext, IsDirectory: false, Path: path.join(childdir, file), size: fileSizeInBytes });
                }
            } catch (e) {
                console.log(e);
            }
        });
        data = _.sortBy(data, function (f) { return f.Name; });

        var obj = {
            basedir: basedir,
            childdir: childdir,
            data: data
        };

        done(obj);
    });

    return false;

    /*
      var currentDir =  dir;
      currentDir = path.join(dir, query);
      console.log("browsing ", currentDir,mode);
      if (!fs.statSync(currentDir).isDirectory()) {
      console.log('currentDir=',currentDir,' is not a directory');
      return;
      }
      
      if (mode==='json')
      createdata(currentDir,query,dojson);
      else
      createdata(currentDir,query,dohtml);
      });
    */
};

/** Function to create a Basic Authentication mechanism for express (and hopefully socket io)
    @alias Serverutil.getBasicPassport
    @param {object} app - Express server app
    @param {function} validate - a callback of the form validate(username,password) -- returns true or falsea
    @return {object} Passport object
*/
var createBasicPassport = function (app, validate) {

    var passport = require('passport'), BasicStrategy = require('passport-http').BasicStrategy;
    var session = require('express-session');

	app.use(session({ secret: 'xppx' })); // session secret
	app.use(passport.initialize());
	app.use(passport.session());

    passport.use(new BasicStrategy(
        function (username, password, done) {
            //	    console.log('in Basic,',username,password,done);

            if (validate(username, password)) {
                done(null, username);
            } else {
                done(null, false);
            }
        }));


    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (user, done) {
        done(null, user);
    });

    return passport;
};

// ------------------------------------------ login ------------------------------------------
var serverutil = {
    getDirectoryInfo: getDirectoryInfo,
    createBasicPassport: createBasicPassport
};

module.exports = serverutil;

