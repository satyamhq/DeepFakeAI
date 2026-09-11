import { CachedResults } from "../../data/model"
import { Verdict } from "../../data/verdict"

type Explanation = {
  matchesVerdict: boolean
  description?: string
  sourceUrl?: string
}

function capitalizeFirstCharacter(str: string) {
  if (str.length === 0) return str

  const firstChar = str[0]
  const restOfString = str.slice(1)
  return firstChar.toUpperCase() + restOfString
}

/** GPT sometimes prefixes its explanations with verbiage that we don't want. This function "edits" GPT's rationales to
 * remove such words and phrases. We can even veto an explanation entirely by returning undefined.
 *
 * I opted to do this here rather than when we extract the rationale from the model's analysis
 * results JSON, because our desires here are likely to evolve frequently as we see new and interesting things coming
 * out of GPT's mouth. Changes here will instantly be reflected on results pages, whereas changes to JSON extraction
 * require a recompute-scores pass over all analysis results.
 */
function editRationale(rationale: string): string | undefined {
  let edited = rationale

  // Prefixes
  if (rationale.toLocaleLowerCase().startsWith("rationale:")) {
    edited = rationale.substring(10).trim()
  } else if (rationale.toLocaleLowerCase().startsWith("-") || rationale.toLocaleLowerCase().startsWith("–")) {
    edited = rationale.substring(1).trim()
  } else if (rationale.toLocaleLowerCase().startsWith("```")) {
    edited = rationale.substring(3).trim()
  }

  // Suffixes
  if (rationale.toLocaleLowerCase().endsWith("```")) {
    edited = rationale.substring(0, rationale.length - 3).trim()
  }

  return capitalizeFirstCharacter(edited)
}

/* Pick the best explanation that aligns with our verdict */
export function determineExplanation(cached: CachedResults, verdict: Verdict): Explanation {
  const rationaleReverse = cached["reverse-search"] // images
  const rationaleTranscript = cached["transcript"] // audio

  const rationale = rationaleReverse ?? rationaleTranscript
  if (!rationale) return { matchesVerdict: false, description: undefined, sourceUrl: undefined }

  // We compare the GPT 'rank' with the 'verdict', knowing that they'll only match when both are "low" or both are "high"
  // (which is when we want to show the rationale). If the verdict is "trusted" or "uncertain" we don't want
  // GPT to explain why we were "right".
  const matchesVerdict = rationale.rank === verdict && verdict !== "unknown"
  const description = rationale.rationale ? editRationale(rationale.rationale) : undefined
  const sourceUrl = rationale.sourceUrl
  return { matchesVerdict, description, sourceUrl }
}
