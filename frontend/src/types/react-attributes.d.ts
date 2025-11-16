// Allow custom JSX attributes like `variant` and `size` on React components
declare module 'react' {
  interface Attributes {
    variant?: string;
    size?: string;
  }
}


