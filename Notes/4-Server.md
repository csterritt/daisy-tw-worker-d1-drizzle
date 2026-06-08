## server and test running

- run the server with one of the following commands, you cannot just run 'npm run dev':
  - npm run dev-open-sign-up
  - npm run dev-no-sign-up
  - npm run dev-gated-sign-up
  - npm run dev-interest-sign-up
  - npm run dev-both-sign-up
- by default, run the server with open sign-up
- run the tests with the following command:
  - npx playwright test
  - you can add specific tests by naming them after the 'npx playwright test' command
  - you can have it stop at the first failure by adding the '-x' argument
- when running the tests, just run until the first test fails, and fix that problem.
  - if that fix applies to other tests, apply that fix to the other tests, then continue doing one fail at a time
- when writing tests, make sure to look in the @e2e-tests/support folder for test helpers
- when writing tests, make sure to look in the @e2e-tests/sign-in folder for test examples
