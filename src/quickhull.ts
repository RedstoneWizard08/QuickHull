// QuickHull algorithm: https://github.com/mauriciopoppe/quickhull3d/blob/master/lib/QuickHull.js

import { FaceState, MergeType } from "./enums";
import Face from "./face";
import HalfEdge from "./halfedge";
import { debug, dot, getPlaneNormal, pointLineDistance } from "./util";
import { Vector3, vectorArrayToNumberArray } from "./vector";
import Vertex from "./vertex";
import VertexList from "./vertexlist";

export class QuickHull {
    public tolerance: number;
    public nFaces: number;
    public nPoints: number;
    public faces: Face[];
    public newFaces: Face[];
    public claimed: VertexList;
    public unclaimed: VertexList;
    public vertices: Vertex[];
    public discardedFaces: Face[];
    public vertexPointIndices: number[];

    constructor(points: number[][]) {
        if (!Array.isArray(points)) {
            throw TypeError("input is not a valid array");
        }
        if (points.length < 4) {
            throw Error("cannot build a simplex out of <4 points");
        }

        this.tolerance = -1;

        // buffers
        this.nFaces = 0;
        this.nPoints = points.length;

        this.faces = [];
        this.newFaces = [];
        // helpers
        //
        // let `a`, `b` be `Face` instances
        // let `v` be points wrapped as instance of `Vertex`
        //
        //     [v, v, ..., v, v, v, ...]
        //      ^             ^
        //      |             |
        //  a.outside     b.outside
        //
        this.claimed = new VertexList();
        this.unclaimed = new VertexList();

        // vertices of the hull(internal representation of points)
        this.vertices = [];
        for (let i = 0; i < points.length; i += 1) {
            this.vertices.push(new Vertex(points[i], i));
        }
        this.discardedFaces = [];
        this.vertexPointIndices = [];
    }

    addVertexToFace(vertex: Vertex, face: Face) {
        vertex.face = face;
        if (!face.outside) {
            this.claimed.add(vertex);
        } else {
            this.claimed.insertBefore(face.outside, vertex);
        }
        face.outside = vertex;
    }

    /**
     * Removes `vertex` for the `claimed` list of vertices, it also makes sure
     * that the link from `face` to the first vertex it sees in `claimed` is
     * linked correctly after the removal
     */
    removeVertexFromFace(vertex: Vertex, face: Face) {
        if (vertex === face.outside) {
            // fix face.outside link
            if (vertex.next && vertex.next.face === face) {
                // face has at least 2 outside vertices, move the `outside` reference
                face.outside = vertex.next;
            } else {
                // vertex was the only outside vertex that face had
                face.outside = null;
            }
        }
        this.claimed.remove(vertex);
    }

    /**
     * Removes all the visible vertices that `face` is able to see which are
     * stored in the `claimed` vertext list
     *
     * @return {Vertex|undefined} If face had visible vertices returns
     * `face.outside`, otherwise undefined
     */
    removeAllVerticesFromFace(face: Face) {
        if (face.outside) {
            // pointer to the last vertex of this face
            // [..., outside, ..., end, outside, ...]
            //          |           |      |
            //          a           a      b
            let end = face.outside;
            while (end.next && end.next.face === face) {
                end = end.next;
            }
            this.claimed.removeChain(face.outside, end);
            //                            b
            //                       [ outside, ...]
            //                            |  removes this link
            //     [ outside, ..., end ] -???
            //          |           |
            //          a           a
            end.next = null;
            return face.outside;
        }
    }

