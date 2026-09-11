import { SignJWT, JWTPayload, jwtVerify } from "jose"

// Refresh token every 45 minutes
const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 45

const schedulerClientTokenConfig = {
  issuer: "truemedia",
  subject: "nextjs-app",
  algorithms: ["HS256"],
  maxTokenAge: "1h",
  clockTolerance: "5s",
}

const webAppClientTokenConfig = {
  issuer: "nextjs-app",
  subject: "scheduler",
  algorithms: ["HS256"],
  maxTokenAge: "1h",
  clockTolerance: "5s",
}

async function verifyToken(
  token: string,
  secret: string,
  config: typeof schedulerClientTokenConfig,
): Promise<{ success: true; payload: JWTPayload } | { success: false; err: unknown }> {
  try {
    const res = await jwtVerify(token, new TextEncoder().encode(secret), config)
    return { success: true, payload: res.payload }
  } catch (err) {
    return { success: false, err }
  }
}

function makeTokenFactory(audience: string, config: typeof schedulerClientTokenConfig) {
  let token: string | null = null
  let lastTokenTime = 0
  return async (secret: string) => {
    if (token && Date.now() - lastTokenTime < TOKEN_REFRESH_INTERVAL) {
      return token
    }
    lastTokenTime = Date.now()
    token = await new SignJWT({})
      .setProtectedHeader({ alg: config.algorithms[0] })
      .setIssuedAt()
      .setIssuer(config.issuer)
      .setSubject(config.subject)
      .setAudience(audience)
      .setExpirationTime(config.maxTokenAge)
      .sign(new TextEncoder().encode(secret))
    return token
  }
}

export const verifySchedulerClientToken = (token: string, secret: string) =>
  verifyToken(token, secret, schedulerClientTokenConfig)

export const getSchedulerClientToken = makeTokenFactory("scheduler", schedulerClientTokenConfig)

export const verifyWebAppClientToken = (token: string, secret: string) =>
  verifyToken(token, secret, webAppClientTokenConfig)

export const getWebAppClientToken = makeTokenFactory("nextjs-app", webAppClientTokenConfig)
