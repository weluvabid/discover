/** Stable provider facade. Implementation lives in focused modules. */
export { RoTunnelClient } from '../providers/rotunnel/client';
export { RoTunnelError } from '../providers/rotunnel/types';
export type { NativeCandidate, NativeSort } from '../providers/rotunnel/types';
export { normalizeExperience } from '../providers/rotunnel/normalize-experience';
export { selectSortForContext, candidateIds } from '../providers/rotunnel/sort-selection';
