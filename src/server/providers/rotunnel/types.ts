type JsonObject = Record<string, unknown>;

export type { JsonObject };

export interface NativeCandidate {
  universeId: string;
  nativePosition: number;
  sourceSortId: string;
  raw: JsonObject;
}

export interface NativeSort {
  id: string;
  name: string;
  description: string;
}

export class RoTunnelError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'RoTunnelError';
  }
}
