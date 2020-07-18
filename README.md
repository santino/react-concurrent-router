[![licence](https://badgen.net/github/license/santino/react-concurrent-router)](https://github.com/santino/react-concurrent-router/blob/master/LICENCE) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![npm version](https://badgen.net/npm/v/react-concurrent-router)](https://www.npmjs.com/package/react-concurrent-router) [![Build Status](https://travis-ci.com/santino/react-concurrent-router.svg?branch=master)](https://travis-ci.com/santino/react-concurrent-router) [![Coverage Status](https://coveralls.io/repos/github/santino/react-concurrent-router/badge.svg?branch=master)](https://coveralls.io/github/santino/react-concurrent-router)

# react-concurrent-router (RCR)
Performant routing embracing React [Concurrent UI patterns](https://it.reactjs.org/docs/concurrent-mode-patterns.html)

#### Table of Contents
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Overview](#overview)
    - [Accessibility](#accessibility)
    - [More info on performance](#more-info-on-performance)
- [Example applications](#example-applications)
- [Installation](#installation)
- [Configuration](#configuration)
- [Router configuration](#router-configuration)
- [Routes configuration](#routes-configuration)
- [Suspense boundaries alternative](#suspense-boundaries-alternative)
- [Link navigation](#link-navigation)
- [Data prefetching](#data-prefetching)
    - [Prefetching when in full control of the fetching mechanism](#prefetching-when-in-full-control-of-the-fetching-mechanism)
- [Hooks](#hooks)
  - [useRouter](#userouter)
  - [useNavigation](#usenavigation)
  - [useHistory](#usehistory)
  - [useBeforeRouteLeave](#usebeforerouteleave)
- [Redirect rules](#redirect-rules)
- [Group routes](#group-routes)
- [Building custom Suspendable resources](#building-custom-suspendable-resources)
- [Usage with Relay](#usage-with-relay)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview
React Concurrent Router is a lightweight router for React applications with a main focus on performance and user experience.

The main concept this router delivers is concurrent requests of code preloading and data prefetching, even before the user actually commits the navigation action to a new route.  
Best of all worlds: this router gives you the power of Concurrent patterns without requiring adoption of [experimental React Concurrent Mode](https://it.reactjs.org/docs/concurrent-mode-intro.html).

When your users want to perform navigation, the built-in router Link component will initialise **code preloading** when `mouseover-ing` the desired route link; considering this event a weaker signal that the user "may" navigate to a different route. This will instruct the browser to load the js chunks corresponding to the page components required by the route the user might navigate to.  
Eventually the user will click on the Link, committing his intention to navigate to a new route, at which stage the Link will dispatch the **data prefetch** network requests you coupled with the route.  
Both code preload and data prefetch are actually initialised even before the user commits the navigation action; respectively on `mouseover` and `mousedown` events; given the latest is already a strong signal that the user "will likely" complete the navigation. The resulting prefetched data will be passed to your page component through props defined by you.  
**Kicking off component (code) and data fetching before rendering is the crucial aspect that allows _Render-as-You-Fetch_ approach**.  
In a standard React application you would start fetching the code only after the navigation action has been committed, this would cause React to break the rendering cycle (_blocking rendering_). Moving further you would start your data fetching only after the component has been mounted, meaning you have an extra delay requesting data until a component starts rendering.  
RCR, instead, kicks off the fetching before the rendering cycle is triggered. In this case, when the rendering cycle finally starts, your application will look for resources that, if not fully fetched already, are at least in progress, hence allowing your react application/components to "Suspend" until fetching eventually completes.

#### Accessibility
If you are like me the words `mouseover` and `mousedown` might trigger a concern, so I'm happy to reassure you that this router takes into account accessibility. Both code preloading and data prefetching are fully offered when doing keyboard navigation, respectively on `focus` and `keydown` events.  
Those are not the only features addressing keyboard navigation, in fact combined clicks with modifier keys, such as Meta, Alt, Ctrl or Shift, will be handled natively by the browser to let you open the page on a new window/tab; attempt download and open a context menu.

#### More info on performance
There is a lot to share in terms of the performance tricks built into this router, so I'm planning to build a more detailed documentation. In the meantime here are some bullet points:
- Route js chunks are cached so they can be hot-retrieved and not incur into multiple loading; which would otherwise be a concern when using Webpack dynamic imports asynchronous API
- Differently from other popular routers, the routes are flattened to allow direct matches with an O(1) complexity (when not using named params) rather than iterating through all the routes available to perform a match; hence O(n)
- Routes are defined as an array of objects **only**. This is because I consider using React components to define routes inappropriate, given that routes are simple config objects that have no reason to go through the life and rendering cycles of React components which are meant to work with DOM nodes. An important part of the philosophy for this library is that performance comes before cosmetic embellishments. You might not know that when using a `<Route>` component from other routing libraries they most likely need to use React Children API underhood in order to iterate through your routes and compute their props in order to end up with an array of objects anyway. Dealing with this task requires extra computation during initialisation, which impacts resources of your users machine and delays the router setup until the whole React library is loaded; not to mention the extra code required, hence impact on bundle size too
- [Map Objects](https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/Map) are used extensively by the router since they provide much better performance compared to standard javascript arrays
- The library output is optimised for bullet-proof tree-shaking so you can always be sure that you will be importing only the bits you actually use. RCR won't just rely on your Webpack setup, because it comes already code-splitted
- The overall bundle size is just below 3kb gzipped. Realistically when combined with tree-shaking and code splitting in your own application, you will generate optimised chunks with the bits you actually need, where you need them; reducing the actual footprint impact even further
- The router only requires a single dependency: the `history` package

## Example applications
If you want to take a look at some React applications implementing React Concurrent Router you can head to the [react-concurrent-router-examples](https://github.com/santino/react-concurrent-router-examples) repository which provides two "GitHub issue tracker" like applications.  
One demonstrates the power of RCR used with Rest APIs where the router performs full orchestration of prefetch requests.  
The other one demonstrates integration with [Relay experimental](https://relay.dev/docs/en/experimental/api-reference) using a GraphQL API; the router integrates code preloading with React Suspense and concurrently triggers code preloading and data prefetching; but leaves data fetching control, including integration with React Suspense, to Relay.

## Installation
React Concurrent Router requires React v16.8+ since it fully embraces the React Hooks ecosystem.

```sh
npm install react-concurrent-router
# or
yarn add react-concurrent-router
```

## Configuration
```js
// src/router.js
import createBrowserRouter from 'react-concurrent-router/createBrowserRouter'

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    prefetch: () => ({ popularProducts: fetch('https://.../api/fetchPopularProducts') }),
    children: [
      { path: 'login', component: () => import('./pages/LoginPage') },
      { path: 'account', component: () => import('./pages/AccountPage'), children: [ ... ] },
      { path: 'contacts', component: () => import('./pages/ContactsPage') },
      { path: '*', component: () => import('./pages/NotFoundPage') }
    ]
  }
]
const router = createBrowserRouter({ routes })

export default router

// src/App.js
import React, { Suspense } from 'react'
import RouterProvider from 'react-concurrent-router/RouterProvider'
import RouteRenderer from 'react-concurrent-router/RouteRenderer'
import ErrorBoundary from './ErrorBoundary'
import router from './router'

<ThemeProvider theme={theme}> {/* just an example, given you probably have other providers */}
  <RouterProvider router={router}>
    <ErrorBoundary>
      <Suspense fallback={'Loading fallback...'}>
        <RouteRenderer /> {/* this renders your route components */}
      </Suspense>
    </ErrorBoundary>
  </RouterProvider>
</ThemeProvider>
```
Following the above snippet we can look into some extra detail:
- Components rely on dynamic loading. Webpack creates different chunks for each component; then RCR transforms those functions to dynamically load your components into Resources that can handle preloading and integrate with React Suspense to "suspend" the components until they are fully loaded
- Routes are nested by defining a `children` property, which should always be an array of objects; is that simple, no catches
- `RouteRenderer` is the key element that will communicate with the upper Suspense boundary to "suspend" components or in the worse case throw an error caught by ErrorBoundary in case of a failure when loading resources. Ultimately this component is responsible for rendering your pages on the screen
- `ErrorBoundary` and `Suspense` components are not provided by the router, you can place them wherever you wish; the important point is that you have an instance of each above `RouteRenderer` as this will look for those boundaries (Suspense and Error) when attempting to "suspend" components or notify errors. Here are some references for [Error Boundaries](https://reactjs.org/docs/error-boundaries.html), [Suspense](https://reactjs.org/docs/react-api.html#reactsuspense) and [Suspense for Data Fetching](https://it.reactjs.org/docs/concurrent-mode-suspense.html) if you'd like a deeper dive
- The last route with path `*` is a wildcard. **Please always remember to add one as your last route**. This will be used as a fallback in case the requested route could not be found; normally this would be a 404 Not Found page

## Router configuration
React Concurrent Router allow you to create three different routers aimed at different uses: Browser, Hash and Memory.
- **Browser router**, used in web applications. It keeps track of the browsing history of an application using the built-in [HTML5 history API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- **Hash router**, used in web applications where you don't want to/can't send the URL to the server. It stores the current location in the hash portion of the URL, which means that it is not ever sent to the server. This can be useful if you are hosting your site on a domain where you do not have full control over the server routes
- **Memory router**, used mostly for testing, but can also support native applications. It keeps the history of your application in memory, without attempting any browser operation (interactions with address bar). This makes it ideal in situations where you need complete control over the history stack, like testing and React Native

When creating a router you pass a single object argument, the only mandatory property is an array of routes. However each router can also take optional config properties.
```js
const rcrConfigOptions: {
  routes: [ ... ], // mandatory array of objects with routes definition
  awaitComponent: true, // Suspense alternaive to hold new route rendering until component code is loaded
  assistPrefetch: true, // used when we are in full control of fetching mechanism
  awaitPrefetch: false // Suspense alternaive to hold new route rendering until data prefetch is completed
}

////////////////////

import createBrowserRouter from 'react-concurrent-router/createBrowserRouter'

const router = createBrowserRouter({
  ...rcrConfigOptions,
  window: iframe.contentWindow // use with a window other than that of the current document (e.g iframe)
})

////////////////////

import createHashRouter from 'react-concurrent-router/createHashRouter'

const router = createHashRouter({
  ...rcrConfigOptions,
  window: iframe.contentWindow // use with a window other than that of the current document (e.g iframe)
})

////////////////////

import createMemoryRouter from 'react-concurrent-router/createMemoryRouter'

const router = createMemoryRouter({
  ...rcrConfigOptions,
  initialEntries: ['/', '/login', '/account'], // array of locations in the history stack
  initialIndex: 1  // given the array of initialEntries set current index to the stack
})
```
Let's share some extra detail about these router config properties:
- `routes`: mandatory array of objects declaring route entries; detailed in the [routes configuration paragraph](#routes-configuration)
- `awaitComponent`: a boolean with default value `false`. When set to true it will tell the router to keep rendering current route and hold new route rendering until code preloading for the latest is complete; more info on the [Suspense boundaries alternative paragraph](#suspense-boundaries-alternative)
- `assistPrefetch`: a boolean with default value `false`. When set to true it will let the router transform prefetch requests into "Suspendable" resources; more info on the [data prefetching paragraph](#data-prefetching)
- `awaitPrefetch`: a boolean with default value `false`. When set to true it will tell the router to keep rendering current route and hold new route rendering until data prefetch for the latest is complete; more info on the [Suspense boundaries alternative paragraph](#suspense-boundaries-alternative)
- `window`: this is the only property accepted for both, the Browser and Hash router. `window` defaults to the [defaultView of the current document](https://developer.mozilla.org/en-US/docs/Web/API/Document/defaultView). However you might want to customise this when using the router on a window that doesn't correspond to the one of the main document; an iFrame is probably the perfect example
- `initialEntries`: available only on Memory Router; defaults to `['/']`. This is an array of locations in the history stack, similar to what you would have when you've been navigating through a few pages in your application. The values in the array could be a plain string path or a [location object](https://developer.mozilla.org/en-US/docs/Web/API/Location)
- `initialIndex`: available only on Memory Router; defaults to the index of the last item in `initialEntries`. Value must be a number that represents the index of the location you want to set as current in the history stack. Normally when navigating through pages in your application you add entries on the history stack and the last entry is always the only currently active; hence the default value. However when navigating backwards or forwards you keep the entries in the stack but change the index; this property can help simulating this behaviour

## Routes configuration
```js
// src/router.js

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    prefetch: () => ({ popularProducts: fetch('/api/fetchPopularProducts') }),
    children: [
      { path: 'login', component: () => import('./pages/LoginPage') },
      { path: 'account', component: () => import('./pages/AccountPage'), children: [ ... ] },
      { path: 'contacts', component: () => import('./pages/ContactsPage') },
      { path: '*', component: () => import('./pages/NotFoundPage') }
    ]
  }
]

...
```
Routes is just an array of objects. Each route can have a children property which will create a new branch of sub-routes and so its value must also be an array of objects. You can nest down as much as you need.  
If you believe that having a plain object of deep nested routes could become hard to read, hence why a JSX syntax might be preferred by some: think creative! You can always break your routes into separate arrays of objects that represent different branches.  
A route object supports the following properties:
- `path`: a string that sets the URL path under which the route will be matched and rendered. Children routes will inherit their parents path as a prefix
- `component`: a function that return a promise to dynamically load your page component. The `import()` syntax is the best way to achieve this and it also conforms to the [ECMAScript proposal for dynamic imports](https://github.com/tc39/proposal-dynamic-import). This is the recommended approach by Webpack for code splitting and allows creating chunks of your page components that RCR will preload when "mouseovering" a link, and so before a navigation action is actually committed. Underhood RCR will create a Resource instance for all your components so that it can control preloading, avoid multiple loading and cache the resolved value for blazing fast navigation
- `prefetch`: a function that returns an object which keys are prefetch entities. Requests are initialised concurrently to reduce waiting times and allow components to "suspend". More info available on the dedicated [Data prefetching paragraph](#data-prefetching).
- `redirectRules`: a function where you can perform logic to determine whether or not you might want to redirect your users to a different route. Return value should be negative, best to use `null`, when you don't want to perform any redirect; or a string representing the path you want to redirect to. More info available on the dedicated [Redirect rules paragraph](#redirect-rules).

Something that is probably not obvious is that technically all the properties can be optional.  
The minimum requirement to render a route is certainly having a `path` and a `component` but this router also lets you setup group routes which allow you to combine these two properties through different objects. Head to the dedicated [Group routes paragraph](#group-routes) for more info.

## Suspense boundaries alternative
As mentioned a couple of times React Concurrent Router transforms requests, for components code and data prefetching, into "Suspendable" resources; this integrates natively with React Suspense to allow displaying a fallback whilst code preloading or data prefetching is in progress.

Ultimately this enables you to build great user experiences as you have full control through as many Suspense boundaries you need to render parts of your application that are ready whilst network requests for other parts are in progress.

However React Concurrent Router goes a step further and provides you a simple and effective alternative to Suspense, only if and when you want to take advantage of it.

Building several Suspense boundaries might not be always ideal and it ultimately involves writing more code that will then have additional cost in terms of maintenance, testing and bundle size.  
Maybe the main goal you want to achieve is to always have contentful pages on the screen, and so, when requesting navigation to a new route, your users can still interact and enjoy content on the current page, which is fully rendered, whilst preloading components and/or data prefetching for the new route is happening in the background.  
RCR makes this as simple as setting one or two booleans to true.

```js
// src/router.js
import createBrowserRouter from 'react-concurrent-router/createBrowserRouter'

const routes = [ /* routes objects */ ]
const router = createBrowserRouter({
  routes,
  awaitComponent: true, // keep current route and hold new route rendering until component code is loaded
  awaitPrefetch: true // keep current route and hold new route rendering until component data prefetch completes
})

export default router

// src/App.js
import React, { Suspense } from 'react'
import RouterProvider from 'react-concurrent-router/RouterProvider'
import RouteRenderer from 'react-concurrent-router/RouteRenderer'
import ErrorBoundary from './ErrorBoundary'
import router from './router'
import PendingIndicator from './PendingIndicator'

<RouterProvider router={router}>
  <ErrorBoundary>
    <Suspense fallback={'Loading fallback...'}>
      <RouteRenderer pendingIndicator={<PendingIndicator />} /> {/* notice the pending indicator */}
    </Suspense>
  </ErrorBoundary>
</RouterProvider>
```
Just so you know, `awaitComponent` and `awaitPrefetch` are `false` by default and `pendingIndicator` is optional.

Let's start with `awaitComponent`; when navigating to a new route we always need to load the code for the components in order to render the new page. If `awaitComponent` is not set to true, RCR will signal that the component should "Suspend", since the code is not yet available, and your upper Suspense boundary will catch this signal and render the defined fallback. The point is that most likely a fallback defined above the router won't have any meaningful content and so even if you might have some nice loading animation it won't necessarily provide the best experience to your users whilst they wait for the new code to be loaded.  
When you set `awaitComponent` to `true`, instead, the router will intercept the navigation request and will not attempt to immediately render the new component; hence the signal to be caught by the upper Suspense boundary won't be sent. This means that we continue to render the previous page until the new component is loaded and able to be rendered without causing any "Suspension"; this also have a benefit on reducing re-renderings and painting jobs on the browser.

Similarly to the above, `awaitPrefetch`, will allow the router to intercept pending requests for your prefetch entities and continue to keep the current page on the screen until these requests completes. In this case RCR will apply this behaviour by default to all the prefetch entities you have defined with your routes; however you still have the opportunity to granularly control and override this on single entities if you wish; you can read more in the [data prefetching paragraph](#data-prefetching) below.  
Note: `awaitPrefetch` is only available when your are in full control of your fetching mechanism and you let RCR deal with Suspense integration for prefetching requests. This is achieved when not using a third party data fetching library and so when opting into `assistPrefetch` mode; again this is discussed deeper in the [data prefetching paragraph](#data-prefetching) below.

Finally the last piece that pulls this all together is the `pendingIndicator`. This is a component you create to signal the user that we're processing their navigation action. You pass this component as a prop to `<RouteRenderer />`; it is not mandatory but certainly highly advisable since we are keeping the user on the current page and so we should provide a visual feedback that their request to navigate to a new route is in progress. A popular pattern is to display a loading bar at the top of the page.  
RCR will render your pending indicator _alongside_ the current page components; this is different from how the upper Suspense boundary operates, since it would completely replace the whole content on the screen with the provided fallback whilst waiting for your components and/or data prefetches to complete.

## Link navigation
Whenever you're doing internal navigation within your application you must use the Link component provided by the router.
```js
import Link from 'react-concurrent-router/Link'

...

<Link to='/login' />

...
```
As mentioned, the Link is a critical part for the functionality of RCR since it orchestrates code preloading and data prefetching pro-actively, as part of user events (`mouseover/focus` and `mousedown/keydown` respectively), to anticipate navigation operations as early as possible.

The signature is very simple and consists of the following props that can be passed to the component:
- `onClick`: a function that allows you to execute custom code when user clicks on the link; receives the event as the only argument. NOTE: If you `preventDefault` the event the router will not perform his standard actions hence it won't navigate to the requested route; useful if you want to have full custom management of the event; use it carefully!
- `target`: standard target attribute that will be passed to the final anchor `<a>` element
- `to`: the route you want to navigate to; could either be a plain string or a [location object](https://developer.mozilla.org/en-US/docs/Web/API/Location)
- `activeClassName` a custom CSS class name to attach to the link when active (matches the current browser location). Default value is `'active'`
- `exact` indicates whether or not to perform an exact match when checking if the link matches the currently active route. Default value is `false`.

> A note on exact matching; I do believe in semantics and so exact matching to me actually means **exact**!  
> When exact is false I still expect the pathname to fully match. For example if the current location is `/account/orders/123` this will match a path like `/account/orders/:orderId` but it _will not_ match a path like `/account/orders`. If semantics means anything to you, that would just be a partial match (which BTW right now this router doesn't offer; although feel free to open an issue to request this).  
> When asking for exact matches, instead, I will expect the whole path to actually match, including query and hash params. For example, if current location is either `/account/orders?orderId=123` or `/account/orders#list` an exact match won't match a path like `/account/orders` that would otherwise be matched if not performing exact match; you simply will need to have the exact same query and hash parameters as well.  
> I am insisting on this concept because I am aware it differs from how other routers behaves today.

## Data prefetching
One of the most unique features of React Concurrent Router is orchestration of data prefetching, concurrently with code preloading, before actual navigation (and so render).  
There are two different ways to handle prefetching with RCR:
- as a companion to a data fetching library (such as Relay) that already provides integration with React Suspense
- when you are in full control of the fetching mechanisms and so want to leverage the router to orchestrate prefetching and integrate with React Suspense

When your pages rely on data, that needs to be retrieved, in order to have meaningful rendering you can declare data requests within the routes, which is done by defining a `prefetch` property.  
This must be a function that ultimately returns an object, of which each key will be passed as prop to your component with the relevant request resource/data. Let's have a look at an example:
```js
// src/router.js
const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    prefetch: () => ({
      repository: () => fetch('https://.../api/repository'), // retrieves repository data
      issues: () => fetch('https://.../api/repository/issues') // retrieves issues data
    }),
    children: [
      {
        path: '/issue/:number',
        component: () => import('./pages/Issue'),
        prefetch: params => ({
          issue: () => fetch(`https://.../api/issue/${params.number}`) // receives parameter and retrieves issue data
        })
      }
    ]
  }
]

// src/pages/Home.js
import React from 'react'

const HomePage = ({ prefetched }) => {
  const repository = prefetched.repository // output of fetch function retrieving repository data
  const issues = prefetched.issues // output of fetch function retrieving issues data

  return /* your component here */
}
```

The above should explain how you define properties in the object returned by the `prefetch` function; RCR will pass the properties you declared to your components within the `prefetched` prop.  
The second route, `/issues/:number`, is just a teaser to demonstrate how RCR passes route params to your `prefetch` function; that surely applies to both named and query params.

We will now focus on the second use case, so feel free to jump to the [usage with Relay paragraph](#usage-with-relay) for more information on the role of the router and orchestration of prefetching in combination with a data fetching library.

#### Prefetching when in full control of the fetching mechanism
When you are in full control of the fetching mechanism, you have a couple of options to set when creating the router:
```js
// src/router.js
import createBrowserRouter from 'react-concurrent-router/createBrowserRouter'

const routes = [ /* routes objects as per example above */ ]
const router = createBrowserRouter({
  routes,
  assistPrefetch: true, // you want the router to integrate data prefetch requests with React Suspense
  awaitPrefetch: false // Suspense alternaive to hold new route rendering until data prefetch is completed
})

export default router

// src/pages/Home.js
import React, { Suspense } from 'react'

const HomePage = ({ prefetched }) => {
  // this component will Suspend until repository.read() is able to return the data
  const repository = prefetched.repository.read()

  return (
    <>
      <h1>{repository.full_name}</h1>
      {/* This Suspense boundary will catch IssuesList suspension and will show the fallback
       * until IssuesList un-suspends; in this case when issues.read() returns the data */}
      <Suspense fallback={<IssuesListSkeleton />}>
        <IssuesList issues={prefetched.issues} />
      </Suspense>
    </>
  )
}

const IssuesList = props => {
  // this component will Suspend until issues.read() is able to return the data
  const issues = props.issues.read()

  return issues.map(issue => ( /* compose issue component */ ))
}
```
Setting `assistPrefetch` to true allows the router to transform your fetch requests into "Suspendable" resources that integrates with React Suspense. In this case whilst the network requests are in progress you can define whichever Suspense boundary to be displayed until data is received; this could be for example a skeleton (as per above).

This allow you to have a great level of customisation for all the "suspending" resources, whether they are components or data fetch requests; but ultimately will also require you to define several Suspense boundaries in order to achieve a great user experience.  
If you haven't done so already you should read the [Suspense boundaries alternative paragraph](#suspense-boundaries-alternative) where this is discussed more in depth.

The `awaitPrefetch` option offers a simple alternative to achieve good UX without having to always rely on Suspense boundaries. When this property is set to true, RCR will apply a default behaviour to keep the current page on the screen whilst your prefetch requests are being resolved. The router will eventually render the new route components only when all the network requests for your prefetch entities are resolved; so that your application always goes from one fully rendered page to another. Remember that RCR dispatches all your prefetch requests concurrently, so they won't have to resolve in a queue.  
On top of being nice, this is also performant, since it reduces the numbers of re-renders and painting jobs on the browser.

Applying a default behaviour like this might hopefully be convenient, but how about when you want a mix of both approaches, and so you want define which data requests you are happy to just initialise but not wait for; in which case you are happy to have some targeted Suspense boundaries?

When using `assistPrefetch` the properties you define in your route `prefetch` object can either be a function (as shown so far) or an object with two properties: `data` and `defer`. Let the snippet guide you:
```js
// src/router.js
import createBrowserRouter from 'react-concurrent-router/createBrowserRouter'

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    prefetch: () => ({
      repository: { defer: false, data: () => fetch('https://...') }, // this must resolve before rendering
      issues: { defer: true, data: () => fetcher('https://...') } // this can resolve after rendering
    })
  }
]

const router = createBrowserRouter({ routes, assistPrefetch: true })

export default router
```
When `defer` is set to `true` (which is actually the default value), the router will not hold route rendering whilst a request is pending; vice versa you set `defer` to `false` you are marking the entity as necessary to render your component. As you can see, you don't actually need to opt into `awaitPrefetch` if you want to individually mark your prefetch entities as non-deferrable.

How about cases where you want `awaitPrefetch` to be set as default behaviour because you don't want to define Suspense boundaries for most of your prefetch entities; but you might want to do so only for a few selected ones?  
In this case you can set `awaitPrefetch` to `true` to set the default behaviour you are after and only set a `defer: true` property on the prefetch entities you don't want to hold rendering for.
```js
// src/router.js
import createBrowserRouter from 'react-concurrent-router/createBrowserRouter'

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    prefetch: () => ({
      repository: () => fetch('https://...'), // holds rendering until resolved
      issues: { defer: true, data: () => fetch('https://...') } // can resolve after rendering
    }),
    children: [
      {
        path: '/issue/:number',
        component: () => import('./pages/Issue'),
        prefetch: params => ({
          issue: () => fetch(`http://.../issues/${params.number}`)// holds rendering until resolved
        })
      }
    ]
  }
]

const router = createBrowserRouter({
  routes,
  assistPrefetch: true, // transforms prefetch entities into "Suspendable" resources
  awaitPrefetch: true // sets default behaviour to hold rendering until prefetch requests resolve
})

export default router
```

Hopefully this illustrates the power of the router, when it comes to data prefetching, as well as the full customisation opportunity, should you need it.

## Hooks
React Concurrent Router currently provides four different hooks.

### useRouter
```js
import useRouter from 'react-concurrent-router/useRouter'

const MyComponent = () => {
  const { isActive, preloadCode, warmRoute } = useRouter()
  const isActiveRoot = isActive('/', false)

  if ( ... ) preloadCode('/support') // load javascript code for support page
  if ( ... ) warmRoute('/home') // load code and prefetch data for home page

  return (
    <div>You are${!isActiveRoot && ' not'} in the root page</div>
  )
}
```
This hook exposes some of the methods defined by the router which are used internally to provide core functionalities. It returns an object with the following properties:
- `isActive`: a function that checks if a given path matches the current location. It takes two arguments: `path`, either a string or a [location object](https://developer.mozilla.org/en-US/docs/Web/API/Location), and `exact`, a boolean to indicate whether or not we want to perform an exact match; hence also compare query and hash params. Internally this is used by the link component to attach an active class when the link matches the current route
- `preloadCode`: a function that preloads just the code for a given path and stores the result in memory; this function will not trigger any additional network request after the first one is made; since promises/results are already available in memory. Takes just one argument, `path`, which could either be a string or a [location object](https://developer.mozilla.org/en-US/docs/Web/API/Location). This could be useful when you know you will be performing programmatic navigation and so you want to preload the code for the route you will navigate to. E.g. when the user is filling a login form and you know you will then push to the `/account` page, you can preload the code for `/account` before navigating to it; for example when the user click the login form submit button; or maybe even when they start filling the form
- `warmRoute`: given a path, this function triggers both code preloading and data prefetching (if coupled to the destination route), both jobs will not incur in additional requests if promises/results are already available in memory. Like the above, it takes just one argument, `path`, which could either be a string or a [location object](https://developer.mozilla.org/en-US/docs/Web/API/Location). Similarly to the above this could be useful when performing programmatic navigation. For example in an eCommerce website we might want to redirect to the home page after a successful login; the home page requires a data fetch to display the latest products added to the inventory; this method allows us to preload the code for the home page component as well as prefetch the latest products data even before the user actually submits the form

### useNavigation
```js
import useNavigation from 'react-concurrent-router/useNavigation'

const MyComponent = () => {
  const { push, replace, go, goBack, goForward } = useNavigation()

  if ( ... ) push('/home') // push new entry in history stack
  if ( ... ) replace('/support') // replace current entry on history stack
  if ( ... ) go(-2) // navigate back 2 entries in the history stack
  if ( ... ) go(2) // navigate forward 2 entries in the history stack
  if ( ... ) goBack() // navigate back to last entry in the history stack
  if ( ... ) goForward() // navigate forward to following entry in the history stack

  return ( ... )
}
```
You can use this hook to perform programmatic navigation. It returns an object with the following function properties:
- `push`: pushes a new entry onto the history stack. Argument is either a string or [location object](https://developer.mozilla.org/en-US/docs/Web/API/Location)
- `replace`: replaces the current entry on the history stack with the one provided. Argument is either a string or [location object](https://developer.mozilla.org/en-US/docs/Web/API/Location)
- `go`: navigates backward/forward by "n" entries in the stack, identified by relative position to the current page (always 0). Argument is a number, negative values will navigate backwards, positive will navigate forward
- `goBack`, move backward by one entry through history stack. No arguments
- `goForward`: move forward by one entry through history stack. No arguments
- `canGo`: only provided by Memory Router; check if can navigate to given "n" pointer in history stack. Argument is same as `go`

### useHistory
```js
import useHistory from 'react-concurrent-router/useHistory'

const MyComponent = () => {
  const { length, location, action } = useHistory()

  return (
    <>
      <div>there are ${length} entries in the history stack</div>
      <div>your current location is: ${JSON.stringify(location)}</div>
      <div>the last action modifying the history was: ${action}</div>
    <>
  )
}
```
Returns an object with the following properties that provides information about the history stack:
- `length`: number of entries in the history stack
- `location`: current [location object](https://developer.mozilla.org/en-US/docs/Web/API/Location); includes `pathname`, `search` and `hash` properties as well as potentially `state` and `key`
- `action`: current (most recent) action that modified the history stack (`'POP'`, `'PUSH'` or `'REPLACE'`)
- `index`: only provided by Memory Router; current index in the history stack
- `entries`: only provided by Memory Router; all entries available in history instance

### useBeforeRouteLeave
I consider this a bonus hook which hopefully will remove any effort and overhead when you want to have some degree of control to prevent your users to accidentally leave the page they are in; for example in cases that would cause loss of data entered on the page without submitting.
```js
import useBeforeRouteLeave from 'react-concurrent-router/useBeforeRouteLeave'

const MyForm = ({ dirty, submitting, handleSubmit }) => {
  useBeforeRouteLeave({
    toggle: dirty && !submitting,
    unload: true, // listen to window `beforeunload` event (this is actually true by default)
    message: 'Are you sure you want to leave before submitting?', // simple string, OR:
    message: (location, action) => // function with custom logic
      location.pathname === '/'
        ? true // allow navigating away if path is `/`
        : `Are you sure you want to ${action} to ${location.pathname}?` // show custom message otherwise
  })

  return (
    <form onSubmit={handleSubmit}>
      <Field { ... } />
      <Field { ... } />
      <SubmitButton />
    </form>
  )
}
```
The hook takes an object as the only argument and accepts the following three props:
- `toggle`: a boolean with default value `true`, useful when you want to toggle on/off the hook. For example when a user land on a page with a form this could be off since there is no risk of loosing any data before the form is filled. When the user start entering values in the fields, hence making the form "dirty", you can toggle the hook on. Toggling on will register event listeners, whilst toggling off will remove them to have a clean implementation
- `unload`, a booloean, with default value `true`. When true it will listen to [`beforeunload` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) which is fired when the window, the document and its resources are about to be unloaded, f.i. when attempting page refresh or closing window or tab. Note: browsers don't allow to display custom UI nor message so they remain in full control of the notification presented to the user
- `message`: a string to be prompted to the user or a function invoked with with two arguments, `location` (requested navigation path) and `action` (requested action, `POP|PUSH|REPLACE`); the return value should either be `true`, if you are happy to _not_ block the requested navigation action, or a string to be prompted in order to persuade the user not to navigate away. This property will be ignored in case of `beforeunload` events, since the browsers have full control over those events; this means that if you pass a string this will not be prompted to the user and if you pass a function the logic defined in there won't even be executed. This property is relevant only in case of navigation actions through your application, and so `'POP'`, `'PUSH'` or `'REPLACE'`

> Note: the only prop that is ever expected to mutate its value is `toggle`. Values for `unload` and `message` are considered for initialisation only and so are memoized to prevent unnecessary renders. Yet another small performance trick 😉

## Redirect rules
> If you're reading this because you need to perform programmatic navigation within your react components, feel free to jump back up where [useNavigation](#useNavigation) hook is described.

RCR let you setup redirect rules within your route configuration; let's look at an example:
```js
// src/router.js

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    children: [
      {
        path: 'login',
        component: () => import('./pages/Login'),
        redirectRules: () => (isUserLoggedIn() ? '/account' : null)
      },
      {
        path: 'account',
        redirectRules: () => (isUserLoggedIn() ? null : '/login'),
        component: () => import('./pages/Account'),
        children: [ /* more `/account` children routes */ ]
      }
      ... // more `/` children routes
    ]
  }
]

...
```
In this case when attempting navigation to the login page we might want to check if the user has already logged in and redirect straight away to the `/account` page; vice-versa if the user attempts to navigate to the `/account` page when they not yet logged in, we can redirect them to the login page.  
This is useful because it will prevent rendering a page that will be of no use to your users or, even worse, if you would end up rendering an empty `/account` page with a message like "it seems you did not log in yet; please head to the `/login` page"; causing more rendering and painting jobs on the browser, not to mention the extra user interactions required to finally get where they should be.  
Another **key reason why this feature is so important** on RCR brings us back to preloading. You know, by now, that RCR preloads the code to render your pages when "mouse-overing" a link; when you configure redirect rules in your route, RCR will also check if your logic would push the user to a different route so that it can eventually preload the code for the final destination only; once again another trick aimed at performance and UX 😉

**Ok, but what are redirect rules and how do I take advantage of them?**  
Redirect rules is just a function, in your route you add a `redirectRules` property which value is a function that executes any code you require to perform the logic to determine whether or not you want to redirect users to a different route.  
The key point is that the return value of the function must be a string that represents the new path you want to redirect to. Alternatively if following your logic you determine you do not wish to perform any redirect, you should return a negative value; I certainly suggest using declarative `null`.  
> ProTip: RCR will pass route params to your redirectRules function so you can use them when performing your logic. For instance if your path has query params such as `/myPath?foo=bar`, or named params like `/users/:userId` you can use them respectively in redirectRules in the following way: `redirectRules: ({ foo }) => { /* your logic here */ }` and `redirectRules: ({ userId }) => { /* your logic here */ }`

## Group routes
Group routes are simply parent routes which properties will be merged into their children, including deeply nested children.  
The key point is that a group route doesn't have a `component` property. The main use case for this is probably related to redirectRules, so we can build on top of the example above.
```js
// src/router.js

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    children: [
      ... // other routes, including /login
      {
        path: 'account', // this is our group route; notice lack of 'component' property
        redirectRules: () => (isUserLoggedIn() ? null : '/login'),
        children: [
          { component: () => import('./pages/Account') },
          {
            path: 'orders',
            component: () => import('./pages/AccountOrders'),
            children: [
              {
                path: ':orderId',
                component: () => import('./pages/AccountOrder'),
                children: [ /* more `/account/orders/:orderId` children routes */ ]
              }
            ]
          }
        ]
      }
      ... // more `/` children routes
    ]
  }
]

...
```
Notice how our `path: 'account'` route is considered a group route because it doesn't have a `component` property. The first children, instead, only has a component property that will inherit all the props from its parent, effectively becoming equivalent to declaring the route like so `{ path: 'account', redirectRules: () => { /* ... */ }, component: () => import('./pages/Account') }`.  
With this setup what we want to achieve is to apply our logic to redirect users to `/login` on any route nested from the `/account` branch; in this case this rule will apply to `/account`, `/account/orders`, `/account/orders/:orderId` and all the nested children of this last one.  
This is hopefully very convenient, however do you have all the freedom to override in whichever way you want.
For example if you want to override redirectRules on a single route only, you can achieve this like so: `{ path: ':orderId', redirectRules: () => { /* custom logic only for this path */ }, component: () => import('./pages/AccountOrder') }`. In this case you will be overriding redirectRules only for the path you defined the property but not its children; these would still execute the redirect function defined in the `/account` group route, which in this case is `redirectRules: () => (isUserLoggedIn() ? null : '/login')`.
If you do, instead, want to override redirect rules for a branch of routes you should simply declare a new group route, like so:
```js
// src/router.js

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    children: [
      ... // other routes, including /login
      {
        path: 'account', // main group route
        redirectRules: () => (isUserLoggedIn() ? null : '/login'),
        children: [
          { component: () => import('./pages/Account') },
          ... // other routes that will inherit above redirectRules
          {
            path: 'orders',
            component: () => import('./pages/AccountOrders'),
            children: [
              {
                path: ':orderId',  // new group route (no component property)
                redirectRules: () => { /* custom logic for all /account/orders/:oderId children */ },
                children: [
                  { component: () => import('./pages/AccountOrder') },
                  ... // more `/account/orders/:orderId` children routes
                ]
              }
            ]
          }
        ]
      }
      ... // more `/` children routes
    ]
  }
]

...
```
In this case the redirectRules defined in `/account` will be applied to `/account` and `/account/orders` pages; but `/account/orders/orderId` and all its children as well as nested children will, instead apply redirectRules defined in `/account/orders/orderId`.

You can see how we can take it even further from here. Clearly so far we've only been talking about overriding rules; but what if, for convenience, you want to setup a group route because you want to cascade redirectRules to a number of children, but ultimately there is a nested branch of routes that shouldn't have any redirect rule at all?  
The answer is simple: declare a group route without any redirect rule:
```js
// src/router.js

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    children: [
      ... // other routes, including /login
      {
        path: 'account', // first group route
        redirectRules: () => (isUserLoggedIn() ? null : '/login'),
        children: [
          { component: () => import('./pages/Account') },
          ... // other routes that will inherit above redirectRules
          {
            path: 'orders',
            component: () => import('./pages/AccountOrders'),
            children: [
              {
                path: ':orderId', // new group route (no component property)
                // no redirectRules here!
                children: [
                  { component: () => import('./pages/AccountOrder') },
                  ... // more `/account/orders/:orderId` children routes
                ]
              }
            ]
          }
        ]
      }
      ... // more `/` children routes
    ]
  }
]

...
```

## Building custom Suspendable resources
One more bonus point, aimed at great customisation and usability, is the exported class that lets you create your own "Suspendable resources".  
As you know, by now, the router transforms automatically your components code into resources that can "suspend", the same applies to prefetch requests when opting into `assistPrefetch`; this ultimately offers native integration with React Suspense.

The secret recipe that makes this happen is also available to you; React Concurrent Router allow you to import the class that transforms your promises (may they be to request code, data, assets or anything else) into resources that can "Suspend".  
A good use case for this could be when you need to dispatch extra data requests from your React components, maybe because you need a piece of data you didn't have before rendering; for instance something returned by your prefetch request.
```js
// src/router.js
const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    prefetch: () => ({ /* Home prefetch entities */ }),
    children: [
      {
        path: '/issue/:number',
        component: () => import('./pages/Issue'),
        prefetch: params => ({
          issue: () => fetch(`https://.../${params.number}`)
        })
      }
    ]
  }
]

...

// src/pages/Issue.js
import React, { useMemo, Suspense } from 'react'
// SuspendableResource let you create resources that can suspend rendering
import SuspendableResource from 'react-concurrent-router/SuspendableResource'

const IssuePage = ({ prefetched }) => {
  const issue = prefetched.issue.read()
  const commentsResource = useMemo(
    // the function you pass to SuspendableResource is the same used on route 'prefetch' entities
    () => new SuspendableResource(() => fetch(issue.comments_url)),
    [issue]
  )

  return (
    <>
      <h1>#{issue.number}{' '}{issue.title}</h1>

      {/* This Suspense boundary will catch Comments suspension and will show the fallback until
       * Comments un-suspends, in this case when prefetchedComments.read() returns the data */}
      <Suspense fallback={'Loading comments...'}>
        <Comments prefetchedComments={commentsResource} />
      </Suspense>
    </>
  )
}

const Comments = ({ prefetchedComments }) => {
  // prefetchedComments.read() will cause the component to suspend until it receives the data
  const comments = prefetchedComments.read()

  return (
    <div className='comments'>
      {comments.length ? (
        comments.map(comment => /* compose comment component */ )
      ) : (
        <div>no one commented on this issue yet</div>
      )}
    </div>
  )
}
```
Let's describe what's happening here.  
Our `/issues/:number` route has a prefetch entity that will fetch an issue given the issue number; the data returned will contain several properties, including a `comments_url` that can be used to fetch issue comments. We don't have access to this URL until our prefetch request is resolved, so we're forced to make a fetch request from the React component itself.  
This is where we take advantage of `SuspendableResource` exported by RCR. We can create a "Suspendable" resource by simply initialising a class instance, like so: `new SuspendableResource(() => fetch(issue.comments_url))` notice how the argument you pass to `SuspendableResource` is something you are already fully familiar with, since it's exactly how you declare your prefetch entities within routes.  
You pass the outcome of `SuspendableResource` to your Comments component as a `prefetchedComments` prop. At this stage in the `Comments` component you can access the data by doing `prefetchedComments.read()`; this will suspend only the Comments component until the data is available and so the component can be fully rendered.

> Note how we're using the `useMemo` hook to memoize our "Suspendable" resource. This is important because without it we would be creating a new resource instance every time our Issues component re-renders; which would ultimately mean dispatching a fetch request on every component re-render.

## Usage with Relay
The first reason why I started building this router was to handle data prefetching in a Relay application taking advantage of new [Relay experimental API](https://relay.dev/docs/en/experimental/api-reference); so this definitely aims to be a great companion to Relay.  
Relay provides data fetching mechanisms so the job of this router will simply be to concurrently initialise data prefetch and code preloading, transforming js chunks into "Suspendable" resources; whilst data prefetch will be handled directly by Relay, including network requests, caching and integration with React Suspense.  
Below is a simple snippet to provide quick guidance on how to use RCR with Relay experimental.
> ProTip: if you're after a more comprehensive example you should take a look at the [react-concurrent-router-examples/issue-tracker-relay-experimental](https://github.com/santino/react-concurrent-router-examples/tree/master/issue-tracker-relay-experimental) repository that you can checkout and run locally to play with a functional application. The snippet below actually comes from that repository.
```js
// src/router.js
import { preloadQuery } from 'react-relay/hooks'
import createBrowserRouter from 'react-concurrent-router/createBrowserRouter'

const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    prefetch: () => {
      const HomeQuery = require('./pages/__generated__/HomeQuery.graphql')
      return {
        homeQuery: preloadQuery(
          relayEnvironment, // your relay environment
          HomeQuery, // GraphQL query generated by relay-runtime
          { /* request payload parameters */ },
          { /* 'preloadQuery' options, e.g. fetchPolicy */ }
        )
      }
    },
    children: [ ... ]
  },
  { path: '*', component: () => import('./pages/NotFound') } // wildcard route (404)
]
const router = createBrowserRouter({ routes })

export default router

// src/App.js
import React, { Suspense } from 'react'
import { RelayEnvironmentProvider } from 'react-relay/hooks'
import RouterProvider from 'react-concurrent-router/RouterProvider'
import RouteRenderer from 'react-concurrent-router/RouteRenderer'
import relayEnvironment from './relayEnvironment'
import ErrorBoundary from './ErrorBoundary'
import router from './router'

<RelayEnvironmentProvider environment={relayEnvironment}>
  <RouterProvider router={router}>
    <ErrorBoundary>
      <Suspense fallback={'Loading fallback...'}>
        <RouteRenderer /> {/* this renders your route components */}
      </Suspense>
    </ErrorBoundary>
  </RouterProvider>
</RelayEnvironmentProvider>

// src/pages/Home.js
import React from 'react'
import { usePreloadedQuery, graphql } from 'react-relay/hooks'

const Home = ({ prefetched }) => {
  // this component will Suspend until 'usePreloadedQuery' is able to return the data
  const { repository } = usePreloadedQuery(
    graphql`
      query HomeQuery($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          owner {
            login
          }
          name
          url
          ...Home_issues
        }
      }
    `,
    prefetched.homeQuery // this is the prop we defined in the route 'prefetch' function
  )

  return (
    <>
      <h1>
        Showing latest updated issues from{' '}
        <a href={repository.url}>
          {repository.owner.login}/{repository.name}
        </a>
      </h1>
      { /* more components */ }
    </>
  )
}
```

## Roadmap
- Typescript support
- Allow config for permanent redirects

#### Open to discussion
- Implementation of withRouter HOC
- Partial matching, as an addition to exact matches

## License
MIT License  
Copyright © 2020, Santino Puleio