import { Face } from "./face";

export class Vertex {
    public point: number[];
    public index: number;
    public next: Vertex | null;
    public prev: Vertex | null;
    public face: Face | null;

    constructor(point: number[], index: number) {
        this.point = point;
        // index in the input array
        this.index = index;
        // vertex is a double linked list node
        this.next = null;
        this.prev = null;
        // the face that is able to see this point
        this.face = null;
    }
}

export default Vertex;
