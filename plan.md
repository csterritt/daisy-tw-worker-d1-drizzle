# Plan

1. Remove or gate sensitive logging and debug/test routes; add dev-only guards for test/debug handlers.
2. Align cookie security options and manual clears; harden cookie-based test primitives.
3. Improve auth response typing/validation and remove unsafe casts.
4. Tidy import order and resolve email service duplication.
5. Add minimal tests covering validation/auth routing and absence of test routes in production.
