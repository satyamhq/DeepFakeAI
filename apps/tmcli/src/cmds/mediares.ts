import { program } from "@commander-js/extra-typings"
import { MediaResClient } from "@truemedia/clients/mediares"

export default program
  .command("mediares")
  .description("Do stuff with mediares!")
  .addCommand(
    program
      .command("resolve <url>")
      .description("Resolve media")
      .option("--prod", "whether or not to use prodution mediares")
      .action(async (url, { prod }) => {
        const baseUrl = prod
          ? "OPEN-TODO-PLACEHOLDER/mediares"
          : "http://localhost:8080/mediares"
        const response = await new MediaResClient(baseUrl).resolveMedia(url)
        console.log(JSON.stringify(response, null, 2))
      }),
  )
  .addCommand(
    program
      .command("finalize-upload <mediaId>")
      .description(
        "Finalize upload. Useful if for whatever reason it didn't get called.",
      )
      .option("--prod", "whether or not to use prodution mediares")
      .requiredOption("--mimeType <mimeType>", "The mime type of the file")
      .action(async (mediaId, { prod, mimeType }) => {
        const baseUrl = prod
          ? "OPEN-TODO-PLACEHOLDER/mediares"
          : "http://localhost:8080/mediares"
        const response = await new MediaResClient(baseUrl).finalizeFileUpload({
          mediaId,
          mimeType,
        })
        console.log(JSON.stringify(response, null, 2))
      }),
  )
  .addCommand(
    program
      .command("progress <mediaId>")
      .description("Get progress")
      .option("--prod", "whether or not to use prodution mediares")
      .action(async (mediaId, { prod }) => {
        const baseUrl = prod
          ? "OPEN-TODO-PLACEHOLDER/mediares"
          : "http://localhost:8080/mediares"
        const response = await new MediaResClient(baseUrl).fetchProgress([
          mediaId,
        ])
        console.log(JSON.stringify(response, null, 2))
      }),
  )
