import { startAnalysis as aionStart } from "./aion"
import { startAnalysis as hiveStart } from "./hive"
import { startAnalysis as loccusStart } from "./loccus"
import { startAnalysis as dftotalStart } from "./dftotal"
import { startAnalysis as realityStart } from "./reality"
import { startAnalysis as sensityStart, checkAnalysis as sensityCheck } from "./sensity"
import { startAnalysis as trueStart } from "./truemedia"
import { startTextAnalysis, startArtworkAnalysis, startTranscriptAnalysis } from "./openai"
import type { Starter, StarterId, Checker } from "./types"

export const starters: Record<StarterId, Starter> = {
  "aion-image": aionStart,
  "aion-audio": aionStart,
  buffalo: trueStart.bind(null, "buffalo"),
  dire: trueStart.bind(null, "dire"),
  dftotal: dftotalStart,
  faces: trueStart.bind(null, "faces"),
  ftcn: trueStart.bind(null, "ftcn"),
  genconvit: trueStart.bind(null, "genconvit"),
  "hive-video": hiveStart.bind(null, "hive-video"),
  "hive-video-multi": hiveStart.bind(null, "hive-video-multi"),
  "hive-image": hiveStart.bind(null, "hive-image"),
  "hive-image-multi": hiveStart.bind(null, "hive-image-multi"),
  "hive-audio": hiveStart.bind(null, "hive-audio"),
  "loccus-audio": loccusStart,
  "rd-video": realityStart,
  "rd-image": realityStart,
  "rd-audio": realityStart,
  "sensity-video": sensityStart,
  "sensity-image": sensityStart,
  "sensity-voice": sensityStart,
  "openai-text": startTextAnalysis,
  "openai-artwork": startArtworkAnalysis,
  "reverse-search": trueStart.bind(null, "reverse-search"),
  styleflow: trueStart.bind(null, "styleflow"),
  transcript: startTranscriptAnalysis,
  ufd: trueStart.bind(null, "ufd"),
}

export function isStarterId(id: string): id is StarterId {
  return id in starters
}

export const checkers: Record<string, Checker> = {
  "sensity-video": sensityCheck,
  "sensity-image": sensityCheck,
  // because checkers don't know whether we're checking the audio track, we have to force the media type
  "sensity-voice": (req, _, id) => sensityCheck(req, "audio", id),
}
