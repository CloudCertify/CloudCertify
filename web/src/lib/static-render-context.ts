import { createContext } from 'react';

export const StaticRenderContext = createContext(false);

/** The page already displayed its final counts in the initial HTML. */
export const HydratedContentContext = createContext(false);
