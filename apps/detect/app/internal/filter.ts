import { Media, MediaMetadata } from "@prisma/client"
import { mediaType } from "../data/media"
import { CachedResults } from "../data/model"
import { resolveResults } from "../data/verdict"
import { determineRelevance } from "../data/relevance"
import { MediaSummary } from "./summarize"

export abstract class Filter {
  // default to filtering for content uploaded/viewed by external users, minus media deemed experimental
  static makeDefault(): Filter {
    return Filter.make("external-user -experimental")
  }
  static make(query: string): Filter {
    return !query ? empty : new KeywordFilter(query)
  }

  static makeFilterTerms(
    keywords: string,
    language: string,
    source: string,
    external: boolean,
    experimental: boolean,
  ): string[] {
    const terms = keywords.toLowerCase().split(" ")
    if (language) terms.push(...language.split(" "))
    if (source) terms.push(...source.split(" "))
    // a pseudo-keyword which matches media analyzed or viewed by non-TrueMedia.org users
    if (external) terms.push("external-user")
    // a pseudo-keyword which matches media identified as "experimental"
    if (experimental) terms.push("experimental")
    return terms
  }

  abstract matches(terms: string[]): boolean
  abstract explain(): string

  /** Checks whether this filter matches the supplied summarized media. */
  matchesSummary(media: MediaSummary): boolean {
    return this.matches(media.filterTerms)
  }

  /** Checks whether this filter matches the supplied media record. The cached scores in the media record will be used
   * to determine whether or not the media is experimental. */
  matchesMedia(media: Media & { meta: MediaMetadata | null }): boolean {
    if (!media.meta) return false
    const type = mediaType(media.mimeType)
    const mresults = resolveResults(type, media.results as CachedResults)
    const experimental = determineRelevance(type, mresults, []).experimentalReasons.length > 0
    // Note: we do not include source and language in addition to keywords, like we do for media summaries. Media
    // summary filtering is used on the Eval and Eval over Time UI, where a "looser" notion of filtering is desirable.
    // Here we're computing which media will be included in a model rerun, so we just match actual keywords in order to
    // be precise about which media are reprocessed. We could potentially include "language", to allow reprocessing of
    // media in specific languages, but "source" is a very "put whatever you feel like in here" metadata field, which
    // would undermine our ability to reprocess just media that matches specific keywords.
    return this.matches(Filter.makeFilterTerms(media.meta.keywords, "", "", media.external, experimental))
  }
}

class EmptyFilter extends Filter {
  matches(): boolean {
    return true
  }
  explain(): string {
    return "<none>"
  }
}

const empty = new EmptyFilter()

class KeywordFilter extends Filter {
  required: string[] = []
  optional: string[] = []
  exclude: string[] = []

  constructor(keywords: string = "") {
    super()
    for (let word of keywords.split(" ")) {
      word = word.trim()
      if (!word) continue
      if (word.startsWith("?")) this.optional.push(word.substring(1))
      else if (word.startsWith("-")) this.exclude.push(word.substring(1))
      else this.required.push(word)
    }
  }

  matches(terms: string[]): boolean {
    return (
      this.required.every((kk) => terms.includes(kk)) &&
      !this.exclude.find((kk) => terms.includes(kk)) &&
      (this.optional.length == 0 || !!this.optional.find((kk) => terms.includes(kk)))
    )
  }

  explain(): string {
    const terms = []
    terms.push(...this.required)
    terms.push(...this.optional.map((kw) => `?${kw}`))
    terms.push(...this.exclude.map((kw) => `-${kw}`))
    return terms.join(" ")
  }
}
