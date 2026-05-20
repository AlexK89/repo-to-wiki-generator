## Code style
- never use `interface`, instead use `type`
- write simple, single responsibility functions
- write "pure" functions
- code must follow DRY principals
- 1 component per file
- keep modular folder structure. View child components must live in the same folder, generic components must be in `src/components`
- code should be highly readable, and extendable.
- use tailwind classes with default values, use custom styles only when the default values are not matching what we need. BAD: `w-[24px]`, GOOD: `w-6`
- props type name should be `Props` not `(ComponentName)Props`
- for naming convention - always use full descriptive names, DO NOT USE names like `x`, `t`, etc
- declare functions with `const`

## CRITICAL
- UX is very important, the user flow must be simple, functional and easy to navigate.
- every part of the implementation must involve careful product thinking and coherence with the rest of the page and functionality.