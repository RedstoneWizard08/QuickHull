export const dot = (a: number[], b: number[]) => {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

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

export const add = (t: number[], v1: number[], v2: number[]) => {
    t[0] = v1[0] + v2[0];
    t[1] = v1[1] + v2[1];
    t[2] = v1[2] + v2[2];
    return t;
};

export const subtract = (t: number[], v1: number[], v2: number[]) => {
    t[0] = v1[0] - v2[0];
    t[1] = v1[1] - v2[1];
    t[2] = v1[2] - v2[2];
    return t;
};

export const cross = (t: number[], v1: number[], v2: number[]) => {
    t[0] = v1[1] * v2[2] - v1[2] * v2[1];
    t[1] = v1[2] * v2[0] - v1[0] * v2[2];
    t[2] = v1[0] * v2[1] - v1[1] * v2[0];
    return t;
};

export const copy = (t: number[], f: number[]) => {
    t[0] = f[0];
    t[1] = f[1];
    t[2] = f[2];
    return t;
};

export const length = (v: number[]) => {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
};

export const scale = (t: number[], v: number[], l: number) => {
    t[0] = v[0] * l;
    t[1] = v[1] * l;
    t[2] = v[2] * l;
    return t;
};

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

export const distance = (v1: number[], v2: number[]) => {
    return Math.sqrt(squaredDistance(v1, v2));
};
export const squaredDistance = (v1: number[], v2: number[]) => {
    return (v1[0] - v2[0]) ** 2 + (v1[1] - v2[1]) ** 2 + (v1[2] - v2[2]) ** 2;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debug = (...text: any) => {
    if (debug.enabled) console.log(...text);
};

debug.enabled = false;