    /**
     * Removes all the visible vertices that `face` is able to see, additionally
     * checking the following:
     *
     * If `absorbingFace` doesn't exist then all the removed vertices will be
     * added to the `unclaimed` vertex list
     *
     * If `absorbingFace` exists then this method will assign all the vertices of
     * `face` that can see `absorbingFace`, if a vertex cannot see `absorbingFace`
     * it's added to the `unclaimed` vertex list
     */
    deleteFaceVertices(face: Face, absorbingFace: Face) {
        const faceVertices = this.removeAllVerticesFromFace(face);
        if (faceVertices) {
            if (!absorbingFace) {
                // mark the vertices to be reassigned to some other face
                this.unclaimed.addAll(faceVertices);
            } else {
                // if there's an absorbing face try to assign as many vertices
                // as possible to it

                // the reference `vertex.next` might be destroyed on
                // `this.addVertexToFace` (see VertexList#add), nextVertex is a
                // reference to it
                let nextVertex;
                for (
                    let vertex: Vertex | null = faceVertices;
                    vertex;
                    vertex = nextVertex
                ) {
                    nextVertex = vertex.next;
                    const distance = absorbingFace.distanceToPlane(
                        vertex.point
                    );

                    // check if `vertex` is able to see `absorbingFace`
                    if (distance > this.tolerance) {
                        this.addVertexToFace(vertex, absorbingFace);
                    } else {
                        this.unclaimed.add(vertex);
                    }
                }
            }
        }
    }

    /**
     * Reassigns as many vertices as possible from the unclaimed list to the new
     * faces
     *
     * @param {Faces[]} newFaces
     */
    resolveUnclaimedPoints(newFaces: Face[]) {
        // cache next vertex so that if `vertex.next` is destroyed it's still
        // recoverable
        let vertexNext = this.unclaimed.first();
        for (let vertex = vertexNext; vertex; vertex = vertexNext) {
            vertexNext = vertex.next;
            let maxDistance = this.tolerance;
            let maxFace;
            for (let i = 0; i < newFaces.length; i += 1) {
                const face = newFaces[i];
                if (face.mark === FaceState.VISIBLE) {
                    const dist = face.distanceToPlane(vertex.point);
                    if (dist > maxDistance) {
                        maxDistance = dist;
                        maxFace = face;
                    }
                    if (maxDistance > 1000 * this.tolerance) {
                        break;
                    }
                }
            }

            if (maxFace) {
                this.addVertexToFace(vertex, maxFace);
            }
        }
    }

    /**
     * Computes the extremes of a tetrahedron which will be the initial hull
     *
     * @return {number[]} The min/max vertices in the x,y,z directions
     */
    computeExtremes() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const me = this;
        const min = [];
        const max = [];

        // min vertex on the x,y,z directions
        const minVertices = [];
        // max vertex on the x,y,z directions
        const maxVertices = [];

        let i, j;

        // initially assume that the first vertex is the min/max
        for (i = 0; i < 3; i += 1) {
            minVertices[i] = maxVertices[i] = this.vertices[0];
        }
        // copy the coordinates of the first vertex to min/max
        for (i = 0; i < 3; i += 1) {
            min[i] = max[i] = this.vertices[0].point[i];
        }

        // compute the min/max vertex on all 6 directions
        for (i = 0; i < this.vertices.length; i += 1) {
            const vertex = this.vertices[i];
            const point = vertex.point;
            // update the min coordinates
            for (j = 0; j < 3; j += 1) {
                if (point[j] < min[j]) {
                    min[j] = point[j];
                    minVertices[j] = vertex;
                }
            }
            // update the max coordinates
            for (j = 0; j < 3; j += 1) {
                if (point[j] > max[j]) {
                    max[j] = point[j];
                    maxVertices[j] = vertex;
                }
            }
        }

