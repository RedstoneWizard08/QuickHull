/**
 * A state of a particular face.
 * Can be VISIBLE, DELETED, OR NON_CONVEX.
 */
export enum FaceState {
    VISIBLE,
    NON_CONVEX,
    DELETED,
}

/**
 * A type of merge that QuickHull will perform.
 * Can be MERGE_NON_CONVEX or MERGE_NON_CONVEX_WRT_LARGER_FACE.
 */
export enum MergeType {
    MERGE_NON_CONVEX_WRT_LARGER_FACE,
    MERGE_NON_CONVEX,
}
