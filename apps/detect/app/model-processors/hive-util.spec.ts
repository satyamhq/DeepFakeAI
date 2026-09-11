import { HiveApiResponse } from "./hive"
import { pickHighestScoringOutputs, pruneToHighestScoringOutput } from "./hive-util"

const input = {
  id: "d552ba10-a157-11ef-8bc5-5923d06fd4cc",
  charge: 0.0004900000000000001,
  model_version: 1,
  model: "AI art and deepfake detection",
  media: {
    url: null,
    filename: null,
    type: "VIDEO",
    mime_type: "mp4",
    mimetype: "video/mp4",
    width: 720,
    height: 720,
    num_frames: 49,
    duration: 48.9813346862793,
  },
  created_on: "2024-11-13T00:40:08.497Z",
  model_type: "CATEGORIZATION",
  user_id: 5344,
  project_id: 1108983312,
}

it("pruneToHighestScoringOutput() should return a response with more than one output", () => {
  const response: HiveApiResponse = {
    id: "d552ba10-a157-11ef-8bc5-5923d06fd4cc",
    project_id: 1108983312,
    from_cache: false,
    status: [
      {
        status: {
          code: "0",
          message: "SUCCESS",
        },
        response: {
          output: [
            {
              time: 0,
              classes: [
                {
                  score: 0.9754423574584636,
                  class: "not_ai_generated",
                },
                {
                  score: 0.024557642541536407,
                  class: "ai_generated",
                },
                {
                  score: 0.5,
                  class: "deepfake",
                },
              ],
            },
            {
              time: 1,
              classes: [
                {
                  score: 0.9255106639295844,
                  class: "not_ai_generated",
                },
                {
                  score: 0.07448933607041569,
                  class: "ai_generated",
                },
                {
                  score: 0,
                  class: "deepfake",
                },
              ],
            },
          ],
          input,
        },
      },
      {
        status: {
          code: "0",
          message: "NOT_SUCCESS",
        },
        response: {
          output: [
            {
              time: 3,
              classes: [
                {
                  score: 1,
                  class: "ai_generated",
                },
                {
                  score: 0,
                  class: "deepfake",
                },
              ],
            },
            {
              time: 4,
              classes: [
                {
                  score: 0,
                  class: "ai_generated",
                },
                {
                  score: 1,
                  class: "deepfake",
                },
              ],
            },
          ],
          input,
        },
      },
    ],
  }
  const aigenResponse = pickHighestScoringOutputs(response, ["ai_generated"])
  expect(aigenResponse).not.toEqual(response)
  expect(aigenResponse?.status.length).toBe(1)
  expect(aigenResponse?.status[0].response.output.length).toBe(1)
  expect(aigenResponse?.status[0].response.output[0].time).toBe(1)
  expect(aigenResponse?.status[0].response.output[0].classes?.length).toBe(3)

  const fakeResponse = pickHighestScoringOutputs(response, ["deepfake"])
  expect(fakeResponse).not.toEqual(response)
  expect(fakeResponse?.status.length).toBe(1)
  expect(fakeResponse?.status[0].response.output.length).toBe(1)
  expect(fakeResponse?.status[0].response.output[0].time).toBe(0)
  expect(fakeResponse?.status[0].response.output[0].classes?.length).toBe(3)

  const bothResponse = pruneToHighestScoringOutput(response)
  expect(bothResponse).not.toEqual(response)
  expect(bothResponse?.status.length).toBe(1)
  expect(bothResponse?.status[0].response.output.length).toBe(2)
  expect(bothResponse?.status[0].response.output[0].time).toBe(0)
  expect(bothResponse?.status[0].response.output[0].classes?.length).toBe(3)
  expect(bothResponse?.status[0].response.output[1].time).toBe(1)
  expect(bothResponse?.status[0].response.output[1].classes?.length).toBe(3)
})

it("pruneToHighestScoringOutput() should return a response with only one output", () => {
  const response: HiveApiResponse = {
    id: "d552ba10-a157-11ef-8bc5-5923d06fd4cc",
    project_id: 1108983312,
    from_cache: false,
    status: [
      {
        status: {
          code: "0",
          message: "SUCCESS",
        },
        response: {
          output: [
            {
              time: 0,
              classes: [
                {
                  score: 0.9754423574584636,
                  class: "not_ai_generated",
                },
                {
                  score: 0.024557642541536407,
                  class: "ai_generated",
                },
                {
                  score: 0.5,
                  class: "deepfake",
                },
              ],
            },
            {
              time: 1,
              classes: [
                {
                  score: 0.9255106639295844,
                  class: "not_ai_generated",
                },
                {
                  score: 0.07448933607041569,
                  class: "ai_generated",
                },
                {
                  score: 1,
                  class: "deepfake",
                },
              ],
            },
          ],
          input,
        },
      },
      {
        status: {
          code: "0",
          message: "NOT_SUCCESS",
        },
        response: {
          output: [
            {
              time: 3,
              classes: [
                {
                  score: 1,
                  class: "ai_generated",
                },
                {
                  score: 0,
                  class: "deepfake",
                },
              ],
            },
            {
              time: 4,
              classes: [
                {
                  score: 0,
                  class: "ai_generated",
                },
                {
                  score: 1,
                  class: "deepfake",
                },
              ],
            },
          ],
          input,
        },
      },
    ],
  }
  const bothResponse = pruneToHighestScoringOutput(response)
  expect(bothResponse).not.toEqual(response)
  expect(bothResponse?.status.length).toBe(1)
  expect(bothResponse?.status[0].response.output.length).toBe(1)
  expect(bothResponse?.status[0].response.output[0].time).toBe(1)
  expect(bothResponse?.status[0].response.output[0].classes?.length).toBe(3)
})

it("pruneToHighestScoringOutput() should retains old-style video results", () => {
  const response: HiveApiResponse = {
    id: "7f62e590-a12e-11ef-add4-4138787f49b8",
    project_id: 51743,
    from_cache: false,
    status: [
      {
        status: {
          code: "0",
          message: "SUCCESS",
        },
        response: {
          output: [
            {
              bounding_poly: [],
              time: 0,
            },
            {
              bounding_poly: [],
              time: 1,
            },
            {
              bounding_poly: [],
              time: 2,
            },
            {
              bounding_poly: [],
              time: 3,
            },
            {
              bounding_poly: [
                {
                  classes: [
                    {
                      score: 0.9999879596870184,
                      class: "no_deepfake",
                    },
                    {
                      score: 0.00001204031298160911,
                      class: "yes_deepfake",
                    },
                  ],
                  meta: {
                    type: "face",
                  },
                  vertices: [
                    {
                      x: 106.87127685546876,
                      y: 326.8610534667969,
                    },
                    {
                      x: 106.87127685546876,
                      y: 351.9346008300781,
                    },
                    {
                      x: 123.13443756103516,
                      y: 351.9346008300781,
                    },
                    {
                      x: 123.13443756103516,
                      y: 326.8610534667969,
                    },
                  ],
                  dimensions: {
                    bottom: 351.9346008300781,
                    left: 106.87127685546876,
                    right: 123.13443756103516,
                    top: 326.8610534667969,
                  },
                },
              ],
              time: 4,
            },
          ],
          input,
        },
      },
    ],
  }
  const preserveResponse = pruneToHighestScoringOutput(response)
  expect(preserveResponse).toEqual(response)
})
