export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export const vectorToNumber = (vector: Vector3) => [
    vector.x,
    vector.y,
    vector.z,
];

export const vectorArrayToNumberArray = (vector: (Vector3 | number[])[]) => {
    const vectors: number[][] = [];
    vector.forEach((v) => {
        if ("x" in v) {
            vectors.push([v.x, v.y, v.z]);
        } else {
            vectors.push([v[0], v[1], v[2]]);
        }
    });
    return vectors;
};
