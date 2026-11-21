# Contributing to BurnnByte

All changes use a branch-and-pull-request workflow.

1. Start from the latest `main`.
2. Create a feature, fix, or chore branch before editing.
3. Commit and push only that branch.
4. Open a pull request targeting `main`.
5. Wait for review and required checks.
6. A repository owner performs the final merge.

Direct commits, direct pushes, and direct merges to `main` are prohibited. Requests to deploy or push changes do not waive this policy.

## Local push protection

This repository includes a pre-push hook that rejects pushes to `main` and `master`. Enable the tracked hooks after cloning:

```sh
git config core.hooksPath .githooks
```

GitHub branch protection or a repository ruleset should also require pull requests for `main`, because local hooks can be bypassed.
