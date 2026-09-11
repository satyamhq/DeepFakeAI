# Detection Models

TrueMedia.org employs an ensemble of in-house and 3rd party detection models, for the analysis processing system described in [/apps/detect README](/apps/detect#analysis-processing-system)

## In-house Models

We built several in-house models, which are open sourced and documented in separate repositories. You'll find code here [./truemedia.ts](./truemedia.ts) for calling these services, if you choose to set them up.

### Image

- `ufd`
- `reverse-search`
- `dire`

### Video

- `genconvit`
- `ftcn`
- `styleflow`

### Audio

- `transcript`: found in this directory at [./openai.ts](./openai.ts)

## 3rd Party Models

We employ the following 3rd party models in our ensemble. We also experimented with a number of additional 3rd party models not mentioned here—there are many models under development and research.

These models require paid subscriptions, so you'll need to obtain an API key from each company to use them.

### Image

- [AI or Not](https://www.aiornot.com/) image
- [Deepfake Total](https://deepfake-total.com/), by Fraunhofer
- [Hive](https://thehive.ai/) image
- [Reality Defender](https://www.realitydefender.com/) image
- [Sensity](https://sensity.ai/) image

### Video

- [Hive](https://thehive.ai/) video
- [Reality Defender](https://www.realitydefender.com/) video
- [Sensity](https://sensity.ai/) video

### Audio

- [AI or Not](https://www.aiornot.com/) audio
- [Hive](https://thehive.ai/) audio
- [Hiya](https://www.hiya.com) audio (formerly Loccus.ai)
- [Pindrop](https://www.pindrop.com/)
- [Reality Defender](https://www.realitydefender.com/) audio
- [Sensity](https://sensity.ai/) audio

## Adding New Detection Models

To add a new model, mimic the code from the existing models found here in `/starters` along with `/model-processors`.

### Create a processor, aka starter

Create a starter to kick off the analysis for the processor, in directory `/starters`. This is the code that calls the detection endpoint, checks it for completion, and writes to the database.

Define the processor's interface in directory `/model-processors`

Implement the required adapter methods on the `Processor` to interpret the API response.

### Create one or more models

A single processor yields one or more "model" results. These are typically a 1-to-1 relationship, where there's one model for every processor. But some processors produce results for more than one model. For example, calling one Reality Defender endpoint gives results for several models.

Configure the `ModelInfo` including thresholds and policies, in directory `/model-processors`. Refer to [our docs](/apps/detect) for info about these properties.
