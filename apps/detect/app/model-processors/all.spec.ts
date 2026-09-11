import { StarterId } from "../api/starters/types"
import {
  processors,
  manipulationModels,
  externalManipulationModelIds,
  modelsFor,
  manipulationModelInfo,
  internalIdForExternalId,
  processorsForModels,
} from "./all"

it("validate processor ids", () => {
  for (const [key, proc] of Object.entries(processors)) {
    // a processor's id must match its key in the `processors` table
    expect(proc.id).toBe(key)
  }
})

it("check external ids", () => {
  const seenIds = new Map<string, string>()
  for (const modelId of Object.keys(manipulationModels)) {
    const externalId = externalManipulationModelIds[modelId]
    if (!externalId) throw new Error(`Model missing external id: ${modelId}`)
    if (seenIds.has(externalId)) {
      throw new Error(
        `Model external id conflict: ${seenIds.get(externalId)} and ` +
          `${modelId} both use external id: ${externalId}`,
      )
    }
    seenIds.set(externalId, modelId)
  }
})

it("internalIdForExternalId exists", () => {
  const anonId = "video9"
  const internalId = internalIdForExternalId(anonId)
  expect(internalId).toBe("genconvit")
})

it("internalIdForExternalId doesn't exist", () => {
  const anonId = "videoB"
  const internalId = internalIdForExternalId(anonId)
  expect(internalId).toBe(null)
})

it("processorsForModels finds multiple procs", () => {
  const modelIds = ["genconvit", "hive-video-facemap-v2"] as StarterId[]
  const processorIds = processorsForModels(modelIds)
  expect(processorIds).toStrictEqual(["genconvit", "hive-video-multi"])
})

it("processorsForModels handles multiple models from same processor", () => {
  const modelIds = ["genconvit", "hive-video-facemap-v2", "hive-video-genai-v2"] as StarterId[]
  const processorIds = processorsForModels(modelIds)
  expect(processorIds).toStrictEqual(["genconvit", "hive-video-multi"])
})

describe("validate archived processors", () => {
  for (const [procId, proc] of Object.entries(processors)) {
    for (const modelId of modelsFor(procId)) {
      const model = manipulationModelInfo(modelId)
      if (!model) continue
      it(`If processor ${procId} is archived or disabled, model ${modelId} is ignored`, () => {
        expect(
          proc.availability === "enabled" ||
            procId === "rd-audio" || // exception for rd-audio since they're broken but we still want to include the old results
            (model.policy === "ignore" && (!model.trackPolicy || model.trackPolicy === "ignore")),
        ).toBe(true)
      })
    }
  }
})
