This document contains [developer documentation](README.md) for
[BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/). 

---

## Why JavaScript ?

### A quick history

We use JavaScript as our primary programming language. JavaScript was originally designed to work in
webpages — a quick Google search will tell you much more than can be written here — and many "serious"
programmers considered/consider it an inappropriate language for anything but the
most trivial piece of software. This last point is contested
by the fact that some of the post popular and complex software available, Gmail, Facebook, and Twitter to name a few, is written in JavaScript.

 JavaScript has the unique advantage that it is the only programming language that is built-in to
all major web browsers; hence, anything written in JavaScript has the
advantage that it can be made available to any user with Internet access and a browser. This is a massive advantage compared to any other programming
language out there. Furthermore, over the past ten years, JavaScript has
acquired the type of functionality (e.g. Typed Arrays) that make it suitable
for use in scientific or medical applications. The recent standardization
of the latest version of JavaScript —  ECMA
Script 6 (ES6) — has added many new features to the language and
made it even more suitable for large-scale software development.

### Node.js

A key step in the history of JavaScript was the [Node.js](https://nodejs.org/en/)
project which made the JavaScript interpreter, specifically the Chrome JavaScript
engine, available as a stand alone tool. This enabled an
explosion of server-side JavaScript programming and the creation
of a serious JavaScript based set of development tools, e.g. grunt,
gulp, mocha, electron, some of which we will discuss later. In
the context of web-programming, Node enabled programmers to use the
same programming language (JavaScript) both for back-end/server programming, a task often done in Java or PHP, and front-end/browser programming, a task that was always done in JavaScript. This led to the
concept of "Isomorphic JavaScript", which is a mode of programming
where the server and client/browser code overlap
significantly and share common functionality. Hence, if one transmits
complex data from the server to the client, the same code that parses
this in the browser can also be used in the server.

Node.js extends standard JavaScript with functionality for
manipulating the local file system, executing external processes, and
adding C/C++ (among other) extensions. This type of functionality is off-limits to a browser, which for security purposes can not
access your local files other than through explicit user interaction
— more on this later. This makes it possible to
write JavaScript code that automatically reads multiple files and performs
complex operations on them. Web applications traditionally used
database servers for this purpose, but more recently, web "file systems"
such as Dropbox begun to play a similar role.

### Desktop JavaScript Applications

A final key step in the creation of this project was the development of tools for
desktop JavaScript applications. The older one of these is
[nw.js](http://nwjs.io/), formerly known as Node-Webkit, and a more
recent tool in this space is [Electron](https://electronjs.org/). Both are
essentially combinations of the Node.js command line and a packaged
version of Chrome, which enables the creation of full multi-platform,
desktop applications that can integrate with the operating system
and local file system much like any other desktop application written in
languages such as C++/Objective C/Python etc. We will use Electron in
this text but much of the comments on Electron also apply to nw.js.

### "Multi-context" JavaScript

Right now, we can write JavaScript in three different contexts:

* Traditional browser-based applications.
* Node.js standalone command line tools. Most commonly these are Node.js server applications — an area that is outside the scope of this text.
* Standalone Desktop applications using Electron.

While each of these contexts has their own specific needs, we can write
core libraries that can be shared by applications that function in these
four different contexts. This allows significant code reuse.

