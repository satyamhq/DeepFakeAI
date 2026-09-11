import { program } from "@commander-js/extra-typings"
import ngrok from "ngrok"
import express from "express"
import fs from "fs/promises"
import path from "path"

export async function createServer(
  options: { port: number; subdomain?: string } & (
    | { type: "filemap"; fileMap: Record<string, string> }
    | { type: "directory"; directory: string }
  ),
) {
  const url = await ngrok.connect({
    port: options.port,
    hostname: options.subdomain,
  })

  const getRootUrl = () => url
  const getFileUrl = (fileName: string) => `${url}/files/${fileName}`
  const getWebpageUrl = (fileName: string) => `${url}/post/${fileName}.html`

  const app = express()
  app.use((req, res, next) => {
    const start = Date.now()
    res.on("finish", () => {
      const duration = Date.now() - start
      console.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      )
    })
    next()
  })
  app.get("/", async (_req, res) => {
    let files: string[]
    if (options.type === "directory") {
      try {
        files = await fs.readdir(options.directory)
      } catch {
        res.status(500).send("Error reading directory")
        return
      }
    } else {
      files = Object.keys(options.fileMap)
    }
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>File List</title>
      </head>
      <body>
        <ul>
        ${files
          .slice(0, 100)
          .map(
            (file) => `<li><a href="${getWebpageUrl(file)}">${file}</a></li>`,
          )
          .join("")}
        </ul>
      </body>
      </html>
      `)
  })
  app.get("/files/:filename", async (req, res) => {
    const filename = req.params.filename
    const filePath =
      options.type === "directory"
        ? path.resolve(path.join(options.directory, filename))
        : options.fileMap[filename]
    try {
      await fs.access(filePath, fs.constants.F_OK)
    } catch {
      res.status(404).send("File not found")
      return
    }
    res.sendFile(filePath)
  })
  app.get("/post/:filename", async (req, res) => {
    const filename = req.params.filename.slice(0, -".html".length)
    const filePath =
      options.type === "directory"
        ? path.resolve(path.join(options.directory, filename))
        : options.fileMap[filename]
    try {
      await fs.access(filePath, fs.constants.F_OK)
    } catch {
      res.status(404).send("File not found")
      return
    }
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Video Player</title>
        </head>
        <body>
          <video width="600" controls>
            <source src="${getFileUrl(filename)}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </body>
        </html>
      `)
  })

  app.listen(options.port)

  return {
    app,
    getRootUrl,
    getFileUrl,
    getWebpageUrl,
  }
}

export default program
  .command("serve-directory <directory>")
  .description(
    "Serve a directory of files on a fake website (for testing media resolution)",
  )
  .option("-p, --port <port>", "Port to run the server on", parseInt, 3006)
  .option("-s, --subdomain <subdomain>", "Subdomain to use with ngrok")
  .action(async (directory, { port, subdomain }) => {
    const server = await createServer({
      type: "directory",
      port,
      directory,
      subdomain,
    })
    console.log("Serving directory at:", server.getRootUrl())
  })
