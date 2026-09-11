import { program } from "@commander-js/extra-typings"
import fs from "fs"
import readline from "readline"
import ora from "ora"
import chalk from "chalk"
import { DetectClient } from "@truemedia/clients/detect"
import { exec } from "child_process"
import util from "util"
import { Listr, ListrTaskWrapper } from "listr2"
import { createServer } from "./serve-directory"
import { z } from "zod"

export default program
  .command("detect")
  .description("Use the detect app")
  .addCommand(
    program
      .command("analyze <filePath>")
      .description("Upload and analyze a file")
      .option("--prod", "Whether to use the production scheduler")
      .option("--apiKey, --api-key <apiKey>", "API key")
      .option("--keywords <keywords>", "Keywords to label the media with")
      .addHelpText(
        "after",
        `
Optional Environment Variables:
  - TM_DETECT_API_KEY: Use this to set the API key instead of --apiKey
`,
      )
      .action(async (filePath, { prod, apiKey, keywords }) => {
        apiKey = apiKey ?? process.env.TM_DETECT_API_KEY
        if (!apiKey) {
          console.error(
            "API key is required. Use --apiKey or the TM_DETECT_API_KEY environment variable",
          )
          return
        }
        await bulkUpload([{ index: 0, filePath }], {
          prod,
          apiKey,
          keywords,
          parallelism: 1,
          outFile: "out.json",
        })
      }),
  )
  .addCommand(
    program
      .command("bulk-analyze <files>")
      .description("Upload and analyze a lot of files")
      .option(
        "--prod",
        "Whether to use production or localhost. Defaults to localhost.",
      )
      .option(
        "--apiKey, --api-key <apiKey>",
        "API key to use when submitting media",
      )
      .option(
        "--internalApiKey <internalApiKey>",
        "Internal API key (needed when specifying keywords)",
      )
      .option("--keywords <keywords>", "Keywords to label the media with")
      .option("--outFile <outFile>", "Output file for state", "out.json")
      .option(
        "--useServer <serverType>",
        `Use ngrok and a server instead of uploading directly (better for big files).

        serverType values:
          * "webpage": serve url to a webpage with a <video> tag (will trigger yt-dlp in mediares)
          * "file": serve a url to a file
        `,
        (value) => z.enum(["webpage", "file"]).parse(value),
      )
      .option(
        "--ngrokSubdomain <ngrokSubdomain>",
        "Optional ngrok subdomain. Will use a randomly generated one otherwise.",
      )
      .option(
        "--limit <limit>",
        "Limit the number of files to analyze. Good for testing.",
        (value) => (value != null ? parseInt(value) : undefined),
      )
      .option(
        "--offset <offset>",
        "Offset the number of files to analyze. Where in the list of files to start from",
        (value) => (value != null ? parseInt(value) : 0),
        0,
      )
      .option(
        "--skipResolve",
        "Skip resolving media. Useful if you have already resolved the media",
      )
      .option(
        "--range <range>",
        "Range (inclusive) of files to analyze. i.e. --range=5..7 will submit files at index 5,6, and 7",
        (range) => {
          const match = range.match(/^(\d+)\.\.(\d+)$/)
          if (!match) {
            throw new Error("Invalid range. Use format <start>..<end>")
          }
          return [parseInt(match[1]), parseInt(match[2])] as const
        },
      )
      .option(
        "--parallelism <parallelism>",
        "Number of files to submit in parallel",
        (value) => (value != null ? parseInt(value) : 1),
        1,
      )
      .addHelpText(
        "after",
        `
Format of <files>:
  This is a path to a file containing a list of files to analyze. Each line should be either
  a url to a media item/webpage, or a path to a local file. If the file is a local file, it
  will be uploaded to the server.

Optional Environment Variables:
  - TM_DETECT_API_KEY: Use this to set the API key instead of --apiKey
`,
      )
      .action(
        async (files, { prod, apiKey, limit, offset, range, ...options }) => {
          apiKey = apiKey ?? process.env.TM_DETECT_API_KEY
          if (!apiKey) {
            console.error(
              "API key is required. Use --apiKey or the TM_DETECT_API_KEY environment variable",
            )
            return
          }

          if (options.keywords && !options.internalApiKey) {
            console.error(
              "Internal API key is required when specifying keywords. Use --internalApiKey",
            )
            return
          }

          if (!fs.existsSync(files)) {
            console.error("File not found:", files)
            return
          }
          if (fs.statSync(files).isDirectory()) {
            console.error("Directory not supported yet")
            return
          }

          if (range != null) {
            if (limit != null || offset != 0) {
              console.error("Cannot use --range with --limit or --offset")
              return
            }
            offset = range[0]
            limit = range[1] - range[0] + 1
          }
          // stream the contents of file to the the first 10 files
          const filePaths = (
            await readFirstLines(files, offset + (limit ?? Infinity))
          )
            .map((filePath, index) => ({ filePath, index }))
            .slice(offset)
          console.log(`Analyzing ${filePaths.length} files`)
          await bulkUpload(filePaths, {
            prod,
            apiKey,
            ...options,
          })
        },
      ),
  )

