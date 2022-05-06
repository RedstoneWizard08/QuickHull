/**
* Returns the dot product of two vectors
* @param {number[]} a
* @param {number[]} b
* @returns {number}
**/
export const dot = (a: number[], b: number[]) => {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
* Returns the distance from a point to a line segment
* @param {number[]} p - point
* @param {number[]} l1 - line end point
* @param {number[]} l2 - line end point
* @returns {number}
**/
export const pointLineDistance = (p: number[], l1: number[], l2: number[]) => {
    //https://mathworld.wolfram.com/Point-LineDistance3-Dimensional.html
    const x10 = new Array(3);
    const x21 = new Array(3);
    const c = new Array(3);

    subtract(x10, l1, p);
    subtract(x21, l2, l1);
    cross(c, x21, x10);

    const len = length(c) / length(x21);

    if (isNaN(len)) return 0;

    return len;
};

/**
* Calculates the normal of a plane defined by three points
* @param {number[]} t - target vector
* @param {number[]} a
* @param {number[]} b
* @param {number[]} c
* @returns {number[]} target vector
**/
export const getPlaneNormal = (
    t: number[],
    a: number[],
    b: number[],
    c: number[]
) => {
    const v1 = new Array(3);
    const v2 = new Array(3);
    subtract(v1, b, a);
    subtract(v2, b, c);
    cross(t, v2, v1);
    return t;
};

/**
* Adds two vectors
* @param {number[]} t - target vector
* @param {number[]} v1
* @param {number[]} v2
* @returns {number[]} target vector
**/
export const add = (t: number[], v1: number[], v2: number[]) => {
    t[0] = v1[0] + v2[0];
    t[1] = v1[1] + v2[1];
    t[2] = v1[2] + v2[2];
    return t;
};

/**
* Subtracts two vectors
* @param {number[]} t - target vector
* @param {number[]} v1
* @param {number[]} v2
* @returns {number[]} target vector
**/
export const subtract = (t: number[], v1: number[], v2: number[]) => {
    t[0] = v1[0] - v2[0];
    t[1] = v1[1] - v2[1];
    t[2] = v1[2] - v2[2];
    return t;
};


/**
* Calculates the cross product
* @param {number[]} t - target vector
* @param {number[]} v1
* @param {number[]} v2
* @returns {number[]} target vector
**/
export const cross = (t: number[], v1: number[], v2: number[]) => {
    t[0] = v1[1] * v2[2] - v1[2] * v2[1];
    t[1] = v1[2] * v2[0] - v1[0] * v2[2];
    t[2] = v1[0] * v2[1] - v1[1] * v2[0];
    return t;
};

/**
* Copies a vector to a different one
* @param {number[]} t - target vector
* @param {number[]} f - from vector
* @returns {number[]} target vector
**/
export const copy = (t: number[], f: number[]) => {
    t[0] = f[0];
    t[1] = f[1];
    t[2] = f[2];
    return t;
};

/**
* returns the length of a vector
* @param {number[]} v
* @returns {number}
**/
export const length = (v: number[]) => {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
};

/**
* Scales a vector by a number
* @param {number[]} t - target vector
* @param {number[]} v - vector to scale
* @param {number} l - amount to scale
* @returns {number[]} target vector
**/
export const scale = (t: number[], v: number[], l: number) => {
    t[0] = v[0] * l;
    t[1] = v[1] * l;
    t[2] = v[2] * l;
    return t;
};

/**
* Scales a vector by an amount, and adds a constant to all components
* @param {number[]} t - target vector
* @param {number[]} v - vector to scale and add
* @param {number} l - amount to scale
* @param {number} s - constant to add
**/
export const scaleAndAdd = (
    t: number[],
    v1: number[],
    l: number,
    s: number
) => {
    t[0] = v1[0] * l + s;
    t[1] = v1[1] * l + s;
    t[2] = v1[2] * l + s;
    return t;
};

/**
* Normalizes a vector
* @param {number[]} t - target vector
* @param {number[]} v - vector to normalize
* @returns {number[]} target vector
**/
export const normalize = (t: number[], v: number[]) => {
    let len = length(v);
    if (len === 0) {
        t[0] = 0;
        t[1] = 0;
        t[2] = 0;
    } else {
        len = 1 / len;
        t[0] = v[0] * len;
        t[1] = v[1] * len;
        t[2] = v[2] * len;
    }
    return t;
};

/**
* Returns the distance between two vectors
* @param {number[]} v1
* @param {number[]} v2
* @returns {number}
**/
export const distance = (v1: number[], v2: number[]) => {
    return Math.sqrt(squaredDistance(v1, v2));
};

/**
* Returns the squared distance between two vectors
* @param {number[]} v1
* @param {number[]} v2
* @returns {number}
**/
export const squaredDistance = (v1: number[], v2: number[]) => {
    return (v1[0] - v2[0]) ** 2 + (v1[1] - v2[1]) ** 2 + (v1[2] - v2[2]) ** 2;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debug = (...text: any) => {
    if (debug.enabled) console.log(...text);
};

debug.enabled = false;
