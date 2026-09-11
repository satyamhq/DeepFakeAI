# GroundTruthUpdate Notifications

There's a notification system that will notify users if human verification
changes the ground truth on the media after analysis.

![Sample Ground Truth Update Email](/readme-assets/ground_truth_update_email.png)

Each time a human analyst sets the ground truth on a media the system checks to
see if ground truth changed the overall verdict of the media. If the verdict
changes then a notification is queued to be sent to each user who queried the
media. We call these GroundTruthUpdate notifications. Users receive emails with
the subject "Human fact checkers changed the verdict."

- The `/api/media-metadata` route updates the ground truth on a media.
- The `/api/media-metadata` route compares the old verdict to the new verdict.
- If the new verdict does not match the old verdict a notification to users is enqueued.
- A database entry is created called `GroundTruthUpdate` storing the `mediaId`,
  the `oldSummary` and the `newSummary`.
- A cron job polls an endpoint `/api/media-metadata/poll-human-verifications` once every minute.
- After a `GroundTruthUpdate` entity has been polled five times (to simulate a five-minute delay)
  then the route runs a function called `resolveUpdates` which compares the
  first and last `GroundTruthUpdate` entities for each media ID to see if there
  is ultimately a change in the verdict.
- If the verdict ultimately changes after the five minute delay an email is sent
  to each user who has queried the media. The user receives an email saying "Human
  fact checkers changed the verdict." The email shows the previous verdict and the
  current verdict. Users can click through the email to see the analysis in the
  app.

Why aren't the emails fired as soon as a ground truth is set? The cron job and
the five minute delay allow for human error during human verification. Five
minutes is enough time to allow a human fact checker to set a ground truth, and
undo, or set another ground truth, before the emails are fired. If the emails
were sent instantly then users could receive incorrect verdict updates each time
a human verifier mis-clicked a menu item while they were trying to set a ground
truth.

The cron job for GroundTruthUpdates is defined in `vercel.json`:

```
{
  crons: [
    {
      "path": "/api/media-metadata/poll-human-verifications",
      "schedule": "* * * * *"
    }
  ]
}
```

The cron job flushes each `GroundTruthUpdate` entity for each media ID after
fives minutes (or, being polled five times) whether the email was set or not.

## Testing Cron Jobs Manually Locally

Vercel does not fire cron jobs locally in dev. In order to test the `poll-human-verifications`
cron job endpoint you must trigger it manually. Follow these steps:

- Make a query.
- Wait for analysis to complete to establish an initial verdict.
- Add metadata changing the verdict of the initial analysis.
- Verify you see logs appear creating GroundTruthUpdate.
- Make a manual HTTP request to the endpoint `GET http://localhost:3000/api/media-metadata/poll-human-verifications`
- Observe the list of pending `GroundTruthUpdate` notifications.
- Make manual HTTP requests to the endpoint again until the event fires
- Observe local server logs to see the notification queue clear
- Observe local server logs emails being sent (emails aren't actually sent in local).

**GroundTruthUpdate created server logs:**

```txt
@truemedia/detect:dev: Updating metadata [user=steve@truemedia.org, media=aG490H7MvAvnneUaA2AnFEjxSx4.jpg, update={"fake":"FALSE","fakeReviewer":"steve@truemedia.org"}]
@truemedia/detect:dev: GroundTruthUpdate humanFactCheckersNotification [isChanged=true, mediaId=aG490H7MvAvnneUaA2AnFEjxSx4.jpg, oldSummary=Substantial Evidence of Manipulation, newSummary=Little Evidence of Manipulation, isEnabled=true]
```

**Manual curl HTTP request:**

```bash
curl http://localhost:3000/api/media-metadata/poll-human-verifications | jq
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   244    0   244    0     0  10834      0 --:--:-- --:--:-- --:--:-- 11090
```

**HTTP JSON Response:**

```json
{
  "pending": [
    {
      "id": "cm51gs7ht0003drc7zej7si9u",
      "mediaId": "aG490H7MvAvnneUaA2AnFEjxSx4.jpg",
      "oldSummary": "Little Evidence of Manipulation",
      "newSummary": "Substantial Evidence of Manipulation",
      "pollCount": 0,
      "createdAt": "2024-12-23T20:02:57.905Z"
    }
  ]
}
```

**Server Logs:**

```
@truemedia/detect:dev: GroundTruthUpdate poll-human-verification
@truemedia/detect:dev: [count=1, old=Little Evidence of Manipulation, new=Substantial Evidence of Manipulation, id=aG490H7MvAvnneUaA2AnFEjxSx4.jpg]
@truemedia/detect:dev:  GET /api/media-metadata/poll-human-verifications 200 in 15ms

@truemedia/detect:dev: GroundTruthUpdate poll-human-verification
@truemedia/detect:dev: [count=2, old=Little Evidence of Manipulation, new=Substantial Evidence of Manipulation, id=aG490H7MvAvnneUaA2AnFEjxSx4.jpg]
@truemedia/detect:dev:  GET /api/media-metadata/poll-human-verifications 200 in 18ms

@truemedia/detect:dev: GroundTruthUpdate poll-human-verification
@truemedia/detect:dev: [count=3, old=Little Evidence of Manipulation, new=Substantial Evidence of Manipulation, id=aG490H7MvAvnneUaA2AnFEjxSx4.jpg]
@truemedia/detect:dev:  GET /api/media-metadata/poll-human-verifications 200 in 19ms

@truemedia/detect:dev: GroundTruthUpdate poll-human-verification
@truemedia/detect:dev: [count=4, old=Little Evidence of Manipulation, new=Substantial Evidence of Manipulation, id=aG490H7MvAvnneUaA2AnFEjxSx4.jpg]
@truemedia/detect:dev:  GET /api/media-metadata/poll-human-verifications 200 in 16ms

@truemedia/detect:dev: GroundTruthUpdate poll-human-verification
@truemedia/detect:dev: [count=5, old=Little Evidence of Manipulation, new=Substantial Evidence of Manipulation, id=aG490H7MvAvnneUaA2AnFEjxSx4.jpg]
@truemedia/detect:dev:  GET /api/media-metadata/poll-human-verifications 200 in 15ms

@truemedia/detect:dev: GroundTruthUpdate poll-human-verification
@truemedia/detect:dev: [count=6, old=Little Evidence of Manipulation, new=Substantial Evidence of Manipulation, id=aG490H7MvAvnneUaA2AnFEjxSx4.jpg]
@truemedia/detect:dev: GroundTruthUpdate [newSummary=Substantial Evidence of Manipulation, notifications=1]
@truemedia/detect:dev: GroundTruthUpdate resolveUpdates clearing queue [mediaId=aG490H7MvAvnneUaA2AnFEjxSx4.jpg, deletedCount=1]
@truemedia/detect:dev:  GET /api/media-metadata/poll-human-verifications 200 in 52ms
@truemedia/detect:dev: Sent email [email=steve@truemedia.org, subject=Human fact checkers changed the verdict]
@truemedia/detect:dev: {
@truemedia/detect:dev:   ErrorCode: 0,
@truemedia/detect:dev:   Message: 'OK',
@truemedia/detect:dev:   MessageID: '767c43f0-c2a7-46c6-b3f6-e236f0b44de4',
@truemedia/detect:dev:   SubmittedAt: '2024-12-23T20:03:19.8129751Z',
@truemedia/detect:dev:   To: 'steve@truemedia.org'
@truemedia/detect:dev: }
```
