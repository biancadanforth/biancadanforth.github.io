---
layout: post
title: "The end of the beginning"
categories: "git"
author: "Bianca Danforth"
meta: ""
---

## Mission accomplished: MVP

These last two weeks have been quite exciting, with the team successfully completing our minimum viable product (MVP).

Functionally, the MVP for re-implementing Lightbeam as a web extension involved:

* capturing first and third party requests
* storing those requests (and data about them) on the client side in a single object `websites`
* visualizing the first and third party connections (for now without a visualization library)

<img src="http://biancadanforth.com/images/initial-d3-vis.png" alt="Lightbeam MVP with an initial d3 visualization">

Shown above is our MVP with a bonus initial d3 visualization of the first- and third-party data (still ironing out the bugs)!

### I got Issues!

#### Closed Post-MVP Issue #53: Create initial UI
This was a post-MVP task that I was able to sneak into the MVP while Princiya, the other intern on this project, was wrangling some gnarly storage bugs.

The UI from the previous version of Lightbeam was rewritten using some new CSS tools: CSS Grid and CSS Custom Properties. There are many follow up issues as might be expected, like adding functionality to the tracking protection toggle and updating content with dynamic data.
 
#### In progress: Post-MVP Issue #3: Visualization library
I have never used any visualization libraries before. The current version of Lightbeam uses D3 with `<svg>` elements, and it suffers from performance issues for a large number of nodes in the visualization.

It was recommended to us by Greg Tatum, a Developer Tools Engineer at Mozilla, that we consider using D3 (Data Driven Documents) with the HTML `<canvas>` element since the DOM would only have one element (`<canvas>`) instead of potentially hundreds or even thousands of `<svg>` elements.

I successfully got a static visualization to work with our data that updates on page load (see MVP image above). However, things got a little tricky when I tried to update the visualization dynamically.

After consulting with Princiya, I have decided to work on a proof of concept (POC) to make a directed force graph that updates dynamically without all the added complexities (and potentially, undiscovered bugs) of the existing application under development.

### Git

#### TIL: `git commit --amend` will roll any staged changes into a *new* commit on saving the commit message.

#### TIL: Avoid deleting branches over force pushing to overwrite them
I ran into this when I was working on a feature branch, but wanted to bring in changes that had been merged overnight from my upstream repository before continuing to work.

After rebasing (putting all my feature branch commits *after* the newly merged commits to `master`), I was no longer able to push my feature branch to origin. This is because my remote feature branch on origin is not rebased like my local feature branch. In other words, the commit history for my local branch is different from that of the remote origin branch in a way that git doesn't know how to resolve.

One way of fixing this is to delete the remote origin branch in GitHub and then push the newly rebased feature branch as normal. This is dangerous though, as I found out. I accidentally deleted the upstream remote feature branch that was part of an active pull request, rather than the origin remote branch of my forked repository.

Thankfully I was able to subsequently push force my local branch, and there was no permanent data loss. Just a lot of headache to figure this out!

### User Experience (UX)

#### TIL: Mozilla's target user is the "conscious chooser".

I attended a [talk](https://prezi.com/view/SzGGogdcUbwddBBEGnTa/) by Mozilla's CMO (Chief Marketing Officer) Jascha Kaykas-Wolff about the importance of keeping customer data secure and [lean](https://www.mozilla.org/en-US/about/policy/lean-data/).

According to Mr. Kaykas-Wolff, users are changing their behaviors. In fact, the largest growing group of internet users, what Mozilla calls the "conscious chooser", makes up about 21% (750-900 million people) of the internet population, and has adopted a "millenial mindset", which is characterized by:

* A tendency to choose purpose-driven brands
* A desire to be informed and in control
* A slightly increased awareness of privacy

While re-implementing Lightbeam, it would be wise to keep this kind of user in mind as our target audience. Their behaviors and goals are quite different from the general population, as evidenced by some data presented by Mr. Kaykas-Wolff:

<img src="http://biancadanforth.com/images/jascha-kaykas-wolff-conscious-chooser.png" alt="The 'conscious chooser' internet user behaves differently from the average internet user">
 
### A tale of two `store` instances

#### TIL: Web extension background scripts and page scripts cannot communicate except through messages via the `runtime` web extension API

Thanks to Princiya Sequeira, my fellow Lightbeam intern, I now understand the gnarliest of the storage bugs she had to wrangle over the last week or so.

**The Bug**

What we were seeing was, when the `websites` object (the data object kept in storage and accessed via the `store` object) was manually removed in the console, the visualization would be empty. On page refresh, however, the data somehow reappeared as if it had not just been deleted.

What Princiya realized was that we had one `store.js` file, which was called from two places:
1. Via the background scripts (to capture data)
2. Via the page scripts (to visualize data)

Due to the nature of web extensions, this was actually creating two instances of the `store` object. One major difference between the background scripts and page scripts has to do with the lifetime of each: background scripts "maintain long-term state or perform long-term operations independently of the lifetime of any particular web page or browser window". Page scripts are bound to the webpage itself. When that page reloads, the scripts reload. When the page closes, the scripts are gone.

**The Fix**

The solution was to ensure there was only ever one instance of the `store` at any one time. This involved creating one instance of `store` in the background and sending messages between the background scripts and page scripts via the `runtime` web extension API so that the page scripts could access the captured data for the visualization.