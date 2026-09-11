> ⚠️ **WARNING:**
> This code is published as-is for reference and educational purposes in the field of deepfake detection. It represents a historical implementation by TrueMedia.org and is not actively maintained. The repository does not accept pull requests, issues, modifications, or support requests. The original TrueMedia.org organization has ceased operations.

# TrueMedia.org

TrueMedia.org is a service that detects deepfakes in social media. The product allows critical election audiences from around the world to quickly and effectively detect deepfakes.

TrueMedia.org uses [a suite of deepfake detection tools](/apps/detect/app/api/starters#detection-models) for industry-leading accuracy. The TrueMedia.org machine learning team developed multiple in-house deepfake detection models for analyzing images, video, and audio. We combine the power of our in-house models with industry and academia to ensure more accurate results. By continuously tuning the ensemble, we achieved over 90% accuracy.

[![TrueMedia.org video](https://raw.githubusercontent.com/truemediaorg/.github/main/profile/video-splash.png)](https://www.youtube.com/watch?v=-6l7Jg02C8E)

## Website application

This repository contains the code for the website, a Next.js app deployed on Vercel. With the website, a user can add a social media post with an embedded video, audio, image. Or they can upload a file. Then they quickly receive aggregated results from the ensemble of AI detectors.

Learn more about how the analysis processing works at the deep-dive in this README: [TrueMedia.org Social Media Analysis](/apps/detect).

![Website example](/readme-assets/detect-truemedia-org.png)

The website is dependent on two services. The Scheduler service is contained inside this same repository as the web app, while the Media Resolution service is in a separate repository. Navigate to the documentation below to learn more on how to set up these required services.

- [Scheduler service](/apps/scheduler)
- [Media Resolution service](https://github.com/truemediaorg/media-resolver)

![TrueMedia.org data flow](/readme-assets/TrueMediaDataflow.jpg)

### Clerk

We require [Clerk](https://dashboard.clerk.com/) to manage users & authentication to the application. They have [fairly extensive documentation](https://clerk.com/docs) that should answer most questions you might have about how to use it.

Clerk is the source of truth for users and organizations. We also have a `users` table in our database that functions as a way to link rows in our database with users in Clerk. Each Clerk user has an `externalId` field referring to the identifier within our DB, and the session token includes this external ID so our app can find user history etc.

Organizations are fully managed by Clerk, so you need to query Clerk instead of the Prisma database to find orgs.

Read more about Clerk, users, and organizations in our [users and organizations docs](/apps/detect/app/internal/users).

### Internal tools

TrueMedia.org offers a suite of internal tools for evaluating and finetuning [the model ensemble,](/apps/detect#classification-framework) label data, and administrate the application. These tools are available as pages in the web app that are only accessible to users with internal or admin privileges. Read more about the [internal tools here.](/apps/detect/app/internal)

## Developer setup for the web app

### Initial setup

Prerequisites for successfully running the app:

- Search for string `OPEN-TODO` in the code, and you'll find a couple locations you need to update to link to your own s3 buckets and services. This requires to you establish the detection services you'll use, along with a storage location for thumbnail images.
- Set up your Next.js app in Vercel, along with the Prisma database described below.
- Set up Clerk.
- Ensure [Media Resolution service](https://github.com/truemediaorg/media-resolver) and [Scheduler service](/apps/scheduler) are running. Scheduler service is part of this repository, using the build process below.
- Search for `PLACEHOLDER` to find additional optional code that requires more setup.

### Running Locally

Dependencies should be installed using `npm`:

```bash
npm install
```

You need to create a `.env` file, which contains a variety of API keys and other configuration. See "env" section of turbo.json file to see which ENV variables are
used throughout the application. Not all are required, as it depends on which detectors
and monitoring services you desire to set up.

Now instruct Prisma to generate TypeScript files that represent the database schema with:

```bash
npx prisma generate
```

You will also need a Postgres database, see the "Database setup" section for more info.

With all that in place, you can run a local instance of the website like so:

```bash
npm run dev
```

The local website will be available at `http://localhost:3000/`.

### Database setup

You will likely want to run a local Postgres installation, though it is also possible to run a
Postgres instance in the cloud somewhere and point your local website at that.

Install postgres and create a local database named `mydatabase` owned by a local user named
`mylocaluser`, e.g.

```
brew install postgres@15
brew services start postgresql@15
createuser mylocaluser
createdb -O mylocaluser mydatabase
psql -U mylocaluser
```

If you do set up a local database, you can use the following `sync-db.sh` script (chmod 0700) to copy the contents of the production database to your local database:

```
#!/bin/sh

REMOTE_USER=default
REMOTE_DB=verceldb
REMOTE_HOST=PLACEHOLDER-HOSTNAME.postgres.vercel-storage.com

LOCAL_USER=mylocaluser
LOCAL_DB=mydatabase

echo "Downloading snapshot of prod database..."
pg_dump -U $REMOTE_USER -h $REMOTE_HOST -Fc --clean --if-exists $REMOTE_DB > prod.dump

echo "Replacing local database with prod data..."
pg_restore -U $LOCAL_USER -d $LOCAL_DB --no-owner --role=$LOCAL_USER -c prod.dump

rm prod.dump
```

This assumes your local database is named `mydatabase` and is owned by a local user named
`mylocaluser`.

You must also have a `~/.pgpass` file which contains the credentials for the production database
(and if your local user requires a password, credentials for it as well, though often local
Postgres installs do not require passwords). The `.pgpass` file should look like this (and should
be `chmod 0600`):

```
PLACEHOLDER-HOSTNAME.postgres.vercel-storage.com:0000:verceldb:default:PLACEHOLDER-PASSWORD
```

If you choose not to start with a synced copy of the production database, you can use Prisma to
start your database with a pristine set of tables based on the Prisma schema with:

```bash
npx prisma db push
```

### Database for Integration Tests

To setup a database for use by integration tests (which will be separate from your local development db), you can run:

```bash
createdb -O mylocaluser truemedia-integration-test
npm run db:integration-test
```

Then when running tests, set the `INTEGRATION` environment variable to `true`
to run the integration tests.

### Prisma

The database schema is managed with Prisma. The schema is in `prisma/schema.prisma`.

Prisma handles migrations to our database schema, so all schema migrations should be done within
the context of a Prisma managed migration. This will impact you in two ways:

### Updating your database when someone else added a migration

If someone else adds a schema migration, you will need to apply that migration to your local
database. If the migration has shipped, then the easiest way to do this is to just copy the
production database over your local database using the `sync-db.sh` script provided above, which give you both
the latest schema and the latest data. Simple!

However, if you don't want to do that for some reason, you can instead just tell Prisma to apply
any unapplied migrations to your database like so:

```
npx prisma db push
```

#### Adding a migration

When you want to make a schema migration, edit the `prisma/schema.prisma` to reflect the desired
changes and then run:

```
npx prisma migrate dev
```

which will compute the necessary schema changes based on the changes to `schema.prisma` and apply
them to your dev database. You will give a name to the migration, which will result in a directory
and migration SQL file being added to the `prisma/migrations` directory.

Once those migrations are committed and pushed to `main`, the next production build will apply the schema changes to the production database.

### Code formatting

We use `prettier` to keep our code clean and consistent.

There are pre-commit hooks to help format your code as you commit. Install them with:

```bash
npm run prepare
```

Install `prettier` as your default formatter in your IDE (eg VS Code).

### eslint

```bash
npm run lint
```

### Tests

```bash
npm run test
```

### CI

CI is run in github. To run it locally before you push your changes, use `npm run ci`

### Telemetry

#### Vercel Log routing

In order to have some centralized view and ability to alert on log lines, we try to
send things to AWS CloudWatch.

For Vercel, we have a Log Drain set up in Vercel that will forward logs to an AWS Lambda that just goes and relogs to CloudWatch.

#### CloudWatch Slack alerts

Slack alerts are posted to #eng-alarms and #eng-warnings

In order to have CloudWatch trigger alerts to slack, we set up a lambda in AWS that listens for SNS messages and sends a formatted message to slack.

In order to facilitate sending messages to slack, we've created a slack app that gets permission to post to our slack instance.
If you want to change the channel something goes to you need to create a new slack webhook here https://api.slack.com/apps/PLACEHOLDER-APP-ID/incoming-webhooks?success=1 , as each webhook is tied to a specific channel.

#### Sentry

We use Sentry for monitoring client javascript errors. Errors are posted to Slack in #client-alerts. To investigate an error, you'll need to sign in to Sentry.

## Licenses

This project is licensed under the terms of the MIT license.

## Original Contributors

The TrueMedia.org web application was built initially by [Michael Bayne](https://github.com/samskivert), and developed in collaboration with [Alex Schokking](https://github.com/aschokking), [Dawn Wright](https://github.com/DawnWright), [Michael Langan](https://github.com/mjlangan), [Paul Carduner](https://github.com/pcardune), and [Steve Geluso](https://github.com/geluso).
