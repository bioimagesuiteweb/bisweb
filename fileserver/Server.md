# The BioImageSuite File Server 

The purpose of the File Server is to adapt the developed interface of BioImageSuite Web to the processing pipelines that more traditional bash driven tasks use. 

BioImageSuite with only the core image handling code and native web functionality is capable of loading files from the user's desktop one at a time provided that the user specifies which file from a list each time.* While this is fine for casual use, a user who wants to save images to their local machine without needing to specify a path every time will not be able to. Consider for example saving every image, matrix, and transformation in a processing pipeline — on base BioImageSuite the user would have to stand by the computer and click save each time. 

As well, some machines don't have the storage space or computational power that mid to high-level usage of BioImageSuite requires. The File Server may be used to link a dedicated processing machine to a display device like a tablet or a phone (though bear in mind that real-time usage of complex image processing tasks will at least require transferring images between the two devices!) 

*This is for security reasons on the JavaScript developers' end. For more details, see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file

## Launching the Server

The server currently runs in an Electron window on the user's current machine. To launch, navigate to `bisweb/fileserver` and type: 

    node run.js -v 

The server should now be running. The -v flag enables verbose output, which will list details about what is happening during the connection process and about exchanges between the client and server. This flag may be omitted to run the server in silent mode. 

## Connecting to the File Server

The file server is an endpoint for file I/O in the same way that the user's machine would be, or a cloud service like Dropbox or Google Drive. You can set the endpoint by selecting 'local server' from the 'Set File Source' menu found under the 'File' tab. Now all save and load operations will use the server machine. 

For security reasons the server may ask you to authenticate upon connection. The file server uses [Hashed One-Time Passwords (HOTP)](https://en.wikipedia.org/wiki/One-time_password#Methods_of_generating_the_OTP). 

## Performing Tasks with the File Server

The File Server is capable of the following : 

* Loading images from the server machine's disk and sending them to the user. 
* Saving images from the user's machine to the server machine's disk
* Displaying files on the server machine
* Invoking BioImageSuite modules on files contained on the server machine and either sending the results to the user or retaining them. 

