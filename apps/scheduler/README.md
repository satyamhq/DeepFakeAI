# Scheduler Service

## Running the Scheduler

The easiest way to run the scheduler is using `turbo dev`:

```bash
npx turbo dev --filter=@truemedia/scheduler
```

You can confirm that the scheduler is running by visiting [http://localhost:3005/scheduler/hello](http://localhost:3005/scheduler/hello).

## Building the Docker Image

From the repository root, run:

```bash
docker build -f apps/scheduler/Dockerfile -t truemedia/scheduler .
```

## Running the Scheduler Locally in Docker

After building the docker image, you can run it with docker run. Note that you'll
want to override the POSTGRES_PRISMA_URL and WEBAPP_TRPC_URL environment variables
to point to the host machine and not localhost.

```bash
docker run \
  --env-file .env \
  --env POSTGRES_PRISMA_URL=postgres://mylocaluser:deepfake@host.docker.internal/mydatabase \
  --env WEBAPP_TRPC_URL=http://host.docker.internal:3000/api/trpc \
  -p 3005:80 --pid=host -it truemedia/scheduler
```

## Deploying to AWS

To deploy a docker image to AWS, you'll need to make sure it's built
for amd64 (and not arm64 as is the default on m-series macs). Then push
the image to our private container registry in ECR:

```bash
docker buildx build --platform linux/amd64 -f apps/scheduler/Dockerfile -t truemedia/scheduler .
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin PLACEHOLDER.dkr.ecr.us-east-2.amazonaws.com
docker tag truemedia/scheduler:latest PLACEHOLDER.dkr.ecr.us-east-2.amazonaws.com/truemedia/scheduler:latest
docker push PLACEHOLDER.dkr.ecr.us-east-2.amazonaws.com/truemedia/scheduler:latest
```

Then go to ECS and click "Force new deployment" and then "Update" to deploy the new image.

## Testing the Scheduler End-to-End

### Local Testing

To test the scheduler end-to-end locally, you need to have the following environment variables defined in .env

```bash
SCHEDULER_URL=http://localhost:3005
SCHEDULER_SHARED_AUTH_SECRET=whateveryouwant
```

Then you can run end-to-end tests with:

```bash
npx tsx apps/scheduler/end-to-end-test.ts 30
```

### Production Testing

To test the scheduler running in production with your locally running nextjs
app, you need to run [ngrok](https://ngrok.com/) to expose your nextjs app to the internet:

```bash
ngrok http 3000
```

Then you need to set the following environment variables defined in .env

```bash
SCHEDULER_TRPC_CALLBACK_URL=https://<the domain that ngrok gave you>/api/trpc
SCHEDULER_URL=PLACEHOLDER/scheduler
SCHEDULER_SHARED_AUTH_SECRET=<the production shared auth secret>
```

Keep in mind that that any messages sent to the production scheduler will be run alongside production traffic, so try not to spam it with a bunch of work.

## Monitoring

### CloudWatch Logs

Scheduler logs are sent to CloudWatch.

A typical log message looks like this:

```json
{
  "level": 30,
  "time": 1732569717537,
  "pid": 1,
  "hostname": "ip-0-0-0-0.us-east-2.compute.internal",
  "service": "QueueService",
  "service": "ParallelizedQueueConsumer",
  "queueName": "start-analysis",
  "messageId": "cm3xj9twt3lesli637dki3xg7",
  "attempt": 1,
  "priority": 5,
  "event": "process-message/detect-app",
  "msg": "Processing message via detect app"
}
```

The `event` field is the most important field to look at. It tells you what the scheduler is doing at that moment. Other fields provide additional metadata about the event.

The `msg` field is a human-readable message that provides more context about the event.

Because we log json objects, you can use the CloudWatch Logs Insights query editor to filter and search for specific log messages. For example, to find the last 20 logs that have the `event` field set to `process-message/failed`, you can run the following query:

```
fields @timestamp, event, msg
| filter event = "process-message/failed" and queueName = "start-analysis"
| sort @timestamp desc
| limit 20
```

The cloudwatch UI has a handy AI powered query generator that makes it easier to write queries if you're not familiar with the query language.

### Grafana Dashboard

The scheduler has a Grafana dashboard that provides a high-level overview of the scheduler's performance.

The grafana dashboard has three categories of information:

- **Throughput**: How many messages are being processed by the scheduler over a window of time.
  If traffic is low, then throughput will be low because the scheduler is not processing many messages.
  On the flip side, if traffic is high, then throughput should increase up to the point where the scheduler is processing messages as fast as it is configured to do so.

- **Latency**: How long it takes for the scheduler to process a single message.
  There are multiple graphs. Some show latency including time spent in the queue,
  and others showing latency to handle a single message once it has been dequeued.

  - "Latency to start processing" shows the time it takes for a message to be picked up by the scheduler after it has been enqueued. When this goes up, it means that the scheduler is not processing messages as fast as they are being enqueued.

  - "Latency to process a single message" shows the time it takes for the scheduler to process a single message once it has been dequeued. When this changes, it means that some downstream
    service has slowed down or is being flaky and trigerring retries.

- **Status**: These graphs show the state of all messsages in the queue changing over time.
  Messages can be in one of 4 states:

  - `PENDING`: The message has been enqueued but has not been picked up by the scheduler yet.
  - `PROCESSING`: The message is currently being processed by the scheduler. In the event of a failure,
    the message will remain in this state while it is being retried.
  - `COMPLETED`: The message has been successfully processed by the scheduler. In theory this
    number should only ever go up, but the scheduler deletes completed messages after a while
    (24 hours) so you'll see this number fluctuate.
  - `FAILED`: The message has failed to be processed by the scheduler. This can happen for a variety
    of reasons, such as a downstream service being down or the message being malformed.
    Messages in this state have to be manually retried or deleted.

- **Errors**: Finally, there is table of recent errors that the scheduler has encountered.
  This is useful for a quick glance, but you'll likely end up using cloudwatch to dig
  deeper.

Each of these dashboards correspond to a cloudwatch query which you can see by clicking
the triple dot menu in the upper right of a particular graph and then "Edit".

### /internal/scheduler

You can also use the /internal/scheduler page
to get more info about what's happening in production. From here you can retry
failed messages and see the current state of each queue. This information is
fetched directly from the scheduler when you load the page and does not rely
on logging.

At the bottom you'll see a "Scheduler Stats" section, which goes int great detail
about each individual async loop that the scheduler is running. If it seems like
the scheduler isn't processing messages, it's possible that one of these loops
has erroneously stopped due to a bug. This really shouldn't happen, but the info
is there in case it does. Note that it's normal for consumers to have
`numRunningLoops` of 0 from time to time, as each consumer will "sleep" when the
queue is empty or currently waiting for a rate limit to expire.

### Vercel Logs

While the scheduler doesn't run in vercel, all the jobs that the scheduler triggers
do run on vercel, so when something is going wrong with one of the jobs, you can
look at the vercel logs to see what's going on. In particular, looking at
log messages filtered by function:/api/trpc/[trpc]
will show you everything happening in one of these jobs.

Unfortunately, vercel doesn't provide the same queryability as cloudwatch, and
the log sink doesn't encode messages as json, so it's a lot harder to filter
these messages.
