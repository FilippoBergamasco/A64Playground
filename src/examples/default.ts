export const DEFAULT_EXAMPLE = `// A64 Playground -- example: sum 1..5 into x0
        movz x0, #0        // x0 = accumulator
        movz x1, #5        // x1 = loop counter
loop:   add  x0, x0, x1     // x0 += x1
        subs x1, x1, #1     // x1 -= 1, set flags
        b.ne loop           // repeat while x1 != 0
        movz x2, #1         // sentinel marking completion
`;
