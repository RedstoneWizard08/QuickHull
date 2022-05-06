// Import the library
import QuickHull from "../src";

// A list of points to use
const points = [
    { x: 1, y: 0, z: 1 },
    [ 1, 1, 1 ],
    { x: 1, y: 2, z: 1 },
    [ 1, 3, 1 ],
    [ 1, 4, 1 ],
    [ 1, 5, 1 ],
];

// Create the initial hull
const hull = QuickHull.createHull(points);

// Log the faces to the console
console.log(hull);