        // compute epsilon
        this.tolerance =
            3 *
            Number.EPSILON *
            (Math.max(Math.abs(min[0]), Math.abs(max[0])) +
                Math.max(Math.abs(min[1]), Math.abs(max[1])) +
                Math.max(Math.abs(min[2]), Math.abs(max[2])));
        if (debug.enabled) {
            debug("tolerance %d", me.tolerance);
        }
        return [minVertices, maxVertices];
    }

    /**
     * Compues the initial tetrahedron assigning to its faces all the points that
     * are candidates to form part of the hull
     */
    createInitialSimplex() {
        const vertices = this.vertices;
        const [min, max] = this.computeExtremes();
        let v0, v1, v2, v3;
        let i, j;

        // Find the two vertices with the greatest 1d separation
        // (max.x - min.x)
        // (max.y - min.y)
        // (max.z - min.z)
        let maxDistance = 0;
        let indexMax = 0;
        for (i = 0; i < 3; i += 1) {
            const distance = max[i].point[i] - min[i].point[i];
            if (distance > maxDistance) {
                maxDistance = distance;
                indexMax = i;
            }
        }
        // eslint-disable-next-line prefer-const
        v0 = min[indexMax];
        // eslint-disable-next-line prefer-const
        v1 = max[indexMax];

        // the next vertex is the one farthest to the line formed by `v0` and `v1`
        maxDistance = -1;
        for (i = 0; i < this.vertices.length; i += 1) {
            const vertex = this.vertices[i];
            if (vertex !== v0 && vertex !== v1) {
                const distance = pointLineDistance(
                    vertex.point,
                    v0.point,
                    v1.point
                );
                if (distance > maxDistance) {
                    maxDistance = distance;
                    v2 = vertex;
                }
            }
        }

        // the next vertes is the one farthest to the plane `v0`, `v1`, `v2`
        // normalize((v2 - v1) x (v0 - v1))
        const normal = getPlaneNormal([], v0.point, v1.point, v2?.point || []);
        // distance from the origin to the plane
        const distPO = dot(v0.point, normal);
        maxDistance = -1;
        for (i = 0; i < this.vertices.length; i += 1) {
            const vertex = this.vertices[i];
            if (vertex !== v0 && vertex !== v1 && vertex !== v2) {
                const distance = Math.abs(dot(normal, vertex.point) - distPO);
                if (distance > maxDistance) {
                    maxDistance = distance;
                    v3 = vertex;
                }
            }
        }

        // initial simplex
        // Taken from http://everything2.com/title/How+to+paint+a+tetrahedron
        //
        //                              v2
        //                             ,|,
        //                           ,7``\'VA,
        //                         ,7`   |, `'VA,
        //                       ,7`     `\    `'VA,
        //                     ,7`        |,      `'VA,
        //                   ,7`          `\         `'VA,
        //                 ,7`             |,           `'VA,
        //               ,7`               `\       ,..ooOOTK` v3
        //             ,7`                  |,.ooOOT''`    AV
        //           ,7`            ,..ooOOT`\`           /7
        //         ,7`      ,..ooOOT''`      |,          AV
        //        ,T,..ooOOT''`              `\         /7
        //     v0 `'TTs.,                     |,       AV
        //            `'TTs.,                 `\      /7
        //                 `'TTs.,             |,    AV
        //                      `'TTs.,        `\   /7
        //                           `'TTs.,    |, AV
        //                                `'TTs.,\/7
        //                                     `'T`
        //                                       v1
        //
        const faces = [];
        if (dot(v3?.point || [], normal) - distPO < 0) {
            // the face is not able to see the point so `planeNormal`
            // is pointing outside the tetrahedron
            if (!v3) throw new Error("v3 is not defined");
            if (!v2) throw new Error("v2 is not defined");
            if (!v1) throw new Error("v1 is not defined");
            faces.push(
                Face.createTriangle(v0, v1, v2),
                Face.createTriangle(v3, v1, v0),
                Face.createTriangle(v3, v2, v1),
                Face.createTriangle(v3, v0, v2)
            );

            // set the opposite edge
            for (i = 0; i < 3; i += 1) {
                const j = (i + 1) % 3;
                // join face[i] i > 0, with the first face
                if (!faces[0]) throw new Error("faces[0] is not defined");
                if (!faces[j + 1]) throw new Error("faces[i] is not defined");
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                faces[i + 1].getEdge(2)?.setOpposite(faces[0].getEdge(j)!);
                // join face[i] with face[i + 1], 1 <= i <= 3
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                faces[i + 1].getEdge(1)?.setOpposite(faces[j + 1].getEdge(0)!);
            }
        } else {
            // the face is able to see the point so `planeNormal`
            // is pointing inside the tetrahedron
            if (!v3) throw new Error("v3 is not defined");
            if (!v2) throw new Error("v2 is not defined");
            if (!v1) throw new Error("v1 is not defined");
            faces.push(
                Face.createTriangle(v0, v2, v1),
                Face.createTriangle(v3, v0, v1),
                Face.createTriangle(v3, v1, v2),
                Face.createTriangle(v3, v2, v0)
            );

            // set the opposite edge
            for (i = 0; i < 3; i += 1) {
                const j = (i + 1) % 3;
                // join face[i] i > 0, with the first face
                faces[i + 1]
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    .getEdge(2)
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    ?.setOpposite(faces[0].getEdge((3 - i) % 3)!);
                // join face[i] with face[i + 1]
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                faces[i + 1].getEdge(0)?.setOpposite(faces[j + 1].getEdge(1)!);
            }
        }

        // the initial hull is the tetrahedron
        for (i = 0; i < 4; i += 1) {
            this.faces.push(faces[i]);
        }

        // initial assignment of vertices to the faces of the tetrahedron
        for (i = 0; i < vertices.length; i += 1) {
            const vertex = vertices[i];
            if (
                vertex !== v0 &&
                vertex !== v1 &&
                vertex !== v2 &&
                vertex !== v3
            ) {
                maxDistance = this.tolerance;
                let maxFace;
                for (j = 0; j < 4; j += 1) {
                    const distance = faces[j].distanceToPlane(vertex.point);
                    if (distance > maxDistance) {
                        maxDistance = distance;
                        maxFace = faces[j];
                    }
                }

                if (maxFace) {
                    this.addVertexToFace(vertex, maxFace);
                }
            }
        }
    }

    reindexFaceAndVertices() {
        // remove inactive faces
        const activeFaces = [];
        for (let i = 0; i < this.faces.length; i += 1) {
            const face = this.faces[i];
            if (face.mark === FaceState.VISIBLE) {
                activeFaces.push(face);
            }
        }
        this.faces = activeFaces;
    }

    collectFaces(skipTriangulation: boolean) {
        const faceIndices = [];
        for (let i = 0; i < this.faces.length; i += 1) {
            if (this.faces[i].mark !== FaceState.VISIBLE) {
                throw Error("attempt to include a destroyed face in the hull");
            }
            const indices = this.faces[i].collectIndices();
            if (skipTriangulation) {
                faceIndices.push(indices);
            } else {
                for (let j = 0; j < indices.length - 2; j += 1) {
                    faceIndices.push([
                        indices[0],
                        indices[j + 1],
                        indices[j + 2],
                    ]);
                }
            }
        }
        return faceIndices;
    }

    /**
     * Finds the next vertex to make faces with the current hull
     *
     * - let `face` be the first face existing in the `claimed` vertex list
     *  - if `face` doesn't exist then return since there're no vertices left
     *  - otherwise for each `vertex` that face sees find the one furthest away
     *  from `face`
     *
     * @return {Vertex|undefined} Returns undefined when there're no more
     * visible vertices
     */
    nextVertexToAdd() {
        if (!this.claimed.isEmpty()) {
            let eyeVertex, vertex;
            let maxDistance = 0;
            const eyeFace = this.claimed.first()?.face;
            for (
                vertex = eyeFace?.outside;
                vertex && vertex.face === eyeFace;
                vertex = vertex.next
            ) {
                const distance = eyeFace?.distanceToPlane(vertex.point) || 0;
                if (distance > maxDistance) {
                    maxDistance = distance;
                    eyeVertex = vertex;
                }
            }
            return eyeVertex;
        }
    }

    /**
     * Computes a chain of half edges in ccw order called the `horizon`, for an
     * edge to be part of the horizon it must join a face that can see
     * `eyePoint` and a face that cannot see `eyePoint`
     *
     * @param {number[]} eyePoint - The coordinates of a point
     * @param {HalfEdge} crossEdge - The edge used to jump to the current `face`
     * @param {Face} face - The current face being tested
     * @param {HalfEdge[]} horizon - The edges that form part of the horizon in
     * ccw order
     */
    computeHorizon(
        eyePoint: number[],
        crossEdge: HalfEdge,
        face: Face,
        horizon: HalfEdge[]
    ) {
        // moves face's vertices to the `unclaimed` vertex list
        this.deleteFaceVertices(face, new Face());

        face.mark = FaceState.DELETED;

        let edge;
        if (!crossEdge) {
            edge = crossEdge =
                face.getEdge(0) || new HalfEdge(new Vertex([], 0), new Face());
        } else {
            // start from the next edge since `crossEdge` was already analyzed
            // (actually `crossEdge.opposite` was the face who called this method
            // recursively)
            edge = crossEdge.next;
        }

        // All the faces that are able to see `eyeVertex` are defined as follows
        //
        //       v    /
        //           / <== visible face
        //          /
        //         |
        //         | <== not visible face
        //
        //  dot(v, visible face normal) - visible face offset > this.tolerance
        //
        do {
            const oppositeEdge = edge?.opposite;
            const oppositeFace = oppositeEdge?.face;
            if (!oppositeEdge) throw new Error("oppositeEdge is not defined");
            if (oppositeFace?.mark === FaceState.VISIBLE) {
                if (oppositeFace.distanceToPlane(eyePoint) > this.tolerance) {
                    this.computeHorizon(
                        eyePoint,
                        oppositeEdge,
                        oppositeFace,
                        horizon
                    );
                } else {
                    if (edge) horizon.push(edge);
                }
            }
            edge = edge?.next;
        } while (edge !== crossEdge);
    }

    /**
     * Creates a face with the points `eyeVertex.point`, `horizonEdge.tail` and
     * `horizonEdge.tail` in ccw order
     *
     * @return {HalfEdge} The half edge whose vertex is the eyeVertex
     */
    addAdjoiningFace(eyeVertex: Vertex, horizonEdge: HalfEdge) {
        // all the half edges are created in ccw order thus the face is always
        // pointing outside the hull
        // edges:
        //
        //                  eyeVertex.point
        //                       / \
        //                      /   \
        //                  1  /     \  0
        //                    /       \
        //                   /         \
        //                  /           \
        //          horizon.tail --- horizon.head
        //                        2
        //
        const face = Face.createTriangle(
            eyeVertex,
            horizonEdge.tail() || new Vertex([], 0),
            horizonEdge.head()
        );
        this.faces.push(face);
        // join face.getEdge(-1) with the horizon's opposite edge
        // face.getEdge(-1) = face.getEdge(2)
        face.getEdge(-1)?.setOpposite(
            horizonEdge.opposite || new HalfEdge(new Vertex([], 0), new Face())
        );
        return face.getEdge(0);
    }

    /**
     * Adds horizon.length faces to the hull, each face will be 'linked' with the
     * horizon opposite face and the face on the left/right
     *
     * @param {HalfEdge[]} horizon - A chain of half edges in ccw order
     */
    addNewFaces(eyeVertex: Vertex, horizon: HalfEdge[]) {
        this.newFaces = [];
        let firstSideEdge, previousSideEdge;
        for (let i = 0; i < horizon.length; i += 1) {
            const horizonEdge = horizon[i];
            // returns the right side edge
            const sideEdge = this.addAdjoiningFace(eyeVertex, horizonEdge);
            if (!firstSideEdge) {
                firstSideEdge = sideEdge;
            } else {
                // joins face.getEdge(1) with previousFace.getEdge(0)
                sideEdge?.next?.setOpposite(
                    previousSideEdge ||
                        new HalfEdge(new Vertex([], 0), new Face())
                );
            }
            this.newFaces.push(sideEdge?.face || new Face());
            previousSideEdge = sideEdge;
        }
        firstSideEdge?.next?.setOpposite(
            previousSideEdge || new HalfEdge(new Vertex([], 0), new Face())
        );
    }

    /**
     * Computes the distance from `edge` opposite face's centroid to
     * `edge.face`
     *
     * @return
     * - A positive number when the centroid of the opposite face is above the
     *   face i.e. when the faces are concave
     * - A negative number when the centroid of the opposite face is below the
     *   face i.e. when the faces are convex
     */
    oppositeFaceDistance(edge: HalfEdge) {
        return edge?.face?.distanceToPlane(edge.opposite?.face?.centroid || []);
    }

    /**
     * Merges a face with none/any/all its neighbors according to the strategy
     * used
     *
     * if `mergeType` is MERGE_NON_CONVEX_WRT_LARGER_FACE then the merge will be
     * decided based on the face with the larger area, the centroid of the face
     * with the smaller area will be checked against the one with the larger area
     * to see if it's in the merge range [tolerance, -tolerance] i.e.
     *
     *    dot(centroid smaller face, larger face normal) - larger face offset > -tolerance
     *
     * Note that the first check (with +tolerance) was done on `computeHorizon`
     *
     * If the above is not true then the check is done with respect to the smaller
     * face i.e.
     *
     *    dot(centroid larger face, smaller face normal) - smaller face offset > -tolerance
     *
     * If true then it means that two faces are non convex (concave), even if the
     * dot(...) - offset value is > 0 (that's the point of doing the merge in the
     * first place)
     *
     * If two faces are concave then the check must also be done on the other face
     * but this is done in another merge pass, for this to happen the face is
     * marked in a temporal NON_CONVEX state
     *
     * if `mergeType` is MERGE_NON_CONVEX then two faces will be merged only if
     * they pass the following conditions
     *
     *    dot(centroid smaller face, larger face normal) - larger face offset > -tolerance
     *    dot(centroid larger face, smaller face normal) - smaller face offset > -tolerance
     */
    doAdjacentMerge(face: Face, mergeType: number) {
        let edge = face.edge;
        let convex = true;
        let it = 0;
        do {
            if (it >= face.nVertices) {
                throw Error("merge recursion limit exceeded");
            }
            const oppositeFace = edge?.opposite?.face;
            let merge = false;

            // Important notes about the algorithm to merge faces
            //
            // - Given a vertex `eyeVertex` that will be added to the hull
            //   all the faces that cannot see `eyeVertex` are defined as follows
            //
            //      dot(v, not visible face normal) - not visible offset < tolerance
            //
            // - Two faces can be merged when the centroid of one of these faces
            // projected to the normal of the other face minus the other face offset
            // is in the range [tolerance, -tolerance]
            // - Since `face` (given in the input for this method) has passed the
            // check above we only have to check the lower bound e.g.
            //
            //      dot(v, not visible face normal) - not visible offset > -tolerance
            //
            if (mergeType === MergeType.MERGE_NON_CONVEX) {
                if (
                    (this.oppositeFaceDistance(
                        edge || new HalfEdge(new Vertex([], 0), new Face())
                    ) || 0) > -this.tolerance ||
                    (this.oppositeFaceDistance(
                        edge?.opposite ||
                            new HalfEdge(new Vertex([], 0), new Face())
                    ) || 0) > -this.tolerance
                ) {
                    merge = true;
                }
            } else {
                if (face.area > (oppositeFace?.area || 0)) {
                    if (
                        (this.oppositeFaceDistance(
                            edge || new HalfEdge(new Vertex([], 0), new Face())
                        ) || 0) > -this.tolerance
                    ) {
                        merge = true;
                    } else if (
                        (this.oppositeFaceDistance(
                            edge?.opposite ||
                                new HalfEdge(new Vertex([], 0), new Face())
                        ) || 0) > -this.tolerance
                    ) {
                        convex = false;
                    }
                } else {
                    if (
                        (this.oppositeFaceDistance(
                            edge?.opposite ||
                                new HalfEdge(new Vertex([], 0), new Face())
                        ) || 0) > -this.tolerance
                    ) {
                        merge = true;
                    } else if (
                        (this.oppositeFaceDistance(
                            edge || new HalfEdge(new Vertex([], 0), new Face())
                        ) || 0) > -this.tolerance
                    ) {
                        convex = false;
                    }
                }
            }

            if (merge) {
                debug("face merge");
                // when two faces are merged it might be possible that redundant faces
                // are destroyed, in that case move all the visible vertices from the
                // destroyed faces to the `unclaimed` vertex list
                const discardedFaces = face.mergeAdjacentFaces(
                    edge || new HalfEdge(new Vertex([], 0), new Face()),
                    []
                );
                for (let i = 0; i < discardedFaces.length; i += 1) {
                    this.deleteFaceVertices(
                        discardedFaces[i] || new Face(),
                        face
                    );
                }
                return true;
            }

            edge = edge?.next || null;
            it += 1;
        } while (edge !== face.edge);
        if (!convex) {
            face.mark = FaceState.NON_CONVEX;
        }
        return false;
    }

    /**
     * Adds a vertex to the hull with the following algorithm
     *
     * - Compute the `horizon` which is a chain of half edges, for an edge to
     *   belong to this group it must be the edge connecting a face that can
     *   see `eyeVertex` and a face which cannot see `eyeVertex`
     * - All the faces that can see `eyeVertex` have its visible vertices removed
     *   from the claimed VertexList
     * - A new set of faces is created with each edge of the `horizon` and
     *   `eyeVertex`, each face is connected with the opposite horizon face and
     *   the face on the left/right
     * - The new faces are merged if possible with the opposite horizon face first
     *   and then the faces on the right/left
     * - The vertices removed from all the visible faces are assigned to the new
     *   faces if possible
     */
    addVertexToHull(eyeVertex: Vertex) {
        const horizon: HalfEdge[] = [];

        this.unclaimed.clear();

        // remove `eyeVertex` from `eyeVertex.face` so that it can't be added to the
        // `unclaimed` vertex list
        this.removeVertexFromFace(eyeVertex, eyeVertex.face || new Face());
        this.computeHorizon(
            eyeVertex.point,
            new HalfEdge(new Vertex([], 0), new Face()),
            eyeVertex.face || new Face(),
            horizon
        );
        if (debug.enabled) {
            debug(
                "horizon %j",
                horizon.map(function (edge) {
                    return edge.head().index;
                })
            );
        }
        this.addNewFaces(eyeVertex, horizon);

        debug("first merge");

        // first merge pass
        // Do the merge with respect to the larger face
        for (let i = 0; i < this.newFaces.length; i += 1) {
            const face = this.newFaces[i];
            if (face.mark === FaceState.VISIBLE) {
                while (
                    this.doAdjacentMerge(
                        face,
                        MergeType.MERGE_NON_CONVEX_WRT_LARGER_FACE
                    )
                ) {
                    void 0;
                }
            }
        }

        debug("second merge");

        // second merge pass
        // Do the merge on non convex faces (a face is marked as non convex in the
        // first pass)
        for (let i = 0; i < this.newFaces.length; i += 1) {
            const face = this.newFaces[i];
            if (face.mark === FaceState.NON_CONVEX) {
                face.mark = FaceState.VISIBLE;
                while (this.doAdjacentMerge(face, MergeType.MERGE_NON_CONVEX)) {
                    void 0;
                }
            }
        }

        debug("reassigning points to newFaces");
        // reassign `unclaimed` vertices to the new faces
        this.resolveUnclaimedPoints(this.newFaces);
    }

    build() {
        let iterations = 0;
        let eyeVertex;
        this.createInitialSimplex();
        while ((eyeVertex = this.nextVertexToAdd())) {
            iterations += 1;
            debug("== iteration %j ==", iterations);
            debug(
                "next vertex to add = %d %j",
                eyeVertex.index,
                eyeVertex.point
            );
            this.addVertexToHull(eyeVertex);
            debug("end");
        }
        this.reindexFaceAndVertices();
    }

    /**
     * Creates a new array of faces from an array of points.
     * @param _points The array of points to create the hull from.
     * @returns An array of faces.
     */
    static createHull(_points: (number[] | Vector3)[]) {
        let points = vectorArrayToNumberArray(_points);
        points = points.slice();
        for (let pti = 0; pti < points.length; pti++) {
            const pt = points[pti];
            if (!Array.isArray(pt)) {
                points[pti] = [pt[0], pt[1], pt[2]];
            }
        }
        const hull = new QuickHull(points);
        hull.build();
        const faces = hull.collectFaces(false);
        return faces;
    }
}

export default QuickHull;
