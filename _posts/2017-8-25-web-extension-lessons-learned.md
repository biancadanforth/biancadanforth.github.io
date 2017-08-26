---
layout: post
title: "Remaking Lightbeam as a web extension: what we learned"
categories: "git"
author: "Bianca Danforth"
meta: ""
---

*((What follows is a draft blog post for Mozilla's Hacks blog. I plan to write about the 'back-end' of the browser extension, while the other intern on this project, Princiya Sequeira, plans to write about the 'front-end', since those are the areas we worked the most on during our internship.))*


## Part I: The back-end of the front-end

You may have heard of browser extensions -- perhaps you have even written one yourself! Firefox 57 will make the new extension API available to developers, which means the time of one extension for all browsers is close at hand!

Today, I’ll talk about what I learned from writing my first extension-- namely what I believe to be the biggest conceptual difference--and one of the most common developer pitfalls--between a browser extension and a traditional web application with some practical examples and pro tips taken from my experience developing Lightbeam.


### What is Lightbeam?

[Lightbeam](https://github.com/mozilla/lightbeam-we) is a privacy browser extension that visualizes the connections between the sites that you visit and third parties that may be tracking you. It works by listening for, capturing, storing and ultimately displaying requests made by each website as you browse the web.


### What is a browser extension?

[Browser extensions](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/What_are_WebExtensions) (formerly Web Extensions) allow you to write web applications, using familiar front-end technologies, that have browser superpowers.

Traditional web applications are limited by the browser sandbox: scripts can only run in the context of the page itself, whereas some browser extension scripts can run in the browser context. This is perhaps the biggest difference between browser extensions and traditional web applications. For example, if Lightbeam were a traditional web application, it would only be able to see its own requests; as a browser extension, however, it can see all requests made by all websites.


### The Pitfall

Our team didn’t fully appreciate this until we encountered it in the wild: we tried to include what is known as a [background script](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#Background_scripts) for storage with a `<script>` tag in our application’s `index.html` document. In our case, this was under the false assumption that we could fetch data from storage in this way to update our visualization. The reality was that we had accidentally loaded two instances of this storage script, one with the `<script>` tag in our application and one by including the same script in our browser extension’s [manifest](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json) file, and they were not synched. As you can imagine, there were bugs, lots of bugs.

While MDN does a great job to explain at a very high level how these scripts differ from each other, here we will discuss the practical implications in the hopes of sparing would-be browser extension developers this frustration!


### So what’s the difference between all these scripts?

There are two types of scripts unique to browser extensions: [content scripts](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Content_scripts) and [background scripts](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#Background_scripts) that operate alongside the more familiar page scripts we all know and love.

**Content scripts**

Content scripts are loaded through the browser extension’s [manifest](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json) file or via the [`tabs`](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs) extension API with `tabs.executeScript()`.

Since we don’t use content scripts in Lightbeam, here’s an example of how to load content scripts using the manifest file from another browser extension, [Codesy](https://github.com/codesy/widgets):

```json
"content_scripts": [
        {
            "all_frames": false,
            "js": [
                "js/jquery-3.2.0.min.js",
                "js/issue.js"
            ],
            "matches": [
                "*://*.github.com/*"
            ]
        },
        {
            "all_frames": false,
            "js": [
                "js/jquery-3.2.0.min.js",
                "js/home.js"
            ],
            "matches": [
                "*://*.codesy.io/",
                "*://codesy-stage.herokuapp.com/"
            ]
        }
    ],
```

As you can see from the manifest, we ask for permissions from a specified set of URLs (any GitHub domains for example) to execute a specified set of content scripts (jQuery  and `issue.js` for example).

Content scripts run in the context of a particular web page -- in other words, they execute when a tab with a matching URL loads and stop when that tab is closed.

Content scripts do not share the same origin as the browser extension’s background and extension page scripts, and, using a sandbox mechanism, have permission to access and modify the DOM for any webpage loaded in a tab. While content scripts can inject a `<script>` tag into a page, they are not the same as page scripts, as they do not have access to the same scope. As a result, content scripts use a ‘clean view’ of the DOM, which ensures that none of the built-in JavaScript methods the content scripts use are overwritten by any website’s page scripts.

Because they have access to other page’s DOMs, content scripts have limited access to [extension APIs](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API).

Content scripts have many uses. For example, Codesy uses its `issue.js` content script to insert an `<iframe>` element into a GitHub page. This `<iframe>` in turn loads a Codesy page with a form that users can fill out and submit to use the Codesy service.

**Background scripts versus extension page scripts**

Now that we’ve gotten content scripts out of the way, let’s talk about Lightbeam!

In Lightbeam, our extension page scripts run in the context of our application. These run the UI, including the visualization. In addition to these scripts, we also use background scripts. Background scripts capture, filter and store the request data used by Lightbeam's visualization.

While both extension page scripts and background scripts have full access to the extension APIs, they differ in many other respects.

*Inclusion*

Here’s how you include an extension page script in your browser extension:

```html
<script src="js/lightbeam.js" type="text/javascript"></script>
```

In other words, extension page scripts for a web extension are very similar to your average page script that runs in the context of a webpage with the notable difference that extension page scripts have access to the extension APIs.

By contrast, a background script is included in your browser extension by adding it to the extension’s manifest file:

```json
  "background": {
    "scripts": [
      "js/store.js"
    ]
  }
```

*Lifetime*

Extension page scripts run in the context of the application: they load when the application page loads and persist until the application page is closed.

By contrast, background scripts run in the browser context: they load when the extension is installed and persist until the extension is disabled or uninstalled, independent of the lifetime of any particular page or browser window.

*Scope*

Given these differing contexts and lifetimes, it may come as no surprise that extension page scripts and background scripts don’t share the same global scope. In other words, you can’t directly call a background script method from an extension page script, and vice versa. Thankfully there is an extension API for that!


### How to communicate between different kinds of scripts

> We use asynchronous message passing via the [runtime](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime) extension API to communicate between our extension page scripts and background scripts.

To illustrate this, let’s walk through every step in the process for Lightbeam’s ‘Reset Data’ feature.

At a high level, when the user clicks the ‘Reset Data` button, all of Lightbeam’s data is deleted from storage and the application is reloaded to update the visualization in the UI.

In our `lightbeam.js` extension page script, we:
1. Add a ‘click’ event handler to the reset button
2. When the reset button is clicked:
   1. Clear the data in storage
   2. Reload the page

```javascript
// lightbeam.js
const resetData = document.getElementById('reset-data-button');
// 1. Add a ‘click’ event handler to the reset button
resetData.addEventListener('click', async () => {
// 2. When the reset button is clicked:
  // 2.1. Reset the data in storage
  await storeChild.reset();
  // 2.2. Reload the page
  window.location.reload();
});
```
`storeChild` is another extension page script that passes a message to the `store` background script to clear all our data. We will come back to `storeChild`, but for the moment, let’s talk about what needs to happen in `store`.

For `store` to receive a message from any extension page script, it has to be listening for one, so let’s set up an `onMessage` listener in `store` using the `runtime` extension API.

In our `store.js` background script, we:
1. Add an `onMessage` listener
2. When the message is received
   1. Clear the data in storage

```javascript
// store.js background script

// 1. Add an `onMessage` listener
browser.runtime.onMessage.addListener(async () => {
  // 2. When the message is received
  // 2.1. Clear the data in storage
  await this.reset();
});

async reset() {
  return await this.db.websites.clear();
},
```
Now that we have our `lightbeam` extension page script and `store` background script sorted out, let’s discuss where `storeChild` comes in.


### Separation of Concerns

To recap, our `lightbeam` extension page script listens for the `click` event on the ‘Reset Data’ button, calls `storeChild.reset()` and then reloads the application. `storeChild`, is an extension page script that uses the `runtime` extension API to send the reset message to the `store` background script. You may be wondering why we can’t just communicate directly between `lightbeam` and `store`. The short answer is that, while we could, we want to adhere to the software design principle known as “separation of concerns”.

Basically, we want our `lightbeam` extension page script to only handle UI-related functionality in the same way that we want our `store` background script to only handle storage functionality. It would be wise then to set up an intermediary, `storeChild` that takes on the separate concern of communicating between `lightbeam` and `store`.

Completing the chain for our `Reset Data` feature, in `storeChild` we need to forward the `reset` call from `lightbeam` to `store` by sending a message to `store`. Since `reset` is only one of what could be a number of methods we need to access from the `store` background script, we configure `storeChild` as a proxy object of `store`.


### What is a proxy object?

One of the primary tasks performed by `storeChild` is to call `store` methods on behalf of the `lightbeam` extension page script, such as `reset`. In Lightbeam, `reset` is only one of many such methods we need to be able to call from `store`. Rather than duplicate each method in `store` inside of `storeChild`, we might like to generalize these calls. This is where the idea of a [proxy object](https://rosettacode.org/wiki/Respond_to_an_unknown_method_call#JavaScript) comes in!

```javascript
const storeChildObject = {
  
  // ...other methods

  parentMessage(method, ...args) {
    return browser.runtime.sendMessage({
      type: 'storeCall',
      method,
      args
    });
  }

  // ...other methods

};

const storeChild = new Proxy(storeChildObject, {
  get(target, prop) {
    if (target[prop] === undefined) {
      return async function(...args)  {
        return await this.parentMessage(prop, ...args);
      };
    } else {
      return target[prop];
    }
  }
});
```

> A proxy object is incredibly useful for a browser extension, as it allows us to follow the software design principle: “Don’t Repeat Yourself”.

In Lightbeam’s case, `storeChild` serves as a proxy object in the extension page context for `store`. What this means is that when the `lightbeam.js` extension page script needs to call a `store` method, such as `store.reset`--which it doesn’t have direct access to, it will instead call `storeChild.reset`--which it does have direct access to. Instead of duplicating the `reset` method in `storeChild`, we set up a proxy object whereby if `storeChild` doesn’t have a particular method, it will pass along that method call and any arguments to the `store` via message passing.


### The `web-ext` CLI

Now that we’ve talked about the most important and arguably most confusing browser extension concept and practical ways to apply this knowledge, I encourage you to write your own browser extension! Before you go, let me offer one final piece of advice.

You may already be familiar with live reloading development tools, in which case, you will be delighted to hear there is such a tool for browser extensions!

[`web-ext`](https://github.com/mozilla/web-ext) is an extremely helpful browser extension CLI created and actively developed by Mozilla.

Of its many useful features, `web-ext` lets you:
* Develop and test locally with live reloading
* Specify which version of Firefox to run the browser extension in
* Export your browser extension as an [XPI](https://developer.mozilla.org/en-US/docs/Mozilla/XPI) when you’re ready to ship.


### Where do we go from here?

These are exciting times for the Web, and we expect browser extensions to play a big role in the future as the extension API becomes the cross-browser standard. Understanding these concepts and using these techniques and tools have really helped our team to create the most modern Lightbeam yet, and we hope it helps you too!


### Acknowledgements

Thanks to Paul Theriault, Jonathan Kingston, Luke Crouch and Princiya Sequeira for reviewing this post.
