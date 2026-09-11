# TrueMedia.org Social Media Analysis

TrueMedia.org provides a system for combating misinformation, by analyzing social media to detect potential manipulated content across different media types (images, videos, and audio). The system aggregates [multiple models](/apps/detect/app/api/starters#detection-models) to evaluate content and determine the overall likelihood of manipulation.

## Classification Framework

The system uses a classification framework that provides an overall "TrueMedia.org verdict" indicating whether the social media item was manipulated. This is based on a weighted ensemble approach. We use a voting system that aggregates the results (a.k.a. ranks) of multiple analysis models in our ensemble.

### Model Rank

The analysis score for each "manipulation model" is mapped to a `rank`. This is done by classifying its score (0-1) into the following `rank` buckets:

| Model Rank  | Display Name         | Score Range                          | Description                                                                                                                                             |
| ----------- | -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `high`      | Substantial Evidence | `fakeScore < score ≤ 1.0`            | Model found substantial evidence of manipulation.                                                                                                       |
| `uncertain` | Uncertain            | `uncertainScore < score ≤ fakeScore` | Model did not find enough evidence for high confidence.                                                                                                 |
| `low`       | Little Evidence      | `0 ≤ score ≤ uncertainScore`         | Model found little evidence of manipulation.                                                                                                            |
| `n/a`       | Not Applicable       | N/A                                  | Model unable to analyze the media. For example, a model that only performs analysis on media that contains faces returns `n/a` when there are no faces. |

Default confidence thresholds: `fakeScore = 0.5`, `uncertainScore = 0.33`. These thresholds are optimized per model and may differ.

### TrueMedia.org Verdict

Our model ensemble is evaluated collectively to determine an overall TrueMedia.org verdict. The final verdict for a media item is one of the following `verdict` values:

| Overall Verdict | Display Name         | Vote Count | Conditions                                                                                                                                                                                     |
| --------------- | -------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `high`          | Substantial Evidence | ≥2 votes   | Verdict when at least two votes indicate this media item has strong evidence of manipulation. Demoted to `uncertain` if <3 votes AND the item is deemed [Experimental](#experimental-verdict). |
| `uncertain`     | Uncertain            | 1 vote     | Verdict when only one model indicates strong evidence of manipulation.                                                                                                                         |
| `low`           | Little Evidence      | 0 votes    | Verdict when no models reach `high` rank threshold.                                                                                                                                            |

Each model with `rank=high` is given one vote toward the TrueMedia.org `verdict`. Some trusted models are granted two votes in the system, where they alone can yield a `high` TrueMedia.org verdict (see [Model Policies](#model-policies) below).

Note, there is additional logic that highly optimizes the verdict in additional specific cases described in code. See /apps/detect/app/data/verdict.ts

### Model Policies

Models can be configured with different policies that determine how they contribute to the final verdict:

- `include`: Model gets a standard single vote.
- `trust`: Model gets weighted with two votes.
- `ignore`: Model is excluded from aggregation and its analysis is not shown to users.

### Experimental Verdict

TrueMedia.org's model ensemble is tuned for political social media content. As a result, inference performance is not as strong with other types of content, and thus showing the verdict on such content can be misleading.

To mitigate this, we apply an "Experimental" label in the UI to media that fall outside our focus. Any of the following is deemed experimental:

Images:

- 0 faces detected
- ≥5 faces detected
- the image is overlaid by >20% text
- artwork detected

Videos:

- 0 faces detected

The system employs special "relevance models" used to detect faces, text, and artwork.

When something is experimental, it receives a verdict of `uncertain` whenever it has fewer than 3 fake votes from the model ensemble.

### Human Verification

We have a system where human data analysts review media items and verify the verdict. Analysts label "ground truth" on the media they've verified as fake or real. They leave unknown items unlabeled.

A human label of real or fake overrides any verdict determined from the model voting policies above.

Human verification may trigger emails sent to users notifying users the ground
truth for an media has been updated. Read more about [GroundTruthUpdate Notifications](./app/api/media-metadata/README.md)

### Trusted Sources

Media that comes from trusted social media sources are automatically given a verdict of `low`, which overrides the verdict determined from the model voting policies. However, a human verdict of fake overrides a trusted source.

## Model Cards

Each manipulation model is configured with `ManipulationModelInfo`, containing metadata describing it.

### Name and Description

A model is given a name and description that is shown in a "card" in the analysis page (`/media/analysis`)

### Manipulation Categories

Each model may be evaluating one of the following categories of manipulation. The categories are used to sort the cards into distinct sections in the UI:

- **Faces**: Detection of facial manipulation or generation
- **Generative AI**: Detects signatures of GenAI tools
- **Visual Noise**: Analysis of pixel and color variations
- **Voices**: Detection of voice cloning or generation
- **Semantic**: Analysis of semantic inconsistencies
- **Other**: Other AI analyses

## Analysis Processing System

Analysis is performed with scores determined for each model by calling [a suite of detection services](/apps/detect/app/api/starters#detection-models). We employ both 3rd party APIs, along with TrueMedia.org's own highly optimized internal models.

These ML models can take some time to run inference, especially for large files like videos. Therefore, some models are asynchronous and some synchronous, and our system supports both.

The system includes:

- **Processors**: Used to kick off API processing, also known as `Starters` in the system. `Processors` have adapters that check API inference results and convert responses into one or more standardized internal data models.
- **Models**: Configuration info and metadata for each model. See `ModelInfo`, which supports both "manipulation models" and the "relevance models" needed for experimental labeling.
- `AnalysisResult`: The state of processing (UPLOADING, PROCESSING, COMPLETE, ERROR), including the raw JSON from the API response upon completion. This is stored in the database.
- `ModelResult`: The standardized representation of the model result, including score, rank classification, processing duration, and optional metadata. This is a direct mapping from an `AnalysisResult` and is cached in the database rather than recomputed at runtime.

### Processor Availability States

Processors can be in one of three availability states:

- `enabled`: The processor is active and processing user queries. The results may or may not be visible to users, depending on its [models' policies](#model-policies).
- `disabled`: The processor is inactive, but previous results remain visible in internal evaluation UI. Disabled processors can be manually kicked off on the Analysis Reruns (/internal/reruns) page. This state is typically used for new models under testing.
- `archived`: The processor is inactive and hidden from the UI. This state is typically used when we're no longer using the associated models.

### Analysis Flow

1. **Media Resolution**: A social media URL is resolved to a media item using a `resolve-url` job in the [Scheduler service](/apps/scheduler). This calls [our `mediares` service](https://github.com/truemediaorg/media-resolver) to perform resolution.
1. **Start Analysis**: After the social media URL resolution is complete, analysis is requested to start. Analysis requests are queued in the [Scheduler](/apps/scheduler) as `start-analysis` jobs.
1. **Processors Start**: When a media item's `start-analysis` job is processed, it kicks off a `Starter` for each type of processor that matches the media item, with a job ID corresponding to the processor type (e.g. `hive`, `dftotal`, `genconvit`, etc). Note, some processors do not use the Scheduler since the 3rd party already handles scheduling, so we kick those off immediately.
1. **Check Analyses**: A `check-results` job is also queued at this point. This is used to periodically check the completion status of the processors. Results are tracked as `AnalysisResult` in the database as they progress from UPLOADING, to PROCESSING, to either COMPLETE or ERROR. Completed responses are stored as raw JSON in the `AnalysisResult`.
1. **Adapt Results and Cache**: When COMPLETE, processors adapt the external API JSON response into standardized internal `ModelResult` formats that are cached in the database. These can be retrieved via the `/api/check-analysis` endpoint (or `/api/get-results` internally).

### Scheduler Priorities

Each job type in the Scheduler is in a separate queue, where items are processed in order from each queue. Priority levels are assigned as follows:

- **Live**: Live messages coming from UI users in the platform are processed first within a given queue.
- **Batch**: Batch messages coming from users' API requests or batch uploads are processed after live messages.
- **Low**: Low priority messages are processed last. These come from internal reruns kicked off on the Analysis Reruns page (/internal/reruns).

## Adding New Models

To add new models, see [Detection Models](/apps/detect/app/api/starters#detection-models) for instructions.
