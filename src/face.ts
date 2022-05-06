import { FaceState } from "./enums";
import HalfEdge from "./halfedge";
import {
    add,
    copy,
    cross,
    debug,
    dot,
    length,
    normalize,
    scale,
    scaleAndAdd,
    subtract,
} from "./util";
import Vertex from "./vertex";

export class Face {
    public normal: number[];
    public centroid: number[];
    public offset: number;
    public outside: Vertex | null;
    public mark: number;
    public edge: HalfEdge | null;
    public nVertices: number;
    public area = 0;

    constructor() {
        this.normal = [];
        this.centroid = [];
        // signed distance from face to the origin
        this.offset = 0;
        // pointer to the a vertex in a double linked list this face can see
        this.outside = null;
        this.mark = FaceState.VISIBLE;
        this.edge = null;
        this.nVertices = 0;
    }

    getEdge(i: number) {
        if (typeof i !== "number") {
            throw Error("requires a number");
        }
        let it = this.edge;
        while (i > 0) {
            it = it?.next || it;
            i -= 1;
        }
        while (i < 0) {
            it = it?.prev || it;
            i += 1;
        }
        return it;
    }

    computeNormal() {
        const e0 = this.edge;
        const e1 = e0?.next;
        let e2 = e1?.next;
        const v2 = subtract(
            [],
            e1?.head().point || [0, 0],
            e0?.head().point || [0, 0]
        );
        const t: number[] = [];
        const v1: number[] = [];

        this.nVertices = 2;
        this.normal = [0, 0, 0];
        while (e2 !== e0) {
            copy(v1, v2);
            subtract(
                v2,
                e2?.head().point || [0, 0],
                e0?.head().point || [0, 0]
            );
            add(this.normal, this.normal, cross(t, v1, v2));
            e2 = e2?.next;
            this.nVertices += 1;
        }
        this.area = length(this.normal);
        // normalize the vector, since we've already calculated the area
        // it's cheaper to scale the vector using this quantity instead of
        // doing the same operation again
        this.normal = scale(this.normal, this.normal, 1 / this.area);
    }

    computeNormalMinArea(minArea: number) {
        this.computeNormal();
        if (this.area < minArea) {
            // compute the normal without the longest edge
            let maxEdge;
            let maxSquaredLength = 0;
            let edge = this.edge || null;

            // find the longest edge (in length) in the chain of edges
            do {
                const lengthSquared = edge?.lengthSquared() || 0;
                if (lengthSquared > maxSquaredLength) {
                    maxEdge = edge;
                    maxSquaredLength = lengthSquared;
                }
                edge = edge?.next || null;
            } while (edge !== this.edge);

            const p1 = maxEdge?.tail()?.point;
            const p2 = maxEdge?.head().point;
            const maxVector = subtract([], p2 || [0, 0], p1 || [0, 0]);
            const maxLength = Math.sqrt(maxSquaredLength);
            // maxVector is normalized after this operation
            scale(maxVector, maxVector, 1 / maxLength);
            // compute the projection of maxVector over this face normal
            const maxProjection = dot(this.normal, maxVector);
            // subtract the quantity maxEdge adds on the normal
            scaleAndAdd(
                this.normal,
                this.normal,
                maxVector.length,
                -maxProjection
            );
            // renormalize `this.normal`
            normalize(this.normal, this.normal);
        }
    }

    computeCentroid() {
        this.centroid = [0, 0, 0];
        let edge = this.edge;
        do {
            add(this.centroid, this.centroid, edge?.head().point || [0, 0]);
            edge = edge?.next || null;
        } while (edge !== this.edge);
        scale(this.centroid, this.centroid, 1 / this.nVertices);
    }

    computeNormalAndCentroid(minArea?: number) {
        if (typeof minArea !== "undefined") {
            this.computeNormalMinArea(minArea);
        } else {
            this.computeNormal();
        }
        this.computeCentroid();
        this.offset = dot(this.normal, this.centroid);
    }

    distanceToPlane(point: number[]) {
        return dot(this.normal, point) - this.offset;
    }

