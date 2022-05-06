# QuickHull

A conversion utility for converting points to a cannon-es body.

Originally created by [@Dannie226](https://github.com/Dannie226).

## Installation

To install use these commands:

- Yarn:

```sh
yarn add quickhull-ts
```

- NPM:

```sh
npm install quickhull-ts
```

Type definitions are included, so there is no need for a `@types/quickhull-ts` package.

## Usage

To begin using QuickHull, you first need to import and instantiate it. This can be done with these simple lines of code:

```ts
// ES Modules
import QuickHull from "quickhull-ts";

// CommonJS
const QuickHull = require("QuickHull");

// Create the hull
const hull = QuickHull.createHull(points);
```

Your points list can be an array of arrays of three numbers or an array of any class or object that has an `x`, `y`, and `z` property. It can even be both!

**Example:**

```ts
// Import the library
import QuickHull from "quickhull-ts";

// A list of points to use
const points = [
    { x: 1, y: 0, z: 1 },
    [1, 1, 1],
    { x: 1, y: 2, z: 1 },
    [1, 3, 1],
    [1, 4, 1],
    [1, 5, 1],
];

// Create the initial hull
const hull = QuickHull.createHull(points);

// Log the faces to the console
console.log(hull); // [ [ 0, 1, 5 ], [ 2, 0, 5 ], [ 2, 5, 1 ], [ 2, 1, 0 ] ]
```

More documentation coming soon.
