// Export the default types from express.
export * from 'express';

// If res.locals needs to be typed, add the types here..
type ResponseLocals = any;

declare module 'express' {
  export interface Response {
    locals: ResponseLocals;
  }
}

declare const __ONE_INCH_API_KEY__: string;
