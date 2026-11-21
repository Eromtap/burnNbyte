# Repository workflow rules

## Protected-branch policy

- Never commit or push changes directly to `main` or another protected branch.
- Before editing files, create or switch to a clearly named feature, fix, or chore branch.
- Push only the working branch to the remote.
- Changes may reach `main` only through a pull request from the working branch.
- Never merge or close a pull request on the user's behalf unless the user explicitly asks for that specific action.
- After preparing a pull request, leave the final review and merge decision to the user.
- Treat requests such as "push this," "ship it," or "deploy to production" as permission to push the working branch and prepare a pull request—not permission to push or merge directly into `main`.
