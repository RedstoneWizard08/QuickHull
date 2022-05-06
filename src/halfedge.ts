import { Face } from "./face";
import { debug, distance, squaredDistance } from "./util";
import { Vertex } from "./vertex";

/**
 * A half-edge in a convex hull.
 */
export class HalfEdge {
    /**
     * The vertex at the end of this half-edge.
     */
    public vertex: Vertex;

    /**
     * The next half-edge in the face.
     */
    public next: HalfEdge | null;

    /**
     * The previous half-edge in the face.
     */
    public prev: HalfEdge | null;

    /**
     * The face this half-edge is part of.
     */
    public face: Face | null;

    /**
     * The half-edge opposite to this half-edge.
     */
    public opposite: HalfEdge | null;

    /**
     * Creates a new half-edge.
     * @param vertex The vertex at the end of this half-edge.
     * @param face The face this half-edge is part of.
     */
    constructor(vertex: Vertex, face: Face) {
        this.vertex = vertex;
        this.face = face;
        this.next = null;
        this.prev = null;
        this.opposite = null;
    }

    /**
     * Returns the vertex at the end of this half-edge.
     * @returns The vertex at the end of this half-edge.
     */
    head() {
        return this.vertex;
    }

    /**
     * Returns the vertex at the end of the previous half-edge in the face.
     * @returns The vertex at the end of the previous half-edge in the face.
     */
    tail() {
        return this.prev ? this.prev.vertex : null;
    }

    /**
     * Gets the length between the head and the tail of this half-edge.
     * @returns The length between the head and tail of this half-edge.
     */
    length() {
        if (this.tail()) {
            return distance(this.tail()?.point || [0, 0], this.head().point);
        }
        return -1;
    }

    /**
     * Gets the length of this half-edge.
     * @returns The length of this half-edge.
     */
    lengthSquared() {
        if (this.tail()) {
            return squaredDistance(
                this.tail()?.point || [0, 0],
                this.head().point
            );
        }
        return -1;
    }

    /**
     * Sets the opposite half-edge.
     * @param edge The new opposite half-edge.
     */
    setOpposite(edge: HalfEdge) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const me = this;
        if (debug.enabled) {
            debug(
                `opposite ${me.tail()?.index} <--> ${
                    me.head()?.index
                } between ${me.face?.collectIndices()}, ${edge.face?.collectIndices()}`
            );
        }
        this.opposite = edge;
        edge.opposite = this;
    }
}

export default HalfEdge;
