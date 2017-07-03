---
layout: post
title: "There and Back Again: an Intern’s Tale"
categories: "git"
author: "Bianca Danforth"
meta: ""
---
 
## My Experience at Mozilla’s All Hands in San Francisco
 
This week, I, along with hundreds of fellow Mozillians, converged on San Francisco for a bi-annual, week-long event: Mozilla’s [All Hands](https://wiki.mozilla.org/All_Hands).
 
There were meetings, mixers and open houses throughout the week as well as ample opportunity to simply hack away alongside my international teammates, who hail from Australia, England and Germany. It was wonderful to meet them all in person.
 
Here are some highlights from the week:
 
![Mozilla All Hands Schwag](https://biancadanforth.github.io/images/mozilla-allhands-schwag.png)
 
#### TIL: There is a strong sticker-making and sticker-sharing culture at Mozilla!
I was gifted a number of awesome stickers for different Mozilla Firefox projects, many of which now adorn my work computer (special shout out to [@jhoffman](https://twitter.com/johannh))!
 
### I got Issues!
 
#### Merged PR#67: Initial D3 visualization
After much experimentation and prototyping, I got a force graph to display actual data from storage on page load.

There are a number of follow-up issues as might be expected, for example, there may be duplicate first and third party nodes displaying and unattached nodes fly off the page.

Also to achieve parity with the existing Lightbeam, there is much more functionality and interactivity to be added to the graph, like text labels on click, zooming, panning and filtering.

Princiya and I will be swapping roles for now, with her taking on some of the remaining visualization tasks and I taking on some of the remaining storage tasks.
 
#### In Progress: Issue #75: Update visualization with storage callback
In my visualization experiments, I dynamically updated the graph by listening for the `browser.storage.onChange` event in the page script `lightbeam.js`. This approach is not ideal, because the page script is calling a method very specific to the particular storage we have chosen. If we decided to use a different storage tomorrow, the developer would have to know to go into two places to make changes (in `lightbeam.js` in addition to `store.js`).

It is much better practice to decouple the visualization from storage by having our page script `lightbeam` pass a callback function (such as `draw`) to the store, and having the `store` object execute that callback whenever the content of the `websites` object has changed. This means we would only need to look in one place to make changes (the `store` object).

I am now using the `browser.runtime.onMessage` event listener in the `storeChild` page script and the `browser.runtime.sendMessage` method in the `store` background script. A little bit of indirection goes a long way to ensuring a proper *separation of concerns*.
 
```javascript
const storeChild = {
  callbacks: new Set(),
 
  init() {
    // listen for messages from the storage background script
    browser.runtime.onMessage.addListener((m) => {
      this.messageHandler(m);
    });
  },
 
  // execute all previously registered callbacks (ex: viz.draw()).
  update(data) {
    this.callbacks.forEach((callback) => {
      console.log(callback.toString(), data);
      callback(data);
    });
  },
  // register any callbacks to execute when this.update is called
  register(callback) {
    this.callbacks.add(callback);
  },
 
  // validate incoming message from background script, execute this.update
  messageHandler(m) {
    if (m.type !== 'storeChildCall') {
      return;
    }
 
    const publicMethods = ['update'];
 
    if (publicMethods.includes(m['method'])) {
      const args = m.args;
      return this[m['method']](...args);
    }
  },
```
 
### Advanced JavaScript concepts
 
#### TIL: Multiprocessing: Web Extension background scripts are similar to Web Workers
 
Like [Web Workers](https://johnresig.com/blog/web-workers/), the Lightbeam web extension background scripts (ex: `store.js`, `capture.js` and `background.js`) run in parallel with the extension’s page scripts (`lightbeam.js`, `viz.js` and `storeChild.js`) and communicate via message passing.

Lightbeam uses the web extension [runtime API](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime), while Web Workers use the [postMessage API](https://johnresig.com/blog/postmessage-api-changes/).
Per MDN:
> “Workers are mainly useful for allowing your code to perform processor-intensive calculations without blocking the user interface thread.”

Every web worker has access to more than the original thread’s CPU allocation. If need workers can share memory with the main thread (as an alternative to copying an entire object -- which has its own messaging restrictions) by using a [Shared Array Buffer](http://lucasfcosta.com/2017/04/30/JavaScript-From-Workers-to-Shared-Memory.html).

I am still learning more about these concepts and uses; I hope to share more later!
 
#### TIL: Proxy objects are an anti-pattern -- unless they’re not
In the remake of Lightbeam that I have been working on, we have two scripts that are very tightly coupled, `storeChild.js` as a page script and `store.js` as a background script. Currently, `storeChild` has a duplicate method for every method in `store`.

In the spirit of DRY-er code, this could be simplified by using a proxy object (for an explanation on why we have a `storeChild` and a `store` in the first place, see [Princiya’s excellent blog post](https://princiya777.wordpress.com/2017/06/23/lightbeam-tale-of-2-stores/).

**How do proxy objects work?**

[Here is a good resource](https://rosettacode.org/wiki/Respond_to_an_unknown_method_call#JavaScript). If `storeChild` were a proxy object, if a method were called that is undefined, `storeChild` would return a default function. This default function can be passed custom strings which can be used to call methods dynamically from `store` without duplicating each method in `storeChild`.
 
### What’s in a Security Review?
 
#### TIL: Part of what my mentor does for Firefox
 
While at the Mozilla All Hands, I got to work alongside my mentor, Paul Theriault, and his team as they went about their work. Up to that point, I had only a vague idea of what Paul and his team do. Paul was kind enough to give me a demo one day!
 
Paul is a Security Manager at Firefox. He manages a small team of security engineers whose job is (at least in part) to review new Firefox websites or web extensions for potential security risks using a tool called [OWASP ZAP](https://en.wikipedia.org/wiki/OWASP_ZAP), an open-source web application security scanner.
 
Using ZAP, he and his team can:
* intercept a particular HTTP request
* Make changes to the contents of the header or body
* Inspect the server’s response to the change(s)
* Automate tests
 
They also use Firefox’s built-in debugger tool to test web extensions for sandboxing.
 
#### TIL: A sandbox is a security mechanism for separating running programs.
Per Wikipedia:

> “Sandboxing is frequently used to test unverified programs that may contain a virus or other malicious code, without allowing the software to harm the host device.”

![The Japanese Firefox mascot, Foxkeh, doing some sandboxing](http://biancadanforth.github.io/images/foxkehSandboxing.png)

Firefox has a built-in sandbox security feature. Paul tests web applications such as web extensions to ensure this sandbox is not being bypassed somehow.

**How do we test for sandboxing?**

Web extensions often have scripts running in different contexts. The two primary contexts are the chrome or parent context and the content or child context. There are scripts that run exclusively in one or the other context, but also there are chrome-privileged scripts that run in the child. An example of a chrome-privileged script would be any of the WebExtension APIs.

Using the built-in debugger tool in Firefox, Paul looks at messages that go between the parent and child to determine if the web extension or website is able to bypass the sandbox.
 
#### TIL: Chrome: It’s not just the name of a popular web browser
Per [Wikipedia](https://en.wikipedia.org/wiki/Graphical_user_interface#User_interface_and_interaction_design):
> “The visible graphical interface features of an application are sometimes referred to as chrome or GUI (pronounced gooey).”

### In closing: Mozilla is awesome.

I had an amazing time meeting and working with fellow Mozillians in person. It really does make a big difference.