    /**
     * @private
     *
     * Connects two edges assuming that prev.head().point === next.tail().point
     *
     * @param {HalfEdge} prev
     * @param {HalfEdge} next
     */
    private connectHalfEdges(prev: HalfEdge, next: HalfEdge) {
        let discardedFace;
        if (prev.opposite?.face === next.opposite?.face) {
            // `prev` is remove a redundant edge
            const oppositeFace = next.opposite?.face || null;
            let oppositeEdge;
            if (prev === this.edge) {
                this.edge = next;
            }
            if (oppositeFace?.nVertices === 3) {
                // case:
                // remove the face on the right
                //
                //       /|\
                //      / | \ the face on the right
                //     /  |  \ --> opposite edge
                //    / a |   \
                //   *----*----*
                //  /     b  |  \
                //           ▾
                //      redundant edge
                //
                // Note: the opposite edge is actually in the face to the right
                // of the face to be destroyed
                oppositeEdge = next.opposite?.prev?.opposite;
                oppositeFace.mark = FaceState.DELETED;
                discardedFace = oppositeFace;
            } else {
                // case:
                //          t
                //        *----
                //       /| <- right face's redundant edge
                //      / | opposite edge
                //     /  |  ▴   /
                //    / a |  |  /
                //   *----*----*
                //  /     b  |  \
                //           ▾
                //      redundant edge
                oppositeEdge = next.opposite?.next;
                // make sure that the link `oppositeFace.edge` points correctly even
                // after the right face redundant edge is removed
                if (oppositeFace?.edge === oppositeEdge?.prev) {
                    if (!oppositeFace) throw Error("oppositeFace is null!");
                    oppositeFace.edge = oppositeEdge || null;
                }

                //       /|   /
                //      / | t/opposite edge
                //     /  | / ▴  /
                //    / a |/  | /
                //   *----*----*
                //  /     b     \
                if (!oppositeEdge) throw Error("oppositeEdge is null!");
                oppositeEdge.prev = oppositeEdge?.prev?.prev || null;

                if (!oppositeEdge.prev)
                    throw Error("oppositeEdge.prev is null!");
                oppositeEdge.prev.next = oppositeEdge || null;
            }
            //       /|
            //      / |
            //     /  |
            //    / a |
            //   *----*----*
            //  /     b  ▴  \
            //           |
            //     redundant edge
            next.prev = prev.prev;

            if (!next.prev) throw Error("next.prev is null!");
            next.prev.next = next;

            //       / \  \
            //      /   \->\
            //     /     \<-\ opposite edge
            //    / a     \  \
            //   *----*----*
            //  /     b  ^  \
            if (!oppositeEdge) throw Error("oppositeEdge is null!");
            next.setOpposite(oppositeEdge);

            oppositeFace?.computeNormalAndCentroid();
        } else {
            // trivial case
            //        *
            //       /|\
            //      / | \
            //     /  |--> next
            //    / a |   \
            //   *----*----*
            //    \ b |   /
            //     \  |--> prev
            //      \ | /
            //       \|/
            //        *
            prev.next = next;
            next.prev = prev;
        }
        return discardedFace;
    }

    mergeAdjacentFaces(
        adjacentEdge: HalfEdge,
        discardedFaces: (Face | null)[] = []
    ) {
        const oppositeEdge = adjacentEdge.opposite;
        const oppositeFace = oppositeEdge?.face || null;

        discardedFaces.push(oppositeFace || null);

        if (!oppositeFace) throw Error("oppositeFace is null!");
        oppositeFace.mark = FaceState.DELETED;

        // find the chain of edges whose opposite face is `oppositeFace`
        //
        //                ===>
        //      \         face         /
        //       * ---- * ---- * ---- *
        //      /     opposite face    \
        //                <===
        //
        let adjacentEdgePrev = adjacentEdge.prev;
        let adjacentEdgeNext = adjacentEdge.next;
        let oppositeEdgePrev = oppositeEdge?.prev;
        let oppositeEdgeNext = oppositeEdge?.next;

        // left edge
        while (adjacentEdgePrev?.opposite?.face === oppositeFace) {
            adjacentEdgePrev = adjacentEdgePrev.prev;
            oppositeEdgeNext = oppositeEdgeNext?.next;
        }
        // right edge
        while (adjacentEdgeNext?.opposite?.face === oppositeFace) {
            adjacentEdgeNext = adjacentEdgeNext.next;
            oppositeEdgePrev = oppositeEdgePrev?.prev;
        }
        // adjacentEdgePrev  \         face         / adjacentEdgeNext
        //                    * ---- * ---- * ---- *
        // oppositeEdgeNext  /     opposite face    \ oppositeEdgePrev

        // fix the face reference of all the opposite edges that are not part of
        // the edges whose opposite face is not `face` i.e. all the edges that
        // `face` and `oppositeFace` do not have in common
        let edge;
        for (
            edge = oppositeEdgeNext;
            edge !== oppositeEdgePrev?.next;
            edge = edge?.next
        ) {
            if (!edge) throw Error("edge is null!");
            edge.face = this;
        }

        // make sure that `face.edge` is not one of the edges to be destroyed
        // Note: it's important for it to be a `next` edge since `prev` edges
        // might be destroyed on `connectHalfEdges`
        this.edge = adjacentEdgeNext;

        // connect the extremes
        // Note: it might be possible that after connecting the edges a triangular
        // face might be redundant
        let discardedFace;
        if (!oppositeEdgePrev) throw Error("adjacentEdgePrev is null!");
        if (!adjacentEdgeNext) throw Error("adjacentEdgeNext is null!");
        if (!adjacentEdgePrev) throw Error("adjacentEdgePrev is null!");
        if (!oppositeEdgeNext) throw Error("oppositeEdgeNext is null!");

        discardedFace = this.connectHalfEdges(
            oppositeEdgePrev,
            adjacentEdgeNext
        );
        if (discardedFace) {
            discardedFaces.push(discardedFace);
        }
        discardedFace = this.connectHalfEdges(
            adjacentEdgePrev,
            oppositeEdgeNext
        );
        if (discardedFace) {
            discardedFaces.push(discardedFace);
        }

        this.computeNormalAndCentroid();
        // TODO: additional consistency checks
        return discardedFaces;
    }

    collectIndices() {
        const indices = [];
        let edge = this.edge;
        do {
            indices.push(edge?.head().index);
            edge = edge?.next || null;
        } while (edge !== this.edge);
        return indices;
    }

    static createTriangle(v0: Vertex, v1: Vertex, v2: Vertex, minArea = 0) {
        const face = new Face();
        const e0 = new HalfEdge(v0, face);
        const e1 = new HalfEdge(v1, face);
        const e2 = new HalfEdge(v2, face);

        // join edges
        e0.next = e2.prev = e1;
        e1.next = e0.prev = e2;
        e2.next = e1.prev = e0;

        // main half edge reference
        face.edge = e0;
        face.computeNormalAndCentroid(minArea);
        if (debug.enabled) {
            debug("face created %j", face?.collectIndices());
        }
        return face;
    }
}

export default Face;