async function readFirstLines(
  filePath: string,
  numberOfLines: number,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = []
    const readStream = fs.createReadStream(filePath, { encoding: "utf8" })
    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity,
    })

    rl.on("line", (line) => {
      lines.push(line)
      if (lines.length >= numberOfLines) {
        rl.close() // Stop reading after getting the required lines
      }
    })

    rl.on("close", () => {
      resolve(lines.slice(0, numberOfLines))
    })

    rl.on("error", (error) => {
      reject(error)
    })
  })
}
async function resolveMedia(
  filePath: string,
  client: DetectClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: ListrTaskWrapper<unknown, any, any>,
): Promise<
  {
    resolveMediaResp?: Awaited<ReturnType<DetectClient["resolveMedia"]>>
    uploadMediaResp?: Awaited<ReturnType<DetectClient["uploadMedia"]>>
  } & { result: "success"; mediaId: string }
> {
  if (filePath.startsWith("s3://")) {
    // generate a signed url for this s3 file using the command line
    // aws s3 presign <filePath>
    task.output = "Generating signed url..."
    const execPromise = util.promisify(exec)

    try {
      const { stdout } = await execPromise(
        `aws s3 presign ${filePath} --region=us-west-2`,
      )
      filePath = stdout.trim()
      task.output = `Generated signed URL: ${filePath}`
    } catch (error) {
      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  let mediaId: string
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    task.output = "Resolving media..."
    const resolveMediaStartTime = Date.now()
    const resolveMediaResp = await client.resolveMedia(filePath)
    if (resolveMediaResp.result === "failure") {
      throw new Error(`Failed to resolve media: ${resolveMediaResp.reason}`)
    }
    if (resolveMediaResp.media.length == 0) {
      throw new Error(`No media found`)
    }
    mediaId = resolveMediaResp.media[0].id
    task.output = `Resolved media in ${(Date.now() - resolveMediaStartTime) / 1000}s: /media/analysis?id=${mediaId}`
    return { result: "success", mediaId, resolveMediaResp }
  }
  task.output = "Uploading media..."
  const uploadMediaStartTime = Date.now()

  const stat = await fs.promises.stat(filePath)
  // if the file size is more than 4.5 MB, then fail the upload
  if (stat.size > 4.5 * 1000 * 1000) {
    throw new Error("File size is too large. Max size is 4.5 MB: " + filePath)
  }

  let uploadMediaResp: Awaited<ReturnType<DetectClient["uploadMedia"]>>
  try {
    uploadMediaResp = await client.uploadMedia(filePath)
  } catch (error) {
    throw new Error(
      `Failed to upload media for ${filePath} (size=${stat.size}) ${error}`,
    )
  }
  if (uploadMediaResp == null) {
    task.output = "Failed to upload media"
    throw new Error("Failed to upload media")
  }
  mediaId = uploadMediaResp.media.id
  task.output = `Uploaded media in ${(Date.now() - uploadMediaStartTime) / 1000}s: /media/analysis?id=${mediaId}`

  return { result: "success", mediaId, uploadMediaResp }
}

type FileState = {
  index: number
  keywords?: string
  filePath: string
  mediaId?: string
  resolveResult?: Awaited<ReturnType<typeof resolveMedia>>
  resolveLatencyMs?: number
  updateMediaMetadataResp?: Awaited<
    ReturnType<DetectClient["updateMediaMetadata"]>
  >
  updateMediaMetadataLatencyMs?: number
  startAnalysisResp?: Awaited<ReturnType<DetectClient["startAnalysis"]>>
  startAnalysisLatencyMs?: number
  checkAnalysisResp?: Awaited<ReturnType<DetectClient["checkAnalysis"]>>
}

async function bulkUpload(
  filePaths: { filePath: string; index: number }[],
  {
    prod,
    apiKey,
    keywords,
    outFile,
    parallelism,
    useServer,
    ngrokSubdomain,
    skipResolve,
    internalApiKey,
  }: {
    prod?: boolean | undefined
    apiKey: string
    keywords?: string | undefined
    parallelism: number
    outFile: string
    useServer?: "webpage" | "file" | undefined
    ngrokSubdomain?: string
    skipResolve?: boolean
    internalApiKey?: string
  },
) {
  const startTime = Date.now()
  const baseUrl = prod ? "OPEN-TODO-PLACEHOLDER" : "http://localhost:3000"
  const client = new DetectClient(baseUrl, apiKey)

  const filePathState = new Map<string, FileState>()
  if (fs.existsSync(outFile)) {
    console.log("Loading state from", outFile)
    const data = JSON.parse(fs.readFileSync(outFile, "utf-8")) as [
      string,
      FileState,
    ][]
    for (const [filePath, state] of data) {
      filePathState.set(filePath, state)
    }
  }

  const saveState = () => {
    fs.writeFileSync(
      outFile,
      JSON.stringify(Array.from(filePathState.entries()), null, 2),
    )
  }

  const server = useServer
    ? await createServer({
        port: 3006,
        subdomain: ngrokSubdomain,
        type: "filemap",
        fileMap: Object.fromEntries(
          filePaths.map((file) => [
            file.filePath.split("/").pop(),
            file.filePath,
          ]),
        ),
      })
    : null
  if (server) {
    console.log("Server listening on", server.getRootUrl())
  }

  const setupStartTime = Date.now()

  const getLatencyStats = (states: FileState[]) => {
    const isNonNull = <T>(x: T | null | undefined): x is T => x != null
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

    return {
      resolveMeanMs: Math.round(
        mean(states.map((s) => s.resolveLatencyMs).filter(isNonNull)),
      ),
      updateMetadataMeanMs: Math.round(
        mean(
          states.map((s) => s.updateMediaMetadataLatencyMs).filter(isNonNull),
        ),
      ),
      startAnalysisMeanMs: Math.round(
        mean(states.map((s) => s.startAnalysisLatencyMs).filter(isNonNull)),
      ),
      analysisTimeMeanS: Math.round(
        mean(
          states
            .map((s) =>
              s.checkAnalysisResp?.state === "COMPLETE"
                ? s.checkAnalysisResp.analysisTime
                : null,
            )
            .filter(isNonNull),
        ),
      ),
    }
  }

  const logState = () => {
    const states = filePaths
      .map((file) => filePathState.get(file.filePath))
      .filter((x): x is FileState => x != null)
    for (const state of states) {
      console.log(
        `[file #${state.index}]`,
        state.checkAnalysisResp?.state,
        `${baseUrl}/media/analysis?id=${state.mediaId}`,
      )
    }
    const latencyStats = getLatencyStats(states)
    console.log(
      [
        `    Resolve latency=${chalk.red(latencyStats.resolveMeanMs)}ms (${Math.round((1000 * 60 * 60) / latencyStats.resolveMeanMs)}/hr)`,
        `    Update Metadata latency=${chalk.red(latencyStats.updateMetadataMeanMs)}ms`,
        `    Start Analysis latency=${chalk.red(latencyStats.startAnalysisMeanMs)}ms`,
        `    Analysis Time=${chalk.red(latencyStats.analysisTimeMeanS)}s`,
      ].join("\n"),
    )
  }

  const setupFile = (state: FileState) => {
    return new Listr(
      [
        {
          title: "Resolving media",
          enabled: () => !state.mediaId && !skipResolve,
          task: async (_ctx, task) => {
            const filename = state.filePath.split("/").pop()!
            let pathToResolve = state.filePath
            if (useServer == "webpage") {
              pathToResolve = server!.getWebpageUrl(filename)
            } else if (useServer == "file") {
              pathToResolve = server!.getFileUrl(filename)
            }
            const startTime = Date.now()
            state.resolveResult = await resolveMedia(
              pathToResolve,
              client,
              task,
            )
            state.resolveLatencyMs = Date.now() - startTime
            state.mediaId = state.resolveResult.mediaId
          },
        },
        {
          title: "Adding keywords",
          enabled: () => Boolean(keywords && state.keywords !== keywords),
          task: async () => {
            if (!state.mediaId) throw new Error("No mediaId")
            if (!internalApiKey) throw new Error("No internalApiKey")
            const startTime = Date.now()
            const internalClient = new DetectClient(baseUrl, internalApiKey)
            state.updateMediaMetadataResp =
              await internalClient.updateMediaMetadata(state.mediaId, {
                keywords,
              })
            state.updateMediaMetadataLatencyMs = Date.now() - startTime
            state.keywords = keywords
          },
        },
        {
          title: "Starting analysis",
          enabled: () => !state.startAnalysisResp,
          task: async (_ctx, task) => {
            if (!state.mediaId) throw new Error("No mediaId")
            const startTime = Date.now()
            state.startAnalysisResp = await client.startAnalysis(state.mediaId)
            state.startAnalysisLatencyMs = Date.now() - startTime
            if (state.startAnalysisResp.state === "COMPLETE") {
              task.output = "Analysis already completed"
            } else {
              task.output = `Analysis started, pending: ${state.startAnalysisResp.pending}`
            }
          },
        },
      ],
      { concurrent: false, exitOnError: true },
    )
  }

  let allDone = false
  process.on("SIGINT", async () => {
    if (!allDone) {
      console.error("Quit before analysis complete.")
      logState()
    }
    saveState()
    process.exit(allDone ? 0 : 1)
  })

  try {
    for (
      let batchStartIndex = 0;
      batchStartIndex < filePaths.length;
      batchStartIndex += parallelism
    ) {
      const listr = new Listr<{ states: FileState[] }>(
        filePaths
          .slice(batchStartIndex, batchStartIndex + parallelism)
          .map((file, indexInSlice) => {
            const fileName = file.filePath.split("/").pop()
            const fileIndex = batchStartIndex + indexInSlice
            const state = (() => {
              const existingState = filePathState.get(file.filePath)
              if (existingState) {
                existingState.index = file.index
                return existingState
              }
              const state: FileState = { ...file }
              filePathState.set(file.filePath, state)
              return state
            })()

            return {
              title: `[file #${file.index} ${fileIndex + 1}/${filePaths.length}] Setting up ${fileName}`,
              task: (ctx) => {
                ctx.states.push(state)
                return setupFile(state)
              },
            }
          }),
        {
          concurrent: parallelism,
          exitOnError: false,
        },
      )
      const result = await listr.run({ states: [] })
      const latencyStats = getLatencyStats(result.states)
      console.log(
        [
          `    Resolve latency=${chalk.red(latencyStats.resolveMeanMs)}ms (${Math.round((1000 * 60 * 60) / latencyStats.resolveMeanMs)}/hr)`,
          `    Update Metadata latency=${chalk.red(latencyStats.updateMetadataMeanMs)}ms`,
          `    Start Analysis latency=${chalk.red(latencyStats.startAnalysisMeanMs)}ms`,
          `    Analysis Time=${chalk.red(latencyStats.analysisTimeMeanS)}s`,
        ].join("\n"),
      )
    }
  } finally {
    saveState()
  }
  console.log(
    `Setup time: ${Math.round((Date.now() - setupStartTime) / 1000)}s`,
  )

  const checkAnalysisStartTime = Date.now()
  for (let i = 0; i < 100; i++) {
    const statesToCheck = filePaths
      .map((file) => filePathState.get(file.filePath))
      .filter((state): state is FileState & { mediaId: string } => {
        if (state == null) return false
        const { checkAnalysisResp, mediaId } = state
        if (mediaId == null) return false
        switch (checkAnalysisResp?.state) {
          case "COMPLETE":
          case "ERROR":
            return false
        }
        return true
      })
    if (statesToCheck.length === 0) {
      break
    }
    try {
      for (const stateToCheck of statesToCheck) {
        const textParts = [
          `check ${i + 1}/100, ${Math.round((Date.now() - checkAnalysisStartTime) / 1000)}s elapsed`,
        ]
        if (stateToCheck.checkAnalysisResp != null) {
          const { state } = stateToCheck.checkAnalysisResp
          if (state === "COMPLETE" || state === "ERROR") {
            continue
          }
        }
        if (stateToCheck.checkAnalysisResp != null) {
          textParts.push(`[${stateToCheck.checkAnalysisResp.state}]`)
          if (stateToCheck.checkAnalysisResp.state === "PROCESSING") {
            textParts.push(`pending: ${stateToCheck.checkAnalysisResp.pending}`)
          }
        }
        console.log(
          `[${filePaths.length - statesToCheck.length}/${filePaths.length}] [file #${stateToCheck.index}]`,
          textParts.join(" "),
          chalk.blue.bgWhite(` Checking `),
          chalk.blueBright(
            baseUrl + `/media/analysis?id=${stateToCheck.mediaId}`,
          ),
        )
        stateToCheck.checkAnalysisResp = await client.checkAnalysis(
          stateToCheck.mediaId,
        )
        if (stateToCheck.checkAnalysisResp.state === "ERROR") {
          console.error(
            `Error checking analysis: ${JSON.stringify(stateToCheck.checkAnalysisResp, null, 2)}`,
          )
        } else if (stateToCheck.checkAnalysisResp.state === "COMPLETE") {
          console.log(
            `Analysis complete in ${stateToCheck.checkAnalysisResp.analysisTime}s`,
          )
        }
      }
    } finally {
      saveState()
    }
    const spinner = ora()
    spinner.start()
    const sleepSeconds = 30
    for (let i = 0; i < sleepSeconds; i++) {
      spinner.text = chalk.blue.bgWhite(` Waiting ${sleepSeconds - i}s `)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    spinner.stop()
  }
  allDone = true
  logState()

  console.log(
    `Total time taken: ${Math.round((Date.now() - startTime) / 1000)}s.`,
  )
  process.exit(0)
}
