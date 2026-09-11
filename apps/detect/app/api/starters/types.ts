import { MediaTrack, MediaType } from "../../data/media"
import { AnalysisResponse } from "../../data/model"
import { QueuePriority } from "@truemedia/scheduler/schemas"
import type { ApiAuthInfo } from "../apiKey"

type CheckResponse<T> = { rsp: T; completed: Date }
export type Checker = (
  requestId: string,
  type: MediaType,
  id: string,
  apiAuthInfo: ApiAuthInfo,
) => Promise<CheckResponse<any> | undefined>

export type Starter = (
  media: MediaTrack,
  userId: string,
  priority: QueuePriority,
  apiAuthInfo: ApiAuthInfo,
) => Promise<AnalysisResponse<any>>
export type StarterId =
  | "aion-image"
  | "aion-audio"
  | "buffalo"
  | "dire"
  | "dftotal"
  | "faces"
  | "ftcn"
  | "genconvit"
  | "hive-video"
  | "hive-video-multi"
  | "hive-image"
  | "hive-image-multi"
  | "hive-audio"
  | "loccus-audio"
  | "rd-video"
  | "rd-image"
  | "rd-audio"
  | "sensity-video"
  | "sensity-image"
  | "sensity-voice"
  | "openai-text"
  | "openai-artwork"
  | "reverse-search"
  | "styleflow"
  | "transcript"
  | "ufd"
