---
layout: post
title: "Getting started"
categories: "git"
author: "Bianca Danforth"
meta: ""
---
 
### I got Issues!
 
The Upgrade Lightbeam project got out of the gates at a strong clip, with my web development mentor, Jonathan Kingston, creating and assigning several issues to tackle as part of a Lightbeam MVP (minimum viable product).

#### Closed MVP Issue #4: Set up basic web extension
I was, as they say in the UK, positively chuffed to have successfully merged my first pull request (PR) and close my first issue on day one!

This PR initialized a `manifest.json` file for the web extension, opening the Lightbeam page in a new tab on clicking the browserAction icon, ensuring only one instance of the web extension was open at any one time and re-focusing the tab on subsequent browserAction clicks.
 
#### Closed MVP Issue #7: Initial data capture
This issue was a little trickier for me! I used a `capture` parent object with methods to log first and third party HTTP requests (along with some additional details) to the console.

### Git(Hub) workflows
Before Outreachy, I had never before contributed to an open source project, so these first weeks focused heavily on learning best practices.

#### TIL: Fork then clone.
Rather than directly cloning the main repository (let's call it _upstream_) in GitHub, I should fork _upstream_ to create my own remote copy (let's call it _origin_), clone _origin_ locally and set up a reference to _upstream_ in order to ensure my local copy of _origin_ can fetch changes and reflect the most recent state of the source code. This allows me to make commits locally and back up my work remotely to _origin_ without notifying the administrators of the _upstream_ repository until I am ready for a pull request.

#### TIL: Fetch and rebase over pull.
Pull fetches changes from a remote repository and merges those changes. If changes are fetched and then rebased, any commit discrepancies between the remote and local repository will be squashed into one new commit. This creates a more straight forward and easier to understand commit history.

`git fetch --all`

`git rebase upstream/master`

#### TIL: Beware of `git rebase -i`!
Interactive mode for git rebase is incredibly powerful in that it allows you to edit your commit history by squashing, deleting, or otherwise editing individual commits before making a pull request. It is recommended to create a new rebase branch off of the feature branch when rebasing so that if I make a mistake, my full commit history is not permanently modified (which could cause permanent data loss).

#### TIL: Auto-close specific issues on merge with 'Fixes', 'Closes' or 'Resolves'
Adding a substring of the form 'Fixes #X' (X is an issue number) in the commit message of a pull request automatically references that Issue in GitHub and closes it if the PR is merged into _upstream_.

#### TIL : Commit often! Use git stash sparingly.
I can make as many commits as I want on my local copy of _origin_ and push them to the remote _origin_ to save them without making a pull request. These commits don't have to reflect a completed unit of work (I can make a commit simply to save my work, say at the end of the day), since `git rebase -i` will allow me to consolidate and clean up my commit history before making a PR.

Git stash can be difficult to use, since it is very easy to accumulate a number of stashed changes and not remember what each was for, or for which branch it was intended. If it is to be used, it's best to keep it at a max size of 1 stashed change, as in the following example:

After submitting a PR for review with one feature branch off of `master`, I created a second, new feature branch off of `master` to work on the next task. I had to make some updates to my PR, but I wasn't yet at a good point to make a commit, so I:

* stashed the changes on my new feature branch, 
* switched over to the PR feature branch,
* updated and resubmitted the PR,
* switched back over to the new feature branch, and
* restored the changes in the stash to the working directory.

#### TIL: Use the "one-hour, one-day, one-week" approach coupled with the _DNM_ (do not merge) flag.
After spending three days on a pull request that ended up not being what the project needed, Luke Crouch, a Mozilla web development mentor on the project, gave me some very solid advice: When starting on a new feature, carte blanche, don't spend more than an hour before making a DNM pull request and getting the code reviewed. Keep doing this until your are going in the right direction. At that point, spend one day extending the code further; then again submit it for another DNM PR (code review) and continue in this fashion until you're absolutely sure you are going in the right direction.
 
### User Experience (UX)
One afternoon during this period, I volunteered to participate in some user testing conducted by my alma mater's alumni association to improve their young alumni website.

#### TIL:

* [Silverback](http://silverbackapp.com/) is a great tool to record user testing sessions.
* User test often! Rule of thumb: Every 3 weeks, user test 3 people.
* Mozilla has a [style guide](https://www.mozilla.org/en-US/styleguide/)!

#### TIL: Nudge like your privacy depends on it.
I read an [excellent article]( http://dl.acm.org/ft_gateway.cfm?id=2892413&ftid=1718673&dwn=1&CFID=766139938&CFTOKEN=78389418) shared with the team by Luke Crouch; here are some of my Lightbeam-applicable takeaways:

* Nudges in the form of visual cues (e.g.: a password strength meter, the lock icon next to the website URL to indicate a valid security certificate/verified site owner identity) has been shown to result in improved privacy behavior.
* If people think the information disappears, they are more likely to share it; the visual 'disappearance' of their information makes people feel more secure. Therefore, we should definitely persist the option for users to completely erase their browsing history with the click of a button.
* Many users are apprehensive about storing their data in the cloud, since they are reluctant to trust things they don't understand. We can help encourage people to use Lightbeam by notifying them that their browsing history is only stored locally on their computer.

#### Note to self:
As part of my own background research, I discovered a few similar web extensions/tools to Lightbeam for benchmarking: Disconnect, Ghostery, AdNauseum and OpenDNS.
 
### Modern JavaScript tools

#### TIL: ESLint your way to a more readable, consistent coding style
Since mine was the first merged PR to the Lightbeam repository, we used my code as a point of departure for discussions on coding style and setting up an initial ESLint configuration file; this was also my first time using a linter!

After it was initially set-up, I updated it several times to add a number of rules to help enforce consistency and readability of the code. 

I also installed a package in my text editor, SublimeLinter, which flags any code that violates the rules listed in this file.

#### TIL: Add Git hooks to automatically test code
Git hooks force code to be tested at a specified stage in the git process (for example: pre-commit, pre-push, post-commit, etc.). Tools like [husky](https://github.com/typicode/husky) are often used.

#### TIL: ES7 `await` and `async` can come in handy
I learned about these when trying to figure out how to access an object returned by an asynchronouse method (`get`) in the `tabs` WebExtension API that returns a Promise. When used inside of an asynchronous function, the `await` keyword pauses the execution of the script at that line until its asynchronous code has returned a value.

```javascript
async function functionName(response) {
  const tab = await browser.tabs.get(response.tabId);
}
```
 
#### TIL: Unit testing & continuous integration prevent regressions
Princiya Sequeira, my fellow Outreachy intern who is also working on the Upgrade Lightbeam project, set up a basic unit testing environment for our repository using [Karma](https://karma-runner.github.io/0.13/index.html), [Mocha](https://mochajs.org/), [Chai](http://chaijs.com/) and [Sinon](http://sinonjs.org/), as well as continuous integration using [Travis](https://travis-ci.org/).

I once more encountered another first, having never written or performed any automated unit tests in my past projects, so this is a tremendous learning opportunity!

I am currently doing some exercises and hope to write my first unit tests in the coming weeks for the `capture.js` and `background.js` scripts!
