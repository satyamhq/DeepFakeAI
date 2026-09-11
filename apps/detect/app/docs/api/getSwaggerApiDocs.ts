import swaggerJsdoc from "swagger-jsdoc"
import swaggerJson from "./swagger.yaml"
import { currentSiteBaseUrl } from "../../site"

export const getSwaggerApiDocs = () => {
  const options = {
    apis: [], // We could attach docs to the APIs in future, if we wanted
    definition: swaggerJson,
    servers: [
      {
        url: currentSiteBaseUrl,
        description: "TrueMedia.org API server",
      },
    ],
  }
  return swaggerJsdoc(options)
}
