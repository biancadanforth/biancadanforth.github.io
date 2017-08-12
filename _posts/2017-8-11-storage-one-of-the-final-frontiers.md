---
layout: post
title: "Storage: One of the Final Frontiers"
categories: "git"
author: "Bianca Danforth"
meta: ""
---

## Finding a permanent storage home

Lightbeam uses client side storage to persist data between browser sessions. This data is used to create the nodes and links in our visualization.

The legacy Lightbeam uses a now deprecated SDK called [simple-storage](https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/simple-storage) which has a 5 MB storage limit. As a result, the add-on had to constantly check if it was at or near its quota and delete data to meet it.

Our MVP (Minimum Viable Product) used localStorage via the [storage](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/storage) WebExtension API, which significantly increased the amount that we could store (somewhere around 10% of the user's free disk space).

However, localStorage has its drawbacks, and ultimately, we decided to move to IndexedDB.

### Why move from localStorage to IndexedDB?

1. localStorage is synchronous while IndexedDB is asynchronous.
  - This means, for IndexedDB, that reading from and writing to storage does not block the user from interacting with the UI.

2. localStorage does not index data like IndexedDB.
  - Our MVP storage script made a local clone of a single `websites` blob object in localStorage and had to iterate through all N websites to filter data. IndexedDB allows us to specify indices for each website, such as `dateVisited` or `isVisible`, so that filtering for large data sets is much more efficient.

Since the verdict was in on moving to IndexedDB, the next step was to choose an IndexedDB storage library. We chose to use a library rather than directly using the IndexedDB API for simplicity--we currently don't need to perform complex database operations.

### Which IndexedDB library should we use?

Looking at the options, we had to decide between [localforage](https://localforage.github.io/localForage/), [Dexie](http://dexie.org/) and [PouchDB](https://pouchdb.com/). As previously mentioned, our database needs are pretty basic, so PouchDB is overpowered for our purposes. It, for example, has ways to sync data between the client and server-side databases like CouchDB.

Given, that we narrowed the field down to localforage and Dexie.

#### Structuring the data

Before I began testing, I considered how to store the data in IndexedDB. Should I keep the structure of the data the same?

The `websites` blob object we’ve used thus far in localStorage (and cloned/manipulated locally in memory) is of this form:

```javascript
{
  websites:
    'www.google.com': {
      hostname: 'www.google.com',
      dateVisited: 1234567891011,
      isVisible: true,
      thirdPartyHostnames: [
        'apis.google.com',
        // ...
      ]
    },
    'www.npr.org': {
    // ...
  },
  // ...
}
```

Storing the data like this in indexedDB is not ideal, because if multiple asynchronous methods are writing data to storage at the same time, we could have a situation where some of the changes are lost.

Here is a specific example in our case:
* Say you have an async `write` method to the database where you get a copy of the `websites` data from storage.
* Say the `store.setThirdParty` method calls `setWebsite(firstParty)` and `setWebsite(thirdParty)`.
* Both calls to `setWebsite` get a copy of `websites`, but the first call to `setWebsite` may not have completed before `websites` is pulled by the second call.
* Therefore only one website, `thirdParty` would end up getting written to storage.

So moving into IndexedDB, we want to change the storage structure to minimize the chances of this, so instead, we could store items in the database in this form, where each website is a top level key:

```javascript
{
  'www.google.com': {
    hostname: 'www.google.com',
    dateVisited: 1234567891011,
    isVisible: true,
    thirdPartyHostnames: [
      'apis.google.com',
      // ...
    ]
  },
  'www.npr.org': {
    // ...
  },
  // ...
```

While this doesn't completely eliminate the chance of a row-locking situation to occur, it significantly reduces the risk of lost data.

#### The experiment: localforage versus Dexie

To figure out which library was the best choice, I performed an experiment with fake data to compare and contrast the algorithm efficiency for the same methods when using two different IndexedDB storage libraries: [localforage](https://localforage.github.io/localForage/) and [Dexie](http://dexie.org/).

![IndexedDB data can be viewed in the Storage tab in DevTools](https://biancadanforth.github.io/images/http-server inspect database in devtools.png)

Note: IndexedDB data can be viewed in the Storage tab in DevTools. Above is what the database looked like for the library tests.

The code for the experiments can be found [here](https://github.com/biancadanforth/web-dev-experiments/tree/master/localforage-for-lightbeam) (for localforage) and [here](https://github.com/biancadanforth/web-dev-experiments/tree/master/localforage-for-lightbeam) (for Dexie).

**localforage versus Dexie at a glance**

Localforage has a localStorage-like API that is very simple.

Unlike localforage, Dexie indexes each object key (i.e. it can sort the websites by indices like `dateVisited`), and includes basic filtering methods. This means we could conceivably use these methods to progressively load the visualization for large N: Say we had 10,000 `website` objects in storage. With our data, Dexie has an index based on time (the `dateVisited` key).  When the user initially loads Lightbeam, we could incrementally add one day’s worth of data to the graph at a time to improve performance over trying to load all 10,000 sites at once.

**localforage versus Dexie: the numbers**

*Console.time*

I implemented the following methods in both libraries using fake data I generated in JavaScript, with N = 10000 websites. I measured times using `console.time`:

| Method | localForage (ms) | Dexie (ms) | Winner |
| ------ | ---------------- | ---------- | ------ |
| `clearAllDatabaseFromBefore` | 50 | 3 | Dexie |
| `setAll` | 6554 | 2265 | Dexie |
| `getAll` | 2491 | 120 | Dexie |
| `setSingle` | 6 | 3 | Dexie |
| `setManySinglesBlocking` | 14611 | 15640 | localforage |
| `setManySinglesUnblocking` | 579 | 3003 | localforage |
| `getRandomSet` |8354 | 1149 | Dexie |
| `getMostRecentSite` | 2704 | 14 | Dexie |
| `getLastThreeSites` | 2420 | 5 | Dexie |
| `getLastThreeDaysVisibleSites` | 2732 | 541 | Dexie |

This suggests that Dexie is generally faster.

*JSPerf*

Concerned that there might be a high degree of variability in these numbers, my mentor, Jonathan Kingston, suggested I perform the same tests using [JSPerf](http://jsperf.com/), a tool that compares two algorithms by running each one dozens of time to find a statistically significant difference, if any.

![JSPerf test for one of several methods](https://biancadanforth.github.io/images/getLastThreeDaysVisibleSites.png)

Above is one test result in JSPerf for the `getLastThreeDaysVisibleSites` method. Whew, that's a mouthful.

JSPerf test results with N = 100* websites:

| Method | localForage (Ops/s) | Dexie (Ops/s) | Winner |
| ------ | ------------------- | ------------- | ------ |
| `clearAllDatabaseFromBefore` | 3842 | 2600 | localforage (36% faster) |
| `setAll` | 3866 | 4270 | Dexie (9% faster) |
| `getAll` | 3502 | 3917 | Dexie (10% faster) |
| `setSingle` | 16667 | 23242 | Dexie (22% faster) |
| `setManySinglesBlocking`** | no data | no data | Unknown |
| `setManySinglesUnblocking` | 116 | 183 | Dexie (61% faster) |
| `getRandomSet` |3481 | 3850 | Dexie (11% faster) |
| `getMostRecentSite` | 3892 | 3836 | No difference |
| `getLastThreeSites` | 4014 | 3991 | No difference |
| `getLastThreeDaysVisibleSites` | 3473 | 3914 | Dexie (21% faster) |

*: Browser would crash on N = 10,000 websites for `getAll` and `setAll`. Writing and reading 10,000 entries from a database a hundred times is not the intended use case of this tool or Lightbeam.

**: Browser would still crash for N = 100 for `setManySinglesBlocking`. We don't want to block anyway as row locking for Lightbeam is not a critical need when each website object is a key in our database.

**So which is better?**

When using the same data structure and exact same data, Dexie methods largely perform better than localforage.

This is likely because unlike localforage, Dexie indexes the keys for each row in a table (each row is a `website` object in our case) and queries can be made efficiently based on these (e.g. we can easily sort by `dateVisited` or `isVisible` indices). Since localforage does not index, we essentially have to iterate through all N website keys and perform a check.

While localforage is a well-formed solution for other use cases (i.e. a simple key-value API that’s good for storing application state), it suffers from the same problem as localStorage, in that it is not easy to store different types of data.

### And thusly, I began the process of migrating our storage to IndexedDB with Dexie!






