# Daily PR review to Google Chat

This workflow runs in GitHub every day at 12:00 in Montevideo (15:00 UTC). It finds open pull requests that have not been reviewed by this workflow, asks OpenAI for a short Thai review, posts the result to Google Chat, and then adds the `course-review-sent` label. The label prevents another message for the same PR.

## One-time setup

1. In the Google Chat space **💻 Review PR**, create an incoming webhook and copy its URL.
2. In GitHub, open **Settings → Secrets and variables → Actions** for this repository.
3. Add these repository secrets:
   - `GOOGLE_CHAT_WEBHOOK_URL`: the URL copied from Google Chat.
   - `OPENAI_API_KEY`: an OpenAI API key allowed to use the Responses API.
4. Optional: add the repository variable `OPENAI_MODEL` to choose a different model. If it is not set, the workflow uses `gpt-5-mini`.
5. Open **Actions → Daily PR review to Google Chat → Run workflow** once to test it. It will add the `course-review-sent` label only after Google Chat has accepted the message.

## Notes

- GitHub Actions runs in the cloud, so your computer and Chrome do not need to be on.
- Scheduled GitHub workflows can start a few minutes late when GitHub is busy.
- To send a review for a PR again, remove its `course-review-sent` label and run the workflow manually.
