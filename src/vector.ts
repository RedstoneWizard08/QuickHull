export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

/**
* Converts a vector to a number array
* @param {Vector3} vector
* @returns {number[]}
**/
export const vectorToNumber = (vector: Vector3) => [
    vector.x,
    vector.y,
    vector.z,
];

/**
* Vector array to number array conversion
* @param {(Vector3 | number[])[]} vectorArray
* @returns {number[][]}
**/
export const vectorArrayToNumberArray = (vectorArray: (Vector3 | number[])[]) => {
    const vectors: number[][] = [];
    vectorArray.forEach((v) => {
        if ("x" in v) {
            vectors.push([v.x, v.y, v.z]);
        } else {
            vectors.push([v[0], v[1], v[2]]);
        }
    });
    return vectors;
};
