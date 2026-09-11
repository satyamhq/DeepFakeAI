#!/usr/bin/env node --enable-source-maps
import "dotenv/config"
import { Command } from "@commander-js/extra-typings"
import scheduler from "./cmds/scheduler"
import detect from "./cmds/detect"
import serveDirectory from "./cmds/serve-directory"
import mediares from "./cmds/mediares"

new Command()
  .name("tmcli")
  .version("0.0.1")
  .description("CLI for working with TrueMedia services")
  .addCommand(scheduler)
  .addCommand(detect)
  .addCommand(serveDirectory)
  .addCommand(mediares)
  .parse(process.argv)
