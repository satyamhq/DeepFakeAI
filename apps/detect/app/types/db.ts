/**
 * DeepFakeAI Database Types and Enums
 * Pure TypeScript definitions replacing @prisma/client
 */

// 1. Enums
export enum RequestState {
  ERROR = "ERROR",
  UPLOADING = "UPLOADING",
  PROCESSING = "PROCESSING",
  COMPLETE = "COMPLETE",
}

export type Trulean = "UNREVIEWED" | "UNKNOWN" | "FALSE" | "TRUE"
export const Trulean = {
  UNREVIEWED: "UNREVIEWED" as const,
  UNKNOWN: "UNKNOWN" as const,
  FALSE: "FALSE" as const,
  TRUE: "TRUE" as const,
} as const

export type YesNoReview = "YES" | "NO" | "UNREVIEWED"
export const YesNoReview = {
  YES: "YES" as const,
  NO: "NO" as const,
  UNREVIEWED: "UNREVIEWED" as const,
} as const

export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  UNKNOWN = "UNKNOWN",
}

export enum MediaPublisher {
  UNKNOWN = "UNKNOWN",
  OTHER = "OTHER",
  X = "X",
  TIKTOK = "TIKTOK",
  MASTODON = "MASTODON",
  YOUTUBE = "YOUTUBE",
  REDDIT = "REDDIT",
  GOOGLE_DRIVE = "GOOGLE_DRIVE",
  INSTAGRAM = "INSTAGRAM",
  FACEBOOK = "FACEBOOK",
  LINKEDIN = "LINKEDIN",
  TRUTH_SOCIAL = "TRUTH_SOCIAL",
}

export enum UserType {
  ANONYMOUS = "ANONYMOUS",
  REGISTERED = "REGISTERED",
  API = "API",
}

export enum Notability {
  NOTABLE = "NOTABLE",
  CANDIDATE = "CANDIDATE",
  WAS_NOTABLE = "WAS_NOTABLE",
  PLAIN = "PLAIN",
}

export enum QueueMessageStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
  CANCELED = "CANCELED",
}

export enum ReplyType {
  PROCESSING = "PROCESSING",
  FINAL = "FINAL",
}

// 2. Model Interfaces
export interface User {
  id: string
  createdAt: Date
  updatedAt: Date
  email?: string | null
  fullName?: string | null
  role?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string | null
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: Date
}

export interface Query {
  id: string
  postUrl: string
  time: Date
  orgId?: string | null
  apiKeyId?: string | null
  userId: string
  ipAddr: string
  isDeleted: boolean
  user?: User
  apiKey?: ApiKey | null
}

export interface PostMetadata {
  postUrl: string
  json: string
}

export interface PostMedia {
  postUrl: string
  mediaId: string
  media?: Media
}

export interface Media {
  id: string
  mediaUrl: string
  mimeType: string
  duration: number
  size: number
  resolvedAt: Date
  audioId?: string | null
  audioMimeType?: string | null
  external: boolean
  results: Record<string, any> | string
  analysisTime: number
  source: MediaPublisher
  sourceUserId?: string | null
  sourceUserName?: string | null
  verifiedSource: boolean
  postedToX: boolean
  trimmed: boolean
  schedulerMessageId?: string | null
  apiKeyId?: string | null
  posts?: PostMedia[]
  meta?: MediaMetadata | null
  analysisResults?: AnalysisResult[]
  notability?: NotableMedia | null
  quizMedia?: QuizMedia | null
  feedback?: UserFeedback[]
}

export interface MediaThrottle {
  mediaId: string
  userType: UserType
  media?: Media
}

export interface MediaMetadata {
  mediaId: string
  fake: Trulean
  audioFake: Trulean
  relabelFake: Trulean
  relabelAudioFake: Trulean
  language: string
  handle: string
  source: string
  keywords: string
  comments: string
  speakers: string
  misleading: boolean
  noPhotorealisticFaces: boolean
  fakeReviewer: string
  audioFakeReviewer: string
  relabelFakeReviewer: string
  relabelAudioFakeReviewer: string
  videoObjectOverlay: YesNoReview
  videoTextOverlay: YesNoReview
  videoEffects: YesNoReview
  media?: Media
}

export interface UserFeedback {
  userId: string
  mediaId: string
  fake: Trulean
  comments: string
  media?: Media
  user?: User
}

