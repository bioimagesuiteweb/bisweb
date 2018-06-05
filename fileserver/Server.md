# The BioImageSuite File Server 

BioImageSuite with only the core image handling code and native web functionality is capable of loading files from the user's desktop one at a time provided that the user specifies which file from a list each time.* While this is fine for casual use, a user who wants to save images to their local machine without needing to specify a path every time will not be able to. Consider for example saving every image, matrix, and transformation in a processing pipeline — on base BioImageSuite the user would have to stand by the computer and click save each time. 

*This is for security reasons on the JavaScript developers' end. For more details, see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file