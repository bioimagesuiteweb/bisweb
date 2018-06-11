(IMPORTANT SECURITY CONCERNS)
* ~~Be able to filter requests by hostname~~ (resolved by server.listen?)
    * test this with a packet spoofer

* ~~Maintain a list of allowed directories (no access above ~/)~~ (workaround -- can only access files that belong to you)
    * ~~No symlinks allowed~~

* Authenticate users when connecting 

(also important functionality)

* Be asked for directory listing 
	* ~~Return .JSON file with dictionary structure (nested?). Tree rooted at current directory? Limited tree depth? ~~
	* getFileOpen
	* getFileSave
	* getDirectory

* ~~Be asked for a specific file or set of files~~
    * ~~Fix issue with Uint8Arrays~~ (Resolved by sending less per packet)

* ~~Be asked to save data in a specific location (on the server machine)~~
    * ~~gSolve the compression issue~~

* Be able to handle module invocations remotely (like WebWorkers), remote command execution, i.e. not modules just regular jobs

(improvements for future versions)

* Use HTTP for file transfer? WebSocket is a little slow, ~20Mbps on local network
    * Not clear though that it'll get any faster...

* ~~Achieve some level of data compression (currently gzipping the image files barely reduces the size)~~
    * The files were already zipped (duh)

client library external API

	* Connect
	* getFileOpen
	* getFileSave
	* getDirectory
	* loadFile
	* saveFile 
	* runJob  (json file)

Look at bis_webfileutil -- electronFileCallback for getFileOpengetFileSave,getDirectory