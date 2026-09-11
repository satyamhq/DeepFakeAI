# Internal Tools

TrueMedia.org has developed a suite of internal tools that the internal team uses to evaluate and finetune [our model ensemble,](/apps/detect#classification-framework) label data, and administrate the application. These tools are available as pages in the app that are only accessible to users with internal or admin privileges.

- [Product Usage](#product-usage)
  - [Queries by Time](#queries-by-time)
  - [Queries by User](#queries-by-user)
  - [Top Queries](#top-queries)
- [Media Cataloging and Labeling](#media-cataloging-and-labeling)
  - [Media](#media)
  - [Data Catalog](#data-catalog)
  - [Media Metadata](#media-metadata)
- [Model Analysis](#model-analysis)
  - [Eval](#eval)
  - [Eval Over Time](#eval-over-time)
  - [Models](#models)
  - [Analysis Reruns](#analysis-reruns)
- [Administration Tools](#administration-tools)
  - [Users](#users)
  - [Organizations](#organizations)
  - [Clerk Administration](#clerk-administration)
  - [API Keys](#api-keys)
  - [Verified Sources](#verified-sources)
  - [Notable Media](#notable-media)
- [Developer Tools](#developer-tools)
  - [Scheduler](#scheduler)
  - [Throttles](#throttles)
  - [Trigger Org Webhook](#trigger-org-webhook)

## Product Usage

### Queries by Time

/internal/queries

This table shows all queries for all time made by our users. You can see who performed the query, and jump to the analysis.

There is an eye icon next to the analysis, with or without a slash through it, indicating whether the item has been reviewed by a human data analyst. The data analyst team reviews this table regularly to see at a glance which items still need human review.

### Queries by User

/internal/usage

This is another way to view all queries for all time in the system. In this view, the queries are grouped by user, with the most recent at the top.

There is an eye icon on this page, as well, which works just like the [Queries by Time](#queries-by-time) page.

### Top Queries

/internal/top-queries

This page shows the social media posts that have been queried most frequently in the past 30 days.

Note, there is also an internal endpoint `/api/watch-trending-queries/` used to send Slack notifications for top queries.

## Media Cataloging and Labeling

### Media

/internal/media

Here you can search all media stored in the database. The page supports searching text fields, by specific media type, date range, ground truth values, and other filters.

Internal keywords are used extensively to label media items, and you can use this page to search for items with a specific keyword.

You can also delete a piece of media from this page.

### Data Catalog

/internal/datasets

TrueMedia.org uses a number of data sets for evaluation, training, and other purposes such as segmenting data by customer. A data set is a collection of media that contain specific keywords. You can view and create datasets on the Data Catalog page.

The `eval` data set is the largest one, containing most of our data obtained from "in the wild," and it is used by default on the [Eval page](#eval) for evaluating our models. Any other data set can be swapped into the Eval page to evaluate instead.

### Media Metadata

/internal/metadata

Here you can see the most frequently used keywords and sources stored in the internal metadata of media items. The page displays all Keywords in the system, sorted by frequency. And Sources are similarly listed with the most frequent first.

## Model Analysis

### Eval

/internal/eval

This is our most important internal tool. It's the page used by TrueMedia.org's Machine Learning and Engineering teams to constantly analyze and tune the performance of our model ensemble.

Here you can find statistics about the performance of the overall TrueMedia.org ensemble on specific media data sets, along with statistics about how the individual models are performing. Statistics include F1, Precision, Accuracy, and Recall scores, along with the rates of False Positives (FN), False Negatives (FN). To learn the details of these statistics, hover over the column titles to see tooltip info. Or refer to /apps/detect/app/internal/metrics.ts

Model performance is evaluated based on the Ground Truth [labels assigned by human verifiers](/apps/detect#human-verification). **Therefore, the numbers you see on this page only includes media where we know the ground truth.** Unlabeled items do not impact the evaluation of our models. This is why we attempt to label all incoming items.

#### Data Set Filters

At the top of the page, you'll find filters for choosing the data set that you want to evaluate. The default Data Catalog assigned is called `eval`. You can choose a different data catalog, or you can filter the current catalog further.

Filters include date, social media source, and keywords. The filter syntax for keywords is powerful—click on the `?` icon to learn the syntax.

#### Models

The first three tabs evaluate how the individual models in the ensemble are performing. The three tabs correspond to the three media types we support: video, image, and audio.

Here, you'll find performance statistics for each model. The top **Download CSV** button will download that table.

##### Video models

The **Video models** tab summarizes performance across all videos where Ground Truth is labeled on the video track only. These models evaluate video, not audio, content.

##### Image models

The **Image models** tab summarizes performance across all images where Ground Truth is labeled.

##### Audio models

The **Audio models** tab summarizes performance across all audio media. You can choose whether you want to evaluate only audio tracks from video media, only standalone audio tracks, or both.

##### Media details

At the bottom, you'll find a collapsed table showing all of the media included in the current tab's evaluation. The **Download CSV** button here downloads that media table.

#### Media

The last three tabs evaluate the overall ensemble's performance on the set of media you've chosen. Again, the three tabs correspond to the three media types we support: video, image, and audio.

##### Model vote policy configuration

The **Model vote policies** table shows the current configuration of models used in the ensemble. Learn about [Model Policies here](/apps/detect#model-policies).

You can test the effect of changing policies by clicking the radio buttons. These changes don't affect other users, only your own view. To make a policy change take effect for everyone, the Engineering team needs to change the policy default in the code.

##### Vote-based aggregation

Each media tab includes performance statistics for the overall ensemble, using the vote-based aggregation strategy [described here](/apps/detect#truemediaorg-verdict).

Note, there is an **Ensemble model aggregation** table on the right side that was evaluated as an alternative to the vote-based aggregation. This is not currently used in production.

##### Video media

The **Video media** tab shows the ensemble's performance across all videos where Ground Truth is labeled on _either_ the video or audio tracks. Because the overall verdict for a video comes from the ensemble of both video and audio models, they are listed together on this tab.

Therefore, the count of videos evaluated on this tab may be higher than the count used in the **Video models** tab. Videos where Ground Truth is only known on the audio track would not be included on the **Video models** tab, whereas they appear on the **Video media** tab.

##### Image media

The **Image media** tab shows the ensemble's performance across all images where Ground Truth is labeled.

##### Audio media

The **Audio media** tab shows the ensemble's performance across all audio where Ground Truth is labeled. You can choose whether you want to evaluate only audio tracks from video media, only standalone audio tracks, or both.

##### Media details

Like the models tabs, you can find details about the media included in the evaluation in a collapsed section at the bottom. The **Download CSV** button will download that table.

### Eval Over Time

/internal/media/notable

Here you can find a week-by-week breakdown of our model performance over time, using the statistics from the [Eval page](#eval).

Just like the [Eval page](#eval), the numbers here only include media items where Ground Truth is known.

### Models

/internal/model

You can select any model on this page and see the distribution of scores and processing time for this model. This can be used to debug performance for the model.

You can see a list of items where the endpoint returned errors, which help with debugging issues with the model.

### Analysis Reruns

/internal/reruns

While a model is in development, it may change the way it scores media. Therefore, you might find need to re-run that model to assign new scores to a media set. Or, you can use this page to run a disabled model, which isn't run by default on user queries.

Choose the model and the filter criteria you'd like to apply. A good choice is often to filter to the same set of data used on the Eval page—just match the keywords and date range.

Note that this is a very performance intensive page (CPU and memory), so it's not a good idea to run this on all data. Choose a reasonable subset. Media with Unknown Ground Truth is excluded by default because these items don't affect the Eval statistics.

## Administration Tools

See more on [Users and Organizations in a separate README](/apps/detect/app/internal/users#users-and-organizations).

### Users

/internal/users

This page lists all users in the system. While this information is also available in Clerk, the table here supplements with one key addition: a way to view the history of queries that each user made.

The table also shows both unique identifiers for the user: The one from Clerk, and the one from our own database.

Also on this page is a way to send an invitation to a user. While Clerk provides a way to invite users to an organization, you can use this UI to invite someone to create an account without an org. Because users can freely sign up for accounts, this functionality is rarely needed.

### Organizations

/internal/orgs

This page lists all organizations in the system. Similar to the users table, this page provides a way to view the history of queries that each organization made.

You can also view the model ensemble performance specifically for this organization, including false positives, precision, recall, and F1 scores.

### Clerk Administration

https://dashboard.clerk.com/

Both of the above TrueMedia.org pages provide an entry point to [the Clerk dashboard](https://dashboard.clerk.com/), where most user and organization administration tasks are performed.

The Clerk dashboard provides usage analytics, including active users, sign-ins, and sign-ups over time.

Tools for administering users include creating and deleting users, banning and locking users, and updating metadata about users such as name and email.

Tools for administering organizations include permissions, and updating metadata about the organization.

Note, organization domains cannot be managed from the Clerk dashboard. You must be a member of the organization and use Organization Settings inside the application to administer domains. It’s recommended that their admin user perform this action themself to verify their own domain.

Clerk also has tools for configuring the Clerk application and default roles and permissions for users and organizations. Included are tools for blocking accounts and domains automatically, and bot protection for sign-ups.

### API Keys

/internal/api-keys

This page is used to issue and revoke API keys for anyone using the TrueMedia.org API. For now, users cannot do this themselves, and an internal employee needs to issue an API key. Once a key has been issued, the customer will obtain access to API documentation and their API key at `/docs/api` when they log into the app.

### Verified Sources

/internal/verified-sources

This is the admin page for establishing a [Trusted Source](/apps/detect#trusted-sources). Any media that comes from these sources are automatically given a verdict of `low` ([see more here](/apps/detect#trusted-sources)).

Note that Trusted (or Verified) Sources can also be established at the bottom of every media analysis page.

### Notable Media

/internal/media/notable

This is the admin page for updating Notable Deepfakes in the app. Notable Deepfakes are shown to customers in the app on this page: /media/notable

Note that the Webflow marketing site uses a separate process for updating notable deepfakes.

## Developer Tools

### Scheduler

/internal/scheduler

Media analysis is performed by adding work to a Scheduler queue and processing that work in order (details here: /internal/trigger-org-member-created). The Scheduler service handles this.

The Scheduler page is used to configure the rate at which work is processed, how many times it can retry when there are errors, and for how long a message should be leased. Configuration changes immediately take effect in the Scheduler and do not require a re-deploy of the service.

You can also view the status of each queue. Clicking on the Status will show you detailed message information and provides a way to delete failed messages.

More about the Scheduler is found in [its README here](/apps/scheduler).

### Throttles

/internal/throttle

The app has throttling thresholds in place that prevent excessive use. This page shows whether throttling occurred for each hour.

You can also configure specific users to not be subject to throttling. This is only used in rare cases.

### Trigger Org Webhook

/internal/trigger-org-member-created

This page can be used by Engineers to trigger the `/api/org-member-created` webhook from a local dev environment.
