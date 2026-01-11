export type Nullable<T> = T | null | undefined;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type Merge<A, B> = Prettify<Omit<A, keyof B> & B>;

/**
 * Make a union from an object’s values:
 * const sizes = { sm: 'sm', md: 'md' } as const;
 * type Size = ValueOf<typeof sizes>; // 'sm' | 'md'
 */
export type ValueOf<T> = T[keyof T];

/**
 * Common helper for “polymorphic” props (when you wrap RN components):
 */
export type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;
