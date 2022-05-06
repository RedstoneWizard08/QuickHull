import { Face } from "./face";
import { debug, distance, squaredDistance } from "./util";
import { Vertex } from "./vertex";

export class HalfEdge {
    public vertex: Vertex;
    public next: HalfEdge | null;
    public prev: HalfEdge | null;
    public face: Face | null;
    public opposite: HalfEdge | null;

    constructor(vertex: Vertex, face: Face) {
        this.vertex = vertex;
        this.face = face;
        this.next = null;
        this.prev = null;
        this.opposite = null;
    }

    head() {
        return this.vertex;
    }

    tail() {
        return this.prev ? this.prev.vertex : null;
    }

    length() {
        if (this.tail()) {
            return distance(this.tail()?.point || [0, 0], this.head().point);
        }
        return -1;
    }

    lengthSquared() {
        if (this.tail()) {
            return squaredDistance(
                this.tail()?.point || [0, 0],
                this.head().point
            );
        }
        return -1;
    }

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
