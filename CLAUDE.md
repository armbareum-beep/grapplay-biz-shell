# grapplay-biz-shell

## Branch and PR naming

Every PR branch is named `TYPE/grapplay-biz-shell_PR<number>` and its PR title starts with
`[TYPE] grapplay-biz-shell_PR<number>`, so a release can be traced by name.

- `TYPE` is one of `FIX` (bug fix), `FEAT` (new feature), `HOTFIX` (urgent production fix),
  `REFACTOR`, `DOCS`, `TEST`, `CHORE`.
- `<number>` is the number the PR will get: the highest issue or PR number in the repository plus
  one. Read it right before pushing:
  `gh api "repos/armbareum-beep/grapplay-biz-shell/issues?state=all&per_page=1&sort=created&direction=desc" --jq '.[0].number'`.
  If the PR is given a different number, say so in the PR description; do not rename the branch,
  because that closes the PR.
- Example: branch `FIX/grapplay-biz-shell_PR24`, title `[FIX] grapplay-biz-shell_PR24 short description`.
- Git does not allow `[` in a branch name, so the brackets are used in the PR title only.