export interface AnalysisResult {
  mediaId: string
  source: string
  json: string
  userId?: string | null
  created: Date
  completed?: Date | null
  requestId?: string | null
  requestState?: RequestState | null
  apiKeyId?: string | null
  media?: Media
}

export interface NotableMedia {
  id?: string
  mediaId: string
  notability: Notability
  order: number
  summary: string
  creator: string
  created: Date
  title: string
  description?: string | null
  appearedIn?: string | null
  mediaType?: string | null
  imagePreviewUrl?: string | null
  previewUrl?: string | null
  reviewChannelMessageId?: string | null
  media?: Media
}

export interface QuizMedia {
  mediaId: string
  question: string
  answer: boolean
  explanation: string
  media?: Media
}

export interface VerifiedSource {
  id: string
  platform: MediaPublisher
  displayName?: string | null
  platformId: string
  added: Date
}

export interface GroundTruthUpdate {
  id: string
  mediaId: string
  oldSummary: string
  newSummary: string
  pollCount: number
  createdAt: Date
  media?: Media
}

export interface Dataset {
  id: string
  name: string
  source: string
  keywords: string
}

export interface DatasetGroup {
  id: string
  name: string
  setIds: string[]
  fromDate?: Date | null
  toDate?: Date | null
}

export interface PersistentScratch {
  id: string
  key: string
  val: string
}

export interface ApiKey {
  id: string
  key: string
  createdAt: Date
  updatedAt: Date
  enabled: boolean
  userId?: string | null
  orgId?: string | null
  createdById?: string | null
  user?: User | null
  createdBy?: User | null
}

export interface BatchUpload {
  id: string
  userId: string
  orgId?: string | null
  apiKeyId?: string | null
  createdAt: Date
  updatedAt: Date
  items?: BatchUploadItem[]
  _count?: {
    items: number
  }
}

export interface BatchUploadItem {
  id: string
  batchUploadId: string
  postUrl: string
  queryId?: string | null
  mediaId?: string | null
  createdAt: Date
  updatedAt: Date
  resolveUrlJobId?: string | null
  startAnalysisJobId?: string | null
  debugInfo?: any
  query?: Query | null
  batchUpload?: BatchUpload
  media?: Media | null
}

export interface QueueMessage {
  id: string
  apikeyId?: string | null
  queueName: string
  message: any
  priority: number
  createdAt: Date
  updatedAt: Date
  leaseId?: string | null
  leaseExpiration?: Date | null
  leaseTimes?: Date[]
  attempts: number
  status: QueueMessageStatus
}

export interface RateLimit {
  id: string
  userId: string
  count: number
  windowStart: Date
}

export interface Rerun {
  id: string
  mediaId: string
  models: string[]
  source?: string
  started?: Date | null
  complete?: boolean | number
  matched?: boolean
  createdAt: Date
  completedAt?: Date | null
  completed?: Date | null
  status: string
  // Query filter fields
  keywords?: string
  fromDate?: Date | null
  toDate?: Date | null
  includeUnknown?: boolean
  onlyErrors?: boolean
  leewayDays?: number
}

// 3. Prisma Namespace compatibility helpers
export class PrismaClientKnownRequestError extends Error {
  code: string
  constructor(message: string, { code }: { code: string }) {
    super(message)
    this.code = code
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Prisma {
  export const sql = (strings: any, ...values: any[]) => ({ strings, values })
  export type JsonObject = { [Key in string]?: any }
  export type JsonValue = string | number | boolean | JsonObject | any[] | null
  export type NullableJsonNullValueInput = null
  export type TransactionClient = any
  export type BatchPayload = { count: number }
  export type MediaWhereInput = any
  export type MediaCreateInput = any
  export type MediaUpdateInput = any
  export type AnalysisResultCreateInput = any
  export type AnalysisResultUpdateInput = any
  export type QueryCreateInput = any
  export type NotableMediaCreateInput = any
  export type UserFeedbackGetPayload<_T = any> = any
  export type QueryGetPayload<_T = any> = any
  export type PostMediaGetPayload<_T = any> = any
  export type MediaGetPayload<_T = any> = any
  export type AnalysisResultGetPayload<_T = any> = any
  export class PrismaClientKnownRequestError extends Error {
    code: string
    constructor(message: string, { code }: { code: string }) {
      super(message)
      this.code = code
    }
  }
}

