---
layout: post
title: "The beginning of the end"
categories: "git"
author: "Bianca Danforth"
meta: ""
---

## An Unexpected Journey: The Disconnect Entity List, a MozFest Proposal and XSS

Seeing the Lightbeam application as it evolves is very rewarding.  Seeing so many nodes on the visualization, most of which are of little concern from a privacy perspective, is less so.

These past two weeks were mostly spent applying a pre-filter to captured HTTP request data for third parties.

I also drafted, reviewed and submitted a Lightbeam-related [proposal](https://github.com/MozillaFoundation/mozfest-program-2017/issues/287) in collaboration with my fellow intern Princiya Sequeira for Mozilla's annual open Internet festival, [MozFest](https://mozillafestival.org/) in late October 2017.

Finally, I have started to learn some Security 101 for Web Developers concepts thanks to my mentor, Paul Theriault!

### I got Issues!

#### Closed Issue #98: Use the Disconnect Entity List to whitelist first-party-owned third parties

This issue was an attempt to declutter the graph in a way that removed non-suspicious third parties -- i.e. those owned by the first party site based on a curated, open-source whitelist maintained by [Disconnect](https://disconnect.me/) and used by Mozilla's [Tracking Protection](https://github.com/mozilla-services/shavar-prod-lists/blob/master/disconnect-entitylist.json).

Look at the difference for YouTube:

**Before**
![YouTube graph before whitelist](http://biancadanforth.github.io/images/beforeWhitelist.png)

**After**
![YouTube graph after whitelist](http://biancadanforth.github.io/images/afterWhitelist.png)
 
#### Closed Issue #100: Override whitelist when a third party links to multiple first parties

Say you have two sites that both link to google-analytics.com:

1. google.com (owns google-analytics.com)
2. example.com (does not own google-analytics.com)

Initially, say you have only loaded google.com, the graph should only display the first party node for google.com, not the google-analytics.com third party node, since google-analytics.com is owned by google.com (i.e. google-analytics.com is whitelisted per #98 above).

When you visit example.com next, currently the graph would only show the link between example.com and google-analytics.com. There would not be a link between google.com and google-analytics.com due to the whitelist check. This issue was to implement an override to the whitelist this to display this link in this instance.

**Why would we want to do this?**

In addition to adding more transparency around the prevalence of a particular third party site, this has the added benefit of connecting two subgraphs, which can help keep the visualization more contained to the graph area in the UI.

This issue was tricky to implement; as the logic was confusing and storage had to keep some data indefinitely that is ignored by the visualization.

### What I learned from completing these two issues

#### TIL: Arrays and object literals are in-place modified unlike primitives, which are copied.

```javascript
const myself = {shoe: 1, names: []};
let other = myself.shoe;
++other;
let names = myself.names;
names.push("beep");
console.log(myself); // { shoe: 1, names: ['beep']}
```

`myself.shoe` is a primitive while `myself.names` is an array. Modifying a reference to a primitive value does not modify the original value, while modifying a reference to an array or object literal actually modifies the original value.

#### TIL: Git has submodules!

Submodules allow you to include or embed one or more repositories as a sub-folder inside another repository.

We used a submodule for Issue #98 above. They are appropriate in this case (as opposed to including as a npm module dependency in `package.json`), because the submodule [repository we are using](https://github.com/mozilla-services/shavar-prod-lists) is fairly static.

Submodules aren't automatically updated by default, though it is possible to change this using `git config fetch.recurseSubmodules true` (default value is `on-demand`). Though there are risks that your code can break by automatically doing this (in the same way using the latest version of any code dependency can break your code).

#### TIL: Disconnect is not only open-source, but they provide tracker blacklists and third party whitelists that are used by Firefox’s Tracking Protection tool.

#### TIL: Trackers can do fingerprinting via back-end data sharing, where the same tracker operates a number of different domains to stay off of tracker blacklists.

#### TIL: A DocBlock is a way to communicate to future you and other developers the format of data going into and potentially coming out of a method.

Here's an example from my own code, thanks to one of my mentors, Luke Crouch:

```javascript
/*
  disconnect-entitylist.json is expected to match this format, where:
    - 'properties' keys are first parties
    - 'resources' keys are third parties

  {
    "Facebook" : {
      "properties": [
        "facebook.com",
        "facebook.de",
        ...
        "messenger.com"
      ],
      "resources": [
        "facebook.com",
        "facebook.de",
        ...
        "akamaihd.net"
      ]
    }

    "Google" : {
      ...
    }
  }

  this.firstPartyWhiteList is expected to match this format:
  {
    "google.com": 1,
    "abc.xyz": 1
    ....
    "facebook.com": 2,
    ...
  }

  this.thirdPartyWhiteList is expected to match this format:
  {
    1: [
      "google.com",
      "googleanalytics.com",
      "weloveevilstuff.com"
    ]
  }
*/

  reformatList(whiteList) {
    const firstPartyWhiteList = {};
    const thirdPartyWhiteList = {};
    let counter = 0;
    for (const siteOwner in whiteList) {
      const firstParties = whiteList[siteOwner].properties;
      for (let i = 0; i < firstParties.length; i++) {
        firstPartyWhiteList[firstParties[i]] = counter;
      }
      const thirdParties = whiteList[siteOwner].resources;
      thirdPartyWhiteList[counter] = [];
      for (let i = 0; i < thirdParties.length; i++) {
        thirdPartyWhiteList[counter].push(thirdParties[i]);
      }
      counter++;
    }

    return {
      firstPartyWhiteList,
      thirdPartyWhiteList
    };
  },

```

#### TIL: [perf.html](https://github.com/devtools-html/perf.html): A useful tool for performance testing in Firefox

This tool is used by Luke and Jonathan's colleague, Kamil Jozwiak, a QA Engineer for Firefox.

#### TIL: Object key access on `null` is a no-go

There was a gnarly storage bug that I discovered while working on Issue #98.

Some background information is that the `this._websites` is a local clone of the `websites` object we keep in store, which contains all our data for the application and is used to create Lightbeam's visualization.

When Lightbeam is first opened or the user clicks 'Reset Data' in the UI, `this._websites` is set to `null`. It remains `null` until the first time the async method `store.setWebsite` is called. This is problematic, because before `store.setWebsite` is called, the sync method `store.getWebsite` is called (old method pasted below).

```javascript
getWebsite(hostname) {
    if (!hostname) {
      throw new Error('getWebsite requires a valid hostname argument');
    }

    return this._websites[hostname];
},
```

This would silently fail without an error (a WebExtension API bug, perhaps), which made debugging this problem challenging.

The fix was to modify the `store.getWebsite` method to not only check if the hostname key exists, but also if `this._websites` is `null`, so that an empty object is returned in that case instead of the script silently failing.

```javascript
getWebsite(hostname) {
    if (!hostname) {
      throw new Error('getWebsite requires a valid hostname argument');
    }
 
    if (this._websites && this._websites[hostname]) {
      return this._websites[hostname];
    } else {
      return {};
    }
  },
```

#### TIL: Something can be “greppable”. Git has a grep CLI (`git grep`) and `grep` is its own CLI too.

This came up because I was asking about using a `console.error` in a `catch` statement in case the Disconnect Entity List JSON file wasn't fetched successfully. I had proposed to add a new ESLint rule to allow `console.error`.

My mentor, Jonathan Kingston, was of the mind that it’s better to use an:

```javascript
//eslint-disable-next-line no-console
```

...inline in the script instead of adding a blanket new rule, because the former is ‘greppable’.

**So what does 'greppable' mean?**

Any CLI tool can export data to a file by appending the command with `> filename.txt`.

It is possible to export a report from the command line for the occurrences of the string `eslint-disable-next-line` by typing:

```javascript
git grep 'eslint-ignore-line' > report
```

**Why is this better than searching for that string in my fancy text editor?**

Rarely can GUIs like text editors export, and grep has a number of other useful and unique features too.

#### TIL: When fetching resources from the server, always have error handling/a graceful degradation fallback in case the resource doesn’t load (and perhaps print an error message to the console).

```javascript
// get Disconnect Entity List from shavar-prod-lists submodule
let whiteList;
const whiteListURL = '/shavar-prod-lists/disconnect-entitylist.json';
try {
  whiteList = await fetch(whiteListURL);
  whiteList = await whiteList.json();
} catch (error) {
  whiteList = {};
  const explanation = 'See README.md for how to import submodule file';
  // eslint-disable-next-line no-console
  console.error(`${error.message} ${explanation} ${whiteListURL}`);
}
```
In my use case, this means if the whitelist JSON file doesn’t load-- i.e. the user probably didn't clone the repo correctly to include the submodule per the readme. The whitelist is initialized to an empty object and the capture code just runs without the whitelist filter; though it will print an error message to the console to hopefully help the user correctly import the whitelist file.

Note: I use whitelist interchangeably with Disconnect Entity List.

#### TIL: It is better to use affirmative boolean names like `isVisible` instead of `isIgnored` so that double negatives do not confuse other developers (like `!isIgnored`).

#### TIL: Firefox test engineering has an [info page](https://firefox-test-engineering.readthedocs.io/en/latest/)

I learned this while having lunch with a former Outreachy intern, now full-time test engineer at Mozilla, Benjamin Forehand.

Much of their tests are written in Python.

#### TIL: [Assignment destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) is useful when you have methods/functions that return multiple variables.

```javascript
const { firstPartyWhiteList, thirdPartyWhiteList }
      = this.reformatList(whiteList);
```

#### TIL: When writing nested conditional statements, perform the least expensive check(s) first, if possible

I ran into this when I was implementing issue #100 above.

```javascript
// some code
} else if (!thirdParty['isVisible']) {
  if (!(this.onWhiteList(origin, target))) {
    // some code

```

In this case, the `onWhiteList` check has to check a list over 10,000 lines long, while  the `thirdParty['isVisible']` check simply checks for the existence of a key in an object and its value. So I should check for the 'isVisible' key first.

#### TIL: Just because you’re editing one script doesn’t mean you can’t get errors from other scripts that communicate with it.

This came up when I was implementing issue #100 above.

Basically I was trying to pass D3 a set of links (a connection between a first and third party) when there wasn't a node for the third party, since it was currently being ignored due to the whitelist check.

Because my script was passing messages to other scripts that interact with D3, D3 was throwing an error. I didn't realize it for a long time, because I had filtered the console in the browser to only show me errors from the script I was editing.

#### TIL: Mozilla has a change tracker that helps people follow the status of features and standards as they are implemented in Firefox.

The tracker can be found [here](https://platform-status.mozilla.org/). It is maintained, at least in part, by fellow Mozillian Harald Kirschner, who first told me about it.


### The Makings of a MozFest Proposal

#### TIL: A number of excellent resources to learn more about how trackers collect data, what kind of data they collect, what they do with that data and how it affects the user
* Steven Englehardt from [WebTAP](https://webtap.princeton.edu/) has done 2 doctoral internships at Mozilla and had done a lot of research on trackers.
* [Luke Crouch - Scary Javascript That knows if You've Been Bad or Good [ Thunder Plains 2016 ]](https://www.youtube.com/watch?v=0XDpJUhDTos)
* [PrivacyTools.io](https://privacytoolsio.github.io/privacytools.io/#resources)

**TL;DR**
(courtesy of my mentor, Jonathan Kingston)

> "They could scrape all the page data, fingerprint you, send you cookies and also key log everything. They could share that with a third party and share their cookies so you are tracked for all your data across any website."

#### TIL: There are a number of open-source tracker lists
* [uBlock Origin](https://github.com/uBlockOrigin/uAssets/tree/master/filters)
* [Ghostery](https://cdn.ghostery.com/update/v3/bugs)
  * Note - this is a public resource, but requires permission to use.
* [AdBlock Plus](https://github.com/uBlockOrigin/uAssets/tree/master/thirdparties/easylist-downloads.adblockplus.org)
* [Disconnect](https://github.com/disconnectme/disconnect-tracking-protection)
  * Mozilla uses a copy of this for Tracking Protection.

#### TIL: There are many ways to take steps to protect your own privacy/that of your friends/family and to get involved in the movement/community

Thanks to my mentors Paul Theriault, Luke Crouch and Jonathan Kingston for this information:

* People can use tools to help protect themselves like:
  * Lightbeam, Containers, Tracking Protection, Privacy Badger, HTTPS Everywhere on one end of the scale.
  * Tor and Qubes OS on the other end.
* Developers can contribute to privacy education/protection tools like Lightbeam, block lists like those maintained by Disconnect and HTTPS Everywhere or other open-source web privacy projects.
* Anyone can tell their friends and family about privacy! For example, they could learn about a particular topic and teach others. Some example topics include:
  * How to opt out of targeted advertising.
  * How to identify phishing sites/e-mails.
* Anyone can join a privacy advocacy organization to hold their local government accountable, like the EFF in the U.S. and Privacy International and Open Rights Group in the U.K.

Here are some online resources shared with me by Luke Crouch:
* https://clickclickclick.click/
* https://www.torproject.org/
* https://webtap.princeton.edu/
* http://datatransparencylab.org/
* https://fpf.org/
* https://cdt.org/
* https://www.privacyrights.org/
* https://www.epic.org/
* https://datasociety.net/
 
### Security 101 for Web Developers with Paul Theriault Part 1: XSS

**Recommended Reading:**
[The Tangled Web: A Guide to Securing Modern Web Applications](https://www.amazon.com/Tangled-Web-Securing-Modern-Applications/dp/1593273886) by Michal Zalewski

#### What is XSS?

Cross-Site Scripting or XSS takes some form of input (i.e. untrusted data that could come from a third party website, a user input, a JSON file, etc.) and inserts it into the page.

If the input data happens to contain an HTML tag, this is mark-up injection. If it's a script tag, you have XSS.

#### What is the 'Same Origin Policy'?

One origin can't access another origin's data.

#### What are the most common and/or dangerous things that could happen from a successful XSS attack?

XSS is an attack against the user, not the server. It allows the attacker to run script as if it were part of the website when a user visits.

**The impact is tied to what the website does**

*Brochure-ware site*

If you have XSS in a brochure-ware ad site, it’s not a big impact; it could show a different hero image or something, but that's it.

*Facebook or a social networking site*

Something like Facebook however is much more dangerous: Facebook scripts add friends, send messages and do all sorts of things. A successful XSS attack can do anything the user could do.

You can get XSS worms, when a user logs in it automatically sends messages to their friends that contain a payload. How does a user send a message? They enter things into a field and hit submit. You can do all of this in a script from the browser. Or you could just make that request back to the server as the user.

That request is made with the user’s cookie. The cookie is ambient authentication. Once you have authenticated your cookie, every request you made has that cookie attached to that request. 

*Banking site*

For your bank, they could potentially transfer money as you, or could do anything that you could do on the website. You can impersonate the user and act as the website talking at the user. That’s why you have banks that send you an SMS for transfers.

#### What are the most common entry points for the attack?

Anywhere that you have data that you inject into markup that is untrusted is an entry point. It could be injecting into scripts data or a webpage.

**Input text fields**

Here is a great ['game'](https://xss-game.appspot.com/level1) where you can basically attack an intentionally vulnerable webpage with XSS. For level one, try entering: `<script>alert(1)</script>`.

**Third party scripts**

Your site is only as secure as the sum total of scripts running on your page. For example, if your site loads google analytics, you're trusting Google not to hack you.

Biancadanforth.com has an embedded Codepen on some pages. What happens when codepen gets compromised/hacked? I’ve included a third party script in my page. They could return a malicious script to my website; then users of my website would be at risk from that.

#### What are the most common developer mistakes that leave a site/app vulnerable?

> Protection is about input handling and output sanitizing.

XSS is an extremely common vulnerability. If a developer is doing output sanitization manually, it’s very easy to make a mistake. It’s hard to think of all the different ways someone could inject HTML/script.

For example, if you’re injecting in between tags, you need to escape different things than if your injecting inside of a tag.

**Input text fields/innerHTML**

When you have dynamic fields, like text fields, you need to escape or sanitize the data to make sure there isn't any unexpected HTML.

If you inject what you think is data (e.g. putting the user’s name inside a paragraph), but you don’t check to make sure that user’s name has any HTML tags, then that is a security vulnerability for an XSS attack. You are not sanitizing it before you put it in the page.

If you’re injecting into a webpage, you need to make sure it doesn’t contain HTML tags. If you’re injecting into a script, you need to make sure it doesn’t have double quotes so the string terminates and they could be writing JavaScript.

**Third party scripts**

There's a browser mechanism called sub-resource integrity (SRI); it helps you mitigate this risk. You can put a hash inside a script tag to say: I’m including a third party script but this is a hash for this script. If the hash doesn’t match, it doesn’t get loaded on my site.

Last year, China was found to be compromising GitHub CDNs, injecting their own script into Chinese user’s pages. GitHub later implemented SRI (sub-resource integrity).

#### How can a developer write tests to protect against XSS?

**TL;DR**

Automate the process. Don't do it manually. You won’t remember everything, and you may not be up to date.

**Most security tests are not positive assurance.**

Positive assurance means that I can write a test; if that test passes, I know this thing is safe.

In general for security, there’s no positive test for XSS. You can test for XSS and if you find it, you have a problem. But if you don’t find it, that doesn’t mean you don’t have a problem, it just means you didn’t find it.

Penetration testing/ethical hacking is like poking and probing. Testers try to think of all the different ways websites constantly fail. Ultimately if you get to the test and didn’t find any - the most you can say is that it’s *probably* safe.

What you can do is automate the process. Use a framework that handles XSS. Use plug-ins like Jonathan Kingston's [ESLint plugin](https://github.com/mozilla/eslint-plugin-no-unsanitized) (based on Frederik Braun's original plugin) that always looks for common vulnerabilities. There are frameworks for Django to sanitize HTML automatically.

**Use Template Strings with Modifiers**

When Paul's testing, what he's looking for is concatenating strings. Strings don’t have any idea for when is the end of a tag, when it's in an attribute, in a script, etc.

Template strings are safer than normal string concatenation. They allow you to be much more specific, but they don’t give you magical protection. Template strings can have a modifier on them, so you can put a function name in the front of template strings.

```javascript
cleanHTML`Hello ${name}`
````

This calls the cleanHTML function before building the string.

### Overall, it was a great two weeks; jam packed with lots of learning and progress.

